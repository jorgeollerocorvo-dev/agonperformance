import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText, isWhatsAppConfigured, normalizePhone } from "@/lib/whatsapp";
import { respondToInbound } from "@/lib/whatsapp-ai";
import { pushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Meta verification handshake. One-time: Meta hits this with
 * ?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y and expects the
 * challenge echoed back when the verify_token matches.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = (process.env.WHATSAPP_VERIFY_TOKEN ?? "").trim();
  if (mode === "subscribe" && token && expected && token === expected) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

/**
 * Inbound message handler.
 *
 * Flow:
 *   1. Parse Meta's webhook JSON — we care about `messages[]` of type text
 *   2. De-dup on `wamid` (Meta can retry)
 *   3. Match the sender's phone against Athlete.phone — if hit, link the row
 *   4. Log the inbound
 *   5. Ask respondToInbound() for an AI reply (or escalation)
 *   6. Send the reply via Cloud API, log the outbound
 *   7. If requiresCoach, push-notify the coach via existing push system
 *
 * The whole chain is wrapped so a bad single-message error never 500s the
 * webhook (Meta would retry, duplicating). We always 200 OK.
 */
export async function POST(req: Request) {
  try {
    if (!isWhatsAppConfigured()) {
      return NextResponse.json({ ok: true, note: "whatsapp not configured" });
    }

    const body = (await req.json()) as WhatsAppWebhookPayload;
    const entries = body?.entry ?? [];

    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const messages = change.value?.messages ?? [];
        for (const msg of messages) {
          if (msg.type !== "text" || !msg.text?.body) continue;
          const fromPhone = normalizePhone(msg.from);
          if (!fromPhone) continue;

          // De-dup: skip if we've already logged this wamid.
          if (msg.id) {
            const existing = await prisma.whatsAppMessage.findUnique({ where: { wamid: msg.id } });
            if (existing) continue;
          }

          // Match athlete by phone — try multiple formats since users save it
          // with or without country code.
          const athlete = await findAthleteByPhone(fromPhone);

          // Log inbound.
          await prisma.whatsAppMessage.create({
            data: {
              phone: fromPhone,
              athleteId: athlete?.id ?? null,
              direction: "INBOUND",
              body: msg.text.body,
              aiGenerated: false,
              wamid: msg.id,
            },
          });

          // Build response.
          const result = await respondToInbound({ phone: fromPhone, body: msg.text.body, athleteId: athlete?.id ?? null });

          // Send + log outbound if we have one.
          if (result.reply) {
            const send = await sendWhatsAppText(fromPhone, result.reply);
            await prisma.whatsAppMessage.create({
              data: {
                phone: fromPhone,
                athleteId: athlete?.id ?? null,
                direction: "OUTBOUND",
                body: result.reply,
                aiGenerated: true,
                requiresCoach: result.requiresCoach,
                wamid: send.wamid,
              },
            });
          } else if (result.requiresCoach) {
            // No reply but still log the escalation flag.
            await prisma.whatsAppMessage.create({
              data: {
                phone: fromPhone,
                athleteId: athlete?.id ?? null,
                direction: "OUTBOUND",
                body: `[escalated — not sent] ${result.reason ?? ""}`.trim(),
                aiGenerated: true,
                requiresCoach: true,
              },
            });
          }

          // Push notify the coach for anything that needs a human.
          if (result.requiresCoach) {
            await notifyCoach({
              athleteName: athlete?.fullName ?? fromPhone,
              preview: msg.text.body,
              reason: result.reason,
            });
          }
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[whatsapp webhook] error:", (e as Error).message);
    // Always 200 so Meta doesn't retry — we've already logged the error.
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}

async function findAthleteByPhone(digits: string) {
  // Try exact match first; then try suffix match (handle country-code variants).
  const exact = await prisma.athlete.findFirst({
    where: { phone: digits },
    select: { id: true, fullName: true, coachProfile: { select: { userId: true } } },
  });
  if (exact) return exact;
  const last8 = digits.slice(-8);
  if (last8.length < 8) return null;
  const partial = await prisma.athlete.findFirst({
    where: { phone: { endsWith: last8 } },
    select: { id: true, fullName: true, coachProfile: { select: { userId: true } } },
  });
  return partial;
}

async function notifyCoach({ athleteName, preview, reason }: { athleteName: string; preview: string; reason?: string }) {
  try {
    // Find Jorge's user id by looking at the (single-tenant for now) first
    // coach — later this should scope to the athlete's own coach.
    const coach = await prisma.coachProfile.findFirst({ select: { userId: true } });
    if (!coach) return;
    await pushToUser(coach.userId, {
      title: `WhatsApp needs you · ${athleteName}`,
      body: `${preview.slice(0, 120)}${reason ? ` · (${reason})` : ""}`,
      url: `/en/coach/whatsapp`,
    });
  } catch {
    /* non-fatal */
  }
}

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{ from?: string; id?: string; type?: string; text?: { body?: string } }>;
      };
    }>;
  }>;
};
