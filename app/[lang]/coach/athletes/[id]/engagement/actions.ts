"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { AthleteStatus } from "@prisma/client";

/**
 * Coach-side actions for the per-athlete engagement panel. Every action
 * verifies the athlete belongs to the calling coach before mutating.
 */
async function assertOwnsAthlete(athleteId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("Coach profile missing");
  const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, coachProfileId: coach.id } });
  if (!athlete) throw new Error("Athlete not owned by you");
  return { coach, athlete };
}

export async function createHabit(formData: FormData) {
  const athleteId = String(formData.get("athleteId") ?? "");
  await assertOwnsAthlete(athleteId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const icon = String(formData.get("icon") ?? "").trim() || null;
  const targetPerWeek = Math.min(7, Math.max(1, parseInt(String(formData.get("targetPerWeek") ?? "7"), 10) || 7));
  await prisma.habit.create({ data: { athleteId, name, icon, targetPerWeek } });
  revalidatePath(`/[lang]/coach/athletes/${athleteId}/engagement`, "page");
}

export async function deleteHabit(formData: FormData) {
  const athleteId = String(formData.get("athleteId") ?? "");
  await assertOwnsAthlete(athleteId);
  const id = String(formData.get("id") ?? "");
  await prisma.habit.deleteMany({ where: { id, athleteId } });
  revalidatePath(`/[lang]/coach/athletes/${athleteId}/engagement`, "page");
}

export async function replyToCheckIn(formData: FormData) {
  const athleteId = String(formData.get("athleteId") ?? "");
  await assertOwnsAthlete(athleteId);
  const id = String(formData.get("id") ?? "");
  const coachReply = String(formData.get("coachReply") ?? "").trim();
  await prisma.checkIn.updateMany({ where: { id, athleteId }, data: { coachReply: coachReply || null } });
  revalidatePath(`/[lang]/coach/athletes/${athleteId}/engagement`, "page");
}

export async function updateAthleteStatus(formData: FormData) {
  const athleteId = String(formData.get("athleteId") ?? "");
  await assertOwnsAthlete(athleteId);
  const status = String(formData.get("status") ?? "ACTIVE") as AthleteStatus;
  await prisma.athlete.update({ where: { id: athleteId }, data: { status } });
  revalidatePath(`/[lang]/coach/athletes/${athleteId}/engagement`, "page");
  revalidatePath(`/[lang]/coach/athletes`, "page");
}

/**
 * Nutrition plan: single row per athlete, upsert. Coach fills in macros +
 * meal structure + free-text notes; athlete reads on their account hub.
 */
export async function upsertNutritionPlan(formData: FormData) {
  const athleteId = String(formData.get("athleteId") ?? "");
  const { coach } = await assertOwnsAthlete(athleteId);
  const num = (name: string): number | null => {
    const v = String(formData.get(name) ?? "").trim();
    if (!v) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  };
  const str = (name: string): string | null => {
    const v = String(formData.get(name) ?? "").trim();
    return v || null;
  };
  const data = {
    caloriesTarget: num("caloriesTarget"),
    proteinG: num("proteinG"),
    carbsG: num("carbsG"),
    fatG: num("fatG"),
    mealsPerDay: num("mealsPerDay"),
    mealPlan: str("mealPlan"),
    supplements: str("supplements"),
    restrictions: str("restrictions"),
    notes: str("notes"),
    updatedByUserId: coach.userId,
  };
  await prisma.nutritionPlan.upsert({
    where: { athleteId },
    create: { athleteId, ...data },
    update: data,
  });
  revalidatePath(`/[lang]/coach/athletes/${athleteId}/engagement`, "page");
  revalidatePath(`/[lang]/athlete/account`, "page");
}

/**
 * Edit coach notes / goals / 1rms / benchmarks — the free-form fields on
 * Athlete the athlete needs to see on their account hub.
 */
export async function updateAthleteCoachNotes(formData: FormData) {
  const athleteId = String(formData.get("athleteId") ?? "");
  await assertOwnsAthlete(athleteId);
  const str = (name: string): string | null => {
    const v = String(formData.get(name) ?? "").trim();
    return v || null;
  };
  await prisma.athlete.update({
    where: { id: athleteId },
    data: {
      goals: str("goals"),
      competitiveGoal: str("competitiveGoal"),
      division: str("division"),
      notes: str("notes"),
    },
  });
  revalidatePath(`/[lang]/coach/athletes/${athleteId}/engagement`, "page");
  revalidatePath(`/[lang]/athlete/account`, "page");
}
