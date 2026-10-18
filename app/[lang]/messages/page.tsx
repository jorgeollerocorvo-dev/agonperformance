import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCoachWhatsAppUrlForAthlete, waLink } from "@/lib/whatsapp-link";

/**
 * In-app messaging was retired. We now redirect every /messages visit to
 * the right WhatsApp destination:
 *   - If the viewer is an athlete → wa.me of their coach
 *   - If the viewer is a coach    → /coach/whatsapp dashboard
 *   - Otherwise                   → the landing page
 */
export default async function MessagesRedirect({ params }: PageProps<"/[lang]/messages">) {
  const { lang } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}`);

  // Coach? Send them to the WhatsApp control panel.
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (coach) redirect(`/${lang}/coach/whatsapp`);

  // Athlete? Open their coach's WhatsApp directly.
  const direct = await prisma.athlete.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const athleteId = direct?.id ?? (await prisma.athleteLink.findFirst({ where: { userId: session.user.id, active: true }, select: { athleteId: true } }))?.athleteId ?? null;
  if (athleteId) {
    const url = await getCoachWhatsAppUrlForAthlete(athleteId);
    if (url) redirect(url);
  }

  // Fallback: platform WhatsApp number if configured.
  const platform = waLink({ phone: process.env.WHATSAPP_COACH_PHONE ?? null });
  if (platform) redirect(platform);
  redirect(`/${lang}`);
}
