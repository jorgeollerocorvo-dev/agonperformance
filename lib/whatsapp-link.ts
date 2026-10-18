import { prisma } from "@/lib/prisma";

/**
 * Build a wa.me deep-link to a coach's WhatsApp. Priority:
 *   1. WHATSAPP_COACH_PHONE env var (the business WhatsApp number if set)
 *   2. The coach's own User.phone (as stored in the profile)
 *   3. null — caller falls back to a 'coach hasn't published a number' CTA
 *
 * Prefilled text is optional and defaults to a greeting that identifies the
 * client, so the coach sees who's reaching out in the first message.
 */
export function waLink({ phone, prefill }: { phone: string | null | undefined; prefill?: string }): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.length < 7) return null;
  const base = `https://wa.me/${digits}`;
  if (!prefill) return base;
  return `${base}?text=${encodeURIComponent(prefill)}`;
}

/**
 * Resolve the WhatsApp number for the athlete's own coach. Falls back to the
 * platform-wide business number (WHATSAPP_COACH_PHONE) when the coach hasn't
 * set a personal one.
 */
export async function getCoachWhatsAppUrlForAthlete(athleteId: string, prefill?: string): Promise<string | null> {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
      fullName: true,
      coachProfile: { select: { user: { select: { phone: true } } } },
    },
  });
  if (!athlete) return null;
  const coachPhone = athlete.coachProfile?.user?.phone ?? process.env.WHATSAPP_COACH_PHONE ?? null;
  const text = prefill ?? `Hola, soy ${athlete.fullName}. Te escribo desde la app.`;
  return waLink({ phone: coachPhone, prefill: text });
}
