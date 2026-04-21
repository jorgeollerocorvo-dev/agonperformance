"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function assertOwnsProgram(programId: string) {
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("no coach profile");
  const program = await prisma.program.findFirst({
    where: { id: programId, athlete: { coachProfileId: coach.id } },
  });
  if (!program) throw new Error("forbidden");
  return { program, coach };
}

// ────────────────────────────────────────────────────────────
// Save an entire program from the editor's state blob
// ────────────────────────────────────────────────────────────

export type EditorProgram = {
  id: string;
  title: string;
  goal: string | null;
  startDate: string;
  endDate: string | null;
  durationWeeks: number | null;
  weeks: EditorWeek[];
};

export type EditorWeek = {
  id: string | null;
  weekNumber: number;
  weekLabel: string | null;
  days: EditorDay[];
};

export type EditorDay = {
  id: string | null; // ProgramSession id if exists
  date: string;      // YYYY-MM-DD
  day: string | null;
  focus: string | null;
  intensity: string | null;
  notes: string | null;
  blocks: EditorBlock[];
};

export type EditorBlock = {
  id: string | null;
  blockCode: string;
  label: string | null;
  format: string | null;
  restSec: number | null;
  notes: string | null;
  movements: EditorMovement[];
};

export type EditorMovement = {
  id: string | null;
  name: string;
  sets: string | null;
  reps: string | null;
  load: string | null;
  rest: string | null;
  notes: string | null;
  youtubeUrl: string | null;
  isTest: boolean;
};

export async function saveProgram(input: EditorProgram) {
  const { program } = await assertOwnsProgram(input.id);

  await prisma.$transaction(async (tx) => {
    await tx.program.update({
      where: { id: program.id },
      data: {
        title: input.title,
        goal: input.goal,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        durationWeeks: input.durationWeeks ?? input.weeks.length,
      },
    });

    // Destroy and rebuild the week tree (simpler than diffing)
    await tx.programWeek.deleteMany({ where: { programId: program.id } });

    for (const wk of input.weeks) {
      const createdWeek = await tx.programWeek.create({
        data: {
          programId: program.id,
          weekNumber: wk.weekNumber,
          weekLabel: wk.weekLabel,
        },
      });
      for (const day of wk.days) {
        // Skip empty days (no blocks)
        if (day.blocks.length === 0 && !day.focus && !day.notes) continue;
        const createdDay = await tx.programSession.create({
          data: {
            programWeekId: createdWeek.id,
            date: new Date(day.date),
            day: day.day,
            focus: day.focus,
            intensity: day.intensity,
            notes: day.notes,
          },
        });
        for (let bi = 0; bi < day.blocks.length; bi++) {
          const b = day.blocks[bi];
          await tx.programBlock.create({
            data: {
              programSessionId: createdDay.id,
              blockCode: b.blockCode || String.fromCharCode(65 + bi),
              label: b.label,
              format: b.format,
              restSec: b.restSec,
              notes: b.notes,
              order: bi,
              movements: {
                create: b.movements.map((m, mi) => ({
                  customName: m.name || null,
                  prescription: {
                    sets: m.sets || undefined,
                    reps: m.reps || undefined,
                    load: m.load || undefined,
                    rest: m.rest || undefined,
                    notes: m.notes || undefined,
                  },
                  order: mi,
                  isTest: m.isTest,
                  // Store YouTube URL inside prescription for now (movement.videoUrl is library-level)
                })).map((data, mi) => {
                  const mv = b.movements[mi];
                  return {
                    ...data,
                    prescription: {
                      ...(data.prescription ?? {}),
                      youtubeUrl: mv.youtubeUrl || undefined,
                    },
                  };
                }),
              },
            },
          });
        }
      }
    }
  });

  revalidatePath(`/`, "layout");
}

export async function createProgram(formData: FormData) {
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("no coach");

  const athleteId = String(formData.get("athleteId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim() || null;
  const startDateRaw = String(formData.get("startDate") ?? "");
  const weeksRaw = String(formData.get("durationWeeks") ?? "4").trim();

  if (!athleteId || !title || !startDateRaw) throw new Error("missing fields");

  // Confirm coach owns athlete
  const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, coachProfileId: coach.id } });
  if (!athlete) throw new Error("forbidden athlete");

  const durationWeeks = parseInt(weeksRaw, 10) || 4;
  const startDate = new Date(startDateRaw);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationWeeks * 7 - 1);

  const program = await prisma.program.create({
    data: {
      athleteId,
      title,
      goal,
      startDate,
      endDate,
      durationWeeks,
    },
  });

  // Pre-create empty weeks with 7 days each
  for (let w = 0; w < durationWeeks; w++) {
    const week = await prisma.programWeek.create({
      data: {
        programId: program.id,
        weekNumber: w + 1,
        weekLabel: `Week ${w + 1}`,
      },
    });
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + w * 7 + d);
      await prisma.programSession.create({
        data: {
          programWeekId: week.id,
          date: dayDate,
          day: dayDate.toLocaleDateString("en-US", { weekday: "long" }),
        },
      });
    }
  }

  redirect(`/${String(formData.get("lang") ?? "en")}/coach/programs/${program.id}`);
}

export async function deleteProgram(programId: string) {
  const { program } = await assertOwnsProgram(programId);
  await prisma.program.delete({ where: { id: program.id } });
  revalidatePath(`/`, "layout");
}
