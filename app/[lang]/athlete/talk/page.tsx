import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../../dictionaries";

/**
 * Athlete shortcut: "Talk to my coach" — finds the client's active coach link,
 * opens (or creates) the conversation with that coach, then redirects to the thread.
 */
export default async function TalkToCoach({ params }: PageProps<"/[lang]/athlete/talk">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);

  const link = await prisma.athleteLink.findFirst({
    where: { userId: session.user.id, active: true },
    include: { athlete: { include: { coachProfile: { include: { user: true } } } } },
  });

  if (!link) {
    // Not linked to any coach yet — send them to discover one
    redirect(`/${lang}/coaches`);
  }

  const coachUserId = link.athlete.coachProfile.userId;
  const clientUserId = session.user.id;

  const convo = await prisma.conversation.upsert({
    where: { clientUserId_coachUserId: { clientUserId, coachUserId } },
    update: {},
    create: { clientUserId, coachUserId },
  });

  redirect(`/${lang}/messages/${convo.id}`);
}
