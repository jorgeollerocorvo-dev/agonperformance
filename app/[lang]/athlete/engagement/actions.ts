"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/* ──────────────────────────────────────────────────────────────
 * Athlete-side server actions for progress photos, measurements,
 * check-ins and habits. All resolve the current athlete from the
 * auth session — no athleteId in the form to avoid IDOR risk.
 * ────────────────────────────────────────────────────────────── */

async function currentAthlete() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.athlete.findUnique({ where: { userId: session.user.id } });
}

/* Progress photos ─────────────────────────────────────────────── */

const MAX_PHOTO_BYTES = 400 * 1024; // 400KB post-resize on the client
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadProgressPhoto(formData: FormData) {
  const athlete = await currentAthlete();
  if (!athlete) return;
  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return;
  if (file.size > MAX_PHOTO_BYTES * 3) {
    // 3x guard — client should resize below 400KB, but we allow up to 1.2MB
    // for older devices; anything bigger gets rejected instead of costing
    // us DB row size + Railway egress on every read.
    throw new Error(`Photo too large (>${(MAX_PHOTO_BYTES * 3) / 1024}KB). Try again.`);
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw new Error(`Unsupported type: ${file.type}`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  const angle = String(formData.get("angle") ?? "") || null;
  const weightRaw = String(formData.get("weightKg") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  await prisma.progressPhoto.create({
    data: {
      athleteId: athlete.id,
      dataUrl,
      angle,
      weightKg: weightRaw ? parseFloat(weightRaw) : null,
      notes,
    },
  });
  revalidatePath("/[lang]/athlete/engagement", "page");
}

export async function deleteProgressPhoto(formData: FormData) {
  const athlete = await currentAthlete();
  if (!athlete) return;
  const id = String(formData.get("id") ?? "");
  await prisma.progressPhoto.deleteMany({ where: { id, athleteId: athlete.id } });
  revalidatePath("/[lang]/athlete/engagement", "page");
}

/* Body measurements ────────────────────────────────────────────── */

export async function upsertMeasurement(formData: FormData) {
  const athlete = await currentAthlete();
  if (!athlete) return;
  const dateStr = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
  const num = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    if (!v) return null;
    const parsed = parseFloat(v);
    return isNaN(parsed) ? null : parsed;
  };
  const data = {
    weightKg: num("weightKg"),
    chestCm: num("chestCm"),
    waistCm: num("waistCm"),
    hipCm: num("hipCm"),
    armCm: num("armCm"),
    thighCm: num("thighCm"),
    bodyFatPct: num("bodyFatPct"),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
  await prisma.bodyMeasurement.upsert({
    where: { athleteId_date: { athleteId: athlete.id, date: new Date(dateStr) } },
    create: { athleteId: athlete.id, date: new Date(dateStr), ...data },
    update: data,
  });
  revalidatePath("/[lang]/athlete/engagement", "page");
}

/* Check-ins ────────────────────────────────────────────────────── */

/**
 * Snaps a date to the Monday of its ISO week — one check-in per athlete per
 * week no matter which day they submit.
 */
function isoWeekStart(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1 - day);
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function submitCheckIn(formData: FormData) {
  const athlete = await currentAthlete();
  if (!athlete) return;
  const weekOf = isoWeekStart(new Date());
  const int = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    if (!v) return null;
    const parsed = parseInt(v, 10);
    return isNaN(parsed) ? null : parsed;
  };
  const num = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    if (!v) return null;
    const parsed = parseFloat(v);
    return isNaN(parsed) ? null : parsed;
  };
  const data = {
    energy: int("energy"),
    sleep: int("sleep"),
    stress: int("stress"),
    motivation: int("motivation"),
    mood: String(formData.get("mood") ?? "").trim() || null,
    weightKg: num("weightKg"),
    weekSummary: String(formData.get("weekSummary") ?? "").trim() || null,
    questions: String(formData.get("questions") ?? "").trim() || null,
  };
  await prisma.checkIn.upsert({
    where: { athleteId_weekOf: { athleteId: athlete.id, weekOf } },
    create: { athleteId: athlete.id, weekOf, ...data },
    update: data,
  });
  revalidatePath("/[lang]/athlete/engagement", "page");
}

/* Habits ───────────────────────────────────────────────────────── */

export async function toggleHabitLog(formData: FormData) {
  const athlete = await currentAthlete();
  if (!athlete) return;
  const habitId = String(formData.get("habitId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
  // Ownership check via join — protects against a client sending someone
  // else's habitId.
  const habit = await prisma.habit.findFirst({ where: { id: habitId, athleteId: athlete.id } });
  if (!habit) return;
  const date = new Date(dateStr);
  const existing = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId, date } } });
  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.habitLog.create({ data: { habitId, date, completed: true } });
  }
  revalidatePath("/[lang]/athlete/engagement", "page");
}
