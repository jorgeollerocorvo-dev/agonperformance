"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function saveSessionFeedback(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");

  const programSessionId = String(formData.get("programSessionId") ?? "");
  const intensityFeedback = formData.get("intensityFeedback");
  const intensityReview = String(formData.get("intensityReview") ?? "").trim() || null;
  const lang = String(formData.get("lang") ?? "en");

  if (!programSessionId) throw new Error("missing session id");

  // Verify athlete owns this session
  const athleteLink = await prisma.athleteLink.findFirst({
    where: { userId: session.user.id, active: true },
  });
  if (!athleteLink) throw new Error("no athlete link");

  const programSession = await prisma.programSession.findFirst({
    where: {
      id: programSessionId,
      programWeek: { program: { athleteId: athleteLink.athleteId } },
    },
  });
  if (!programSession) throw new Error("forbidden");

  // Parse intensity feedback (should be 1-5)
  const intensity = intensityFeedback
    ? Math.max(1, Math.min(5, parseInt(String(intensityFeedback), 10)))
    : null;

  // Upsert SessionLog with feedback
  await prisma.sessionLog.upsert({
    where: { programSessionId },
    update: {
      intensityFeedback: intensity,
      intensityReview,
      completedAt: new Date(),
    },
    create: {
      programSessionId,
      athleteId: athleteLink.athleteId,
      intensityFeedback: intensity,
      intensityReview,
      completedAt: new Date(),
    },
  });

  revalidatePath(`/${lang}/athlete`, "layout");
}
