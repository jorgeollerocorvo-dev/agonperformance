"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Standard #1: feedback submissions MUST never fail silently. We resolve the
 * athlete via either an active AthleteLink OR the Athlete.userId relation
 * (both exist in the codebase), accept partial submissions (just intensity,
 * just review, or either combined with actuals), and only throw for a hard
 * ownership violation. Any failure path redirects to the session page with
 * ?saveErr so the client surfaces it instead of a blank error.
 */
export async function saveSessionFeedback(formData: FormData) {
  const session = await auth();
  const lang = String(formData.get("lang") ?? "en");
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;
  const back = `/${lang}/athlete/session/${sessionId}`;

  try {
    if (!session?.user?.id) {
      redirect(`/${lang}/login?next=${encodeURIComponent(back)}`);
    }

    const rawFeedback = formData.get("intensityFeedback");
    const intensityFeedback =
      rawFeedback !== null && String(rawFeedback).trim() !== ""
        ? Math.max(1, Math.min(5, Number(rawFeedback) || 0)) || null
        : null;
    const intensityReview = String(formData.get("intensityReview") ?? "").trim() || null;

    // Resolve the athlete: active link first, else direct user→athlete.
    const athleteId = await resolveAthleteId(session.user.id);
    if (!athleteId) {
      redirect(`${back}?saveErr=${encodeURIComponent("No athlete profile linked to your account.")}`);
    }

    const programSession = await prisma.programSession.findFirst({
      where: {
        id: sessionId,
        programWeek: { program: { athleteId } },
      },
      include: { sessionLog: true },
    });
    if (!programSession) {
      redirect(`${back}?saveErr=${encodeURIComponent("Workout not found or not yours.")}`);
    }

    const data = {
      intensityFeedback,
      intensityReview,
      completedAt: new Date(),
    };

    if (programSession.sessionLog) {
      await prisma.sessionLog.update({
        where: { id: programSession.sessionLog.id },
        data,
      });
    } else {
      await prisma.sessionLog.create({
        data: { ...data, programSessionId: sessionId, athleteId },
      });
    }

    revalidatePath(back);
  } catch (e) {
    // Re-throw Next's redirect/notFound (they carry a NEXT_* digest).
    const err = e as { digest?: string; message?: string };
    if (err?.digest?.startsWith("NEXT_")) throw e;
    redirect(`${back}?saveErr=${encodeURIComponent(err?.message ?? "Save failed")}`);
  }
  redirect(back);
}

/**
 * Save per-movement actuals — the weight/reps/time the athlete actually did.
 * Stored on SessionLog.actuals as a map keyed by programMovementId.
 */
export async function saveActuals(formData: FormData) {
  const session = await auth();
  const lang = String(formData.get("lang") ?? "en");
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;
  const back = `/${lang}/athlete/session/${sessionId}`;

  try {
    if (!session?.user?.id) {
      redirect(`/${lang}/login?next=${encodeURIComponent(back)}`);
    }

    const athleteId = await resolveAthleteId(session.user.id);
    if (!athleteId) {
      redirect(`${back}?saveErr=${encodeURIComponent("No athlete profile linked.")}`);
    }

    const programSession = await prisma.programSession.findFirst({
      where: {
        id: sessionId,
        programWeek: { program: { athleteId } },
      },
      include: {
        sessionLog: true,
        blocks: { include: { movements: true } },
      },
    });
    if (!programSession) {
      redirect(`${back}?saveErr=${encodeURIComponent("Workout not found or not yours.")}`);
    }

    // Build the actuals map from form fields named `actual.<movementId>.<field>`.
    // Only movements belonging to THIS session are honored (ownership check).
    const ownedMovementIds = new Set(
      programSession.blocks.flatMap((b) => b.movements.map((m) => m.id)),
    );
    const actuals: Record<string, { load?: string; reps?: string; time?: string; notes?: string }> = {};
    for (const [key, value] of formData.entries()) {
      const m = key.match(/^actual\.([a-z0-9]+)\.(load|reps|time|notes)$/i);
      if (!m) continue;
      const mid = m[1];
      const field = m[2] as "load" | "reps" | "time" | "notes";
      if (!ownedMovementIds.has(mid)) continue;
      const str = String(value ?? "").trim();
      if (!str) continue;
      actuals[mid] = { ...(actuals[mid] ?? {}), [field]: str };
    }

    if (programSession.sessionLog) {
      await prisma.sessionLog.update({
        where: { id: programSession.sessionLog.id },
        data: { actuals, completedAt: programSession.sessionLog.completedAt ?? new Date() },
      });
    } else {
      await prisma.sessionLog.create({
        data: {
          programSessionId: sessionId,
          athleteId,
          actuals,
          completedAt: new Date(),
        },
      });
    }

    revalidatePath(back);
  } catch (e) {
    const err = e as { digest?: string; message?: string };
    if (err?.digest?.startsWith("NEXT_")) throw e;
    redirect(`${back}?saveErr=${encodeURIComponent(err?.message ?? "Save failed")}`);
  }
  redirect(back);
}

async function resolveAthleteId(userId: string): Promise<string | null> {
  // Try the Athlete.userId relation first (direct account owner).
  const direct = await prisma.athlete.findUnique({ where: { userId }, select: { id: true } });
  if (direct) return direct.id;
  // Else fall back to any active AthleteLink.
  const link = await prisma.athleteLink.findFirst({
    where: { userId, active: true },
    select: { athleteId: true },
  });
  return link?.athleteId ?? null;
}
