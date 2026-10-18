import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCoachWhatsAppUrlForAthlete } from "@/lib/whatsapp-link";

/**
 * "Talk to coach" is now a straight WhatsApp hand-off. We resolve the
 * athlete's coach phone and 302 to wa.me with a prefilled greeting.
 */
export default async function TalkToCoach({ params }: PageProps<"/[lang]/athlete/talk">) {
  const { lang } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);

  const direct = await prisma.athlete.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const athleteId = direct?.id ?? (await prisma.athleteLink.findFirst({ where: { userId: session.user.id, active: true }, select: { athleteId: true } }))?.athleteId ?? null;
  if (!athleteId) redirect(`/${lang}/athlete`);

  const url = await getCoachWhatsAppUrlForAthlete(athleteId!);
  if (url) redirect(url);
  redirect(`/${lang}/athlete`);
}
