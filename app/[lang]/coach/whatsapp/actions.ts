"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendWhatsAppText, normalizePhone } from "@/lib/whatsapp";

/**
 * Coach manually sends a WhatsApp reply to a client — bypasses the AI. Only
 * usable within an existing conversation window (24h since the client's last
 * inbound), per Meta's free-tier "service conversation" rules.
 */
export async function coachReply(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("not a coach");

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const body = String(formData.get("body") ?? "").trim();
  if (!phone || !body) throw new Error("missing fields");

  const result = await sendWhatsAppText(phone, body);

  // Match athlete (same logic as webhook, kept local to avoid cross-import).
  const athlete = await prisma.athlete.findFirst({
    where: { OR: [{ phone }, { phone: { endsWith: phone.slice(-8) } }] },
    select: { id: true },
  });

  await prisma.whatsAppMessage.create({
    data: {
      phone,
      athleteId: athlete?.id ?? null,
      direction: "OUTBOUND",
      body: result.error ? `[send failed: ${result.error}] ${body}` : body,
      aiGenerated: false,
      requiresCoach: false,
      wamid: result.wamid,
    },
  });

  revalidatePath("/[lang]/coach/whatsapp", "page");
}

/** Mark an escalated thread as handled — drops the requiresCoach flag so it
 * clears from the "needs attention" view. */
export async function markHandled(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return;
  await prisma.whatsAppMessage.updateMany({
    where: { phone, requiresCoach: true },
    data: { requiresCoach: false },
  });
  revalidatePath("/[lang]/coach/whatsapp", "page");
}
