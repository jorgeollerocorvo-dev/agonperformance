"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function saveSessionFeedback(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");

  const sessionId = String(formData.get("sessionId") ?? "");
  const intensityFeedback = Number(formData.get("intensityFeedback") ?? 0);
  const intensityReview = String(formData.get("intensityReview") ?? "").trim() || null;
  const lang = String(formData.get("lang") ?? "en");

  if (!sessionId) throw new Error("missing session id");
  if (intensityFeedback < 1 || intensityFeedback > 5) throw new Error("invalid intensity");

  // Get the athlete link for this user
  const link = await prisma.athleteLink.findFirst({
    where: { userId: session.user.id, active: true },
  });
  if (!link) throw new Error("no athlete");

  // Verify the session belongs to this athlete's programs
  const programSession = await prisma.programSession.findFirst({
    where: {
      id: sessionId,
      programWeek: { program: { athleteId: link.athleteId } },
    },
    include: { sessionLog: true },
  });
  if (!programSession) throw new Error("forbidden");

  // Update or create SessionLog
  if (programSession.sessionLog) {
    await prisma.sessionLog.update({
      where: { id: programSession.sessionLog.id },
      data: { intensityFeedback, intensityReview },
    });
  } else {
    await prisma.sessionLog.create({
      data: {
        programSessionId: sessionId,
        athleteId: link.athleteId,
        intensityFeedback,
        intensityReview,
      },
    });
  }

  revalidatePath(`/${lang}/athlete/session/${sessionId}`);
  redirect(`/${lang}/athlete/session/${sessionId}`);
}
