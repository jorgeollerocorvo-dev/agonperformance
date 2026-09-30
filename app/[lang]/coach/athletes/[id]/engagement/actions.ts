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
