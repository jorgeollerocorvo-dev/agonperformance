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
  movementId: string | null;  // Reference to Movement library
};

export async function saveProgram(input: EditorProgram) {
  const { program } = await assertOwnsProgram(input.id);

  // Collect all unique movement IDs and names referenced in the program
  const movementIds = new Set<string>();
  const movementNames = new Set<string>();

  for (const wk of input.weeks) {
    for (const day of wk.days) {
      for (const block of day.blocks) {
        for (const movement of block.movements) {
          if (movement.movementId) {
            movementIds.add(movement.movementId);
          }
          if (movement.name) {
            movementNames.add(movement.name.toLowerCase().trim());
          }
        }
      }
    }
  }

  // Fetch all movements from library - both by ID and by name
  const movementMap = new Map<string, any>();

  // First fetch by IDs
  if (movementIds.size > 0) {
    const movements = await prisma.movement.findMany({
      where: { id: { in: Array.from(movementIds) } },
      select: { id: true, videoUrl: true, nameEn: true },
    });
    movements.forEach(m => movementMap.set(m.id, m));
  }

  // Also fetch by name to match movements even if movementId isn't set
  if (movementNames.size > 0) {
    const movementsByName = await prisma.movement.findMany({
      where: {
        nameEn: { in: Array.from(movementNames), mode: 'insensitive' }
      },
      select: { id: true, videoUrl: true, nameEn: true },
    });
    movementsByName.forEach(m => {
      // Store by normalized name for lookup
      movementMap.set(m.nameEn.toLowerCase(), m);
    });
  }

  await prisma.$transaction(async (tx) => {
    // CRITICAL: Save all existing SessionLog data before deleting sessions
    // This preserves athlete feedback (intensityFeedback, intensityReview) across program edits
    const existingSessions = await tx.programSession.findMany({
      where: { programWeek: { programId: program.id } },
      include: { sessionLog: true },
    });

    // Create a map of programSessionId -> sessionLog for restoration
    const sessionLogMap = new Map();
    for (const session of existingSessions) {
      if (session.sessionLog) {
        sessionLogMap.set(session.id, session.sessionLog);
      }
    }

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

        // CRITICAL: Restore SessionLog if this date had athlete feedback
        // Match old sessions by date to preserve intensityFeedback and intensityReview
        const matchingOldSession = existingSessions.find((s) => {
          const oldDateStr = s.date.toISOString().slice(0, 10);
          const newDateStr = new Date(day.date).toISOString().slice(0, 10);
          return oldDateStr === newDateStr;
        });
        if (matchingOldSession?.sessionLog) {
          await tx.sessionLog.create({
            data: {
              programSessionId: createdDay.id,
              athleteId: matchingOldSession.sessionLog.athleteId,
              intensityFeedback: matchingOldSession.sessionLog.intensityFeedback,
              intensityReview: matchingOldSession.sessionLog.intensityReview,
              completedAt: matchingOldSession.sessionLog.completedAt,
              rating: matchingOldSession.sessionLog.rating,
              notes: matchingOldSession.sessionLog.notes,
              actuals: matchingOldSession.sessionLog.actuals,
              mediaData: matchingOldSession.sessionLog.mediaData,
            },
          });
        }
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
                create: b.movements.map((m, mi) => {
                  const movementId = m.movementId || undefined;

                  // Try to get library video by ID first, then by name
                  let libraryMovement = movementId ? movementMap.get(movementId) : null;
                  if (!libraryMovement && m.name) {
                    libraryMovement = movementMap.get(m.name.toLowerCase().trim());
                  }

                  const libraryVideoUrl = libraryMovement?.videoUrl;
                  // Priority: coach-pinned URL → movement library video
                  const youtubeUrl = m.youtubeUrl || libraryVideoUrl || undefined;
                  // Use the matched movement's ID if we found one by name
                  const finalMovementId = movementId || (libraryMovement?.id ? libraryMovement.id : undefined);

                  return {
                    movementId: finalMovementId,
                    customName: m.name || null,
                    prescription: {
                      sets: m.sets || undefined,
                      reps: m.reps || undefined,
                      load: m.load || undefined,
                      rest: m.rest || undefined,
                      notes: m.notes || undefined,
                      youtubeUrl,
                    },
                    order: mi,
                    isTest: m.isTest,
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

      // Calculate correct day of week from date (timezone-safe)
      const year = dayDate.getFullYear();
      const month = dayDate.getMonth();
      const day = dayDate.getDate();
      const calculatedDate = new Date(year, month, day);
      const dayOfWeekIndex = calculatedDate.getDay();
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = daysOfWeek[dayOfWeekIndex];

      await prisma.programSession.create({
        data: {
          programWeekId: week.id,
          date: dayDate,
          day: dayName,
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

// ────────────────────────────────────────────────────────────
// Delete a specific session/workout from a program
// ────────────────────────────────────────────────────────────

export async function deleteSession(sessionId: string, programId: string, lang: string) {
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("no coach profile");

  // Verify the session belongs to a program owned by this coach
  const programSession = await prisma.programSession.findFirst({
    where: {
      id: sessionId,
      programWeek: {
        program: { id: programId, athlete: { coachProfileId: coach.id } },
      },
    },
  });
  if (!programSession) throw new Error("forbidden");

  // Delete the session (cascades to blocks and movements)
  await prisma.programSession.delete({ where: { id: sessionId } });
  revalidatePath(`/${lang}/coach/programs/${programId}`, "layout");
}

// ────────────────────────────────────────────────────────────
// Create a new session/workout on a specific date
// ────────────────────────────────────────────────────────────

export async function createSession(formData: FormData) {
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("no coach profile");

  const programId = String(formData.get("programId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const day = String(formData.get("day") ?? "");
  const focus = String(formData.get("focus") ?? "").trim() || null;
  const intensity = String(formData.get("intensity") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const lang = String(formData.get("lang") ?? "en");

  if (!programId || !dateStr) throw new Error("missing fields");

  // Verify coach owns program
  const program = await prisma.program.findFirst({
    where: { id: programId, athlete: { coachProfileId: coach.id } },
  });
  if (!program) throw new Error("forbidden program");

  // Find or create the week for this date
  const sessionDate = new Date(dateStr);
  sessionDate.setHours(0, 0, 0, 0);

  // Calculate which week this date belongs to
  const programStart = new Date(program.startDate);
  programStart.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((sessionDate.getTime() - programStart.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(daysDiff / 7) + 1;

  // Find or create the week
  let programWeek = await prisma.programWeek.findFirst({
    where: { programId, weekNumber },
  });
  if (!programWeek) {
    programWeek = await prisma.programWeek.create({
      data: {
        programId,
        weekNumber,
        weekLabel: `Week ${weekNumber}`,
      },
    });
  }

  // Calculate correct day of week from date string (timezone-safe)
  const dateOnlyStr = dateStr; // YYYY-MM-DD
  const [year, month, dayNum] = dateOnlyStr.split('-').map(Number);
  const calculatedDate = new Date(year, month - 1, dayNum);
  const dayOfWeekIndex = calculatedDate.getDay();
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const calculatedDay = daysOfWeek[dayOfWeekIndex];

  // Create the session
  await prisma.programSession.create({
    data: {
      programWeekId: programWeek.id,
      date: sessionDate,
      day: day || calculatedDay,
      focus,
      intensity,
      notes,
    },
  });

  revalidatePath(`/${lang}/coach/programs/${programId}`, "layout");
}

// ────────────────────────────────────────────────────────────
// Update an existing session/workout
// ────────────────────────────────────────────────────────────

export async function updateSession(formData: FormData) {
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("no coach profile");

  const sessionId = String(formData.get("sessionId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  const focus = String(formData.get("focus") ?? "").trim() || null;
  const intensity = String(formData.get("intensity") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const lang = String(formData.get("lang") ?? "en");

  if (!sessionId || !programId) throw new Error("missing fields");

  // Verify coach owns program
  const programSession = await prisma.programSession.findFirst({
    where: {
      id: sessionId,
      programWeek: {
        program: { id: programId, athlete: { coachProfileId: coach.id } },
      },
    },
  });
  if (!programSession) throw new Error("forbidden");

  // Update the session
  await prisma.programSession.update({
    where: { id: sessionId },
    data: {
      focus,
      intensity,
      notes,
    },
  });

  revalidatePath(`/${lang}/coach/programs/${programId}`, "layout");
}
