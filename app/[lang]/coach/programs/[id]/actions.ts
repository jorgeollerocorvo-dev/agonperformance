"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateProgressionWeek, type PriorWeek } from "@/lib/ai-progression-week";
import { movementYoutubeSearchUrl } from "@/lib/ai-parse-program";
import { aiProgramGenEnabled } from "@/lib/features";
import { resolveLibraryMovements, listLibraryMovementNames } from "@/lib/movement-resolver";

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
  /** Set when this session is co-joint with another athlete. Server-managed; the editor never mutates it. */
  coJointKey?: string | null;
  /** Display-only: the partner athlete's name, if linked. */
  coJointWithName?: string | null;
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

  // Also fetch by name. Prisma's `in` does NOT honor `mode: insensitive`, so
  // this used to silently miss every library row that wasn't stored lowercase.
  // resolveLibraryMovements uses OR + equals + insensitive correctly.
  if (movementNames.size > 0) {
    const byName = await resolveLibraryMovements(movementNames);
    byName.forEach((m, key) => {
      movementMap.set(key, { id: m.id, videoUrl: m.videoUrl, nameEn: m.nameEn });
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

        // CRITICAL: find the matching old session BEFORE creating the new one,
        // so we can carry forward both the sessionLog and the coJointKey
        // (otherwise rebuilds would silently break co-joint links).
        const matchingOldSession = existingSessions.find((s) => {
          const oldDateStr = s.date.toISOString().slice(0, 10);
          const newDateStr = new Date(day.date).toISOString().slice(0, 10);
          return oldDateStr === newDateStr;
        });

        const createdDay = await tx.programSession.create({
          data: {
            programWeekId: createdWeek.id,
            date: new Date(day.date),
            day: day.day,
            focus: day.focus,
            intensity: day.intensity,
            notes: day.notes,
            coJointKey: matchingOldSession?.coJointKey ?? null,
          },
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
              actuals: matchingOldSession.sessionLog.actuals ?? undefined,
              mediaData: matchingOldSession.sessionLog.mediaData ?? undefined,
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

// ────────────────────────────────────────────────────────────
// AI: append ONE new progression week to an existing program
// ────────────────────────────────────────────────────────────

function formatAthleteContext(a: {
  sex: string | null;
  age: number | null;
  division: string | null;
  goals: string | null;
  notes: string | null;
  current1rms: unknown;
}): string {
  const lines: string[] = [];
  if (a.sex) lines.push(`Sex: ${a.sex}`);
  if (a.age) lines.push(`Age: ${a.age}`);
  if (a.division) lines.push(`Division: ${a.division}`);
  if (a.goals) lines.push(`Goals: ${a.goals}`);
  if (a.notes) lines.push(`Notes: ${a.notes}`);
  if (a.current1rms && typeof a.current1rms === "object") {
    lines.push(`Current 1RMs: ${JSON.stringify(a.current1rms)}`);
  }
  return lines.join("\n");
}

export async function generateAIProgressionWeek(formData: FormData) {
  const programId = String(formData.get("programId") ?? "");
  const lang = String(formData.get("lang") ?? "en");
  const coachHint = String(formData.get("coachHint") ?? "").trim() || null;

  if (!programId) redirect(`/${lang}/coach/programs?error=missing_program`);

  if (!aiProgramGenEnabled()) {
    redirect(
      `/${lang}/coach/programs/${programId}?aiWeekError=${encodeURIComponent(
        "AI is disabled. Enable AI_PROGRAM_GEN_ENABLED on Railway.",
      )}`,
    );
  }

  const { program: prog } = await assertOwnsProgram(programId);

  const full = await prisma.program.findUnique({
    where: { id: prog.id },
    include: {
      athlete: true,
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          sessions: {
            orderBy: { date: "asc" },
            include: {
              blocks: {
                orderBy: { order: "asc" },
                include: {
                  movements: {
                    orderBy: { order: "asc" },
                    include: { movement: true },
                  },
                },
              },
              sessionLog: true,
            },
          },
        },
      },
    },
  });
  if (!full) {
    redirect(`/${lang}/coach/programs?error=not_found`);
  }

  const priorWeeks: PriorWeek[] = full.weeks.map((w) => ({
    weekNumber: w.weekNumber,
    weekLabel: w.weekLabel,
    days: w.sessions.map((s) => {
      const isRest = (s.focus ?? "").toLowerCase().includes("rest") || s.blocks.length === 0;
      return {
        dayOfWeek: s.day,
        focus: s.focus,
        isRest,
        blocks: s.blocks.map((b) => ({
          blockCode: b.blockCode,
          label: b.label,
          format: b.format,
          movements: b.movements.map((m) => {
            const p = (m.prescription ?? {}) as Record<string, unknown>;
            return {
              name: m.movement?.nameEn ?? m.customName ?? "(unnamed)",
              sets: typeof p.sets === "string" || typeof p.sets === "number" ? String(p.sets) : null,
              reps: typeof p.reps === "string" || typeof p.reps === "number" ? String(p.reps) : null,
              load:
                typeof p.load === "string" ? p.load :
                typeof p.load_kg === "number" ? `${p.load_kg} kg` :
                null,
              rest: typeof p.rest === "string" ? p.rest : null,
              notes: typeof p.notes === "string" ? p.notes : null,
              actualLoad: null,
            };
          }),
        })),
      };
    }),
  }));

  if (priorWeeks.length === 0) {
    redirect(
      `/${lang}/coach/programs/${programId}?aiWeekError=${encodeURIComponent(
        "This program has no weeks yet — add at least one week of content first, then ask the AI to progress it.",
      )}`,
    );
  }

  const newWeekNumber = (full.weeks.at(-1)?.weekNumber ?? 0) + 1;

  const lastSession = full.weeks.at(-1)?.sessions.at(-1);
  const lastDate = lastSession?.date ?? full.endDate ?? full.startDate;
  const newWeekStart = new Date(lastDate);
  newWeekStart.setDate(newWeekStart.getDate() + 1);

  // Bias the AI toward curated library names so matched movements inherit
  // their locked demo videos.
  const libraryMovementNames = await listLibraryMovementNames();

  let nextWeek;
  try {
    nextWeek = await generateProgressionWeek({
      programTitle: full.title,
      programGoal: full.goal,
      athleteName: full.athlete.fullName,
      athleteContext: formatAthleteContext(full.athlete),
      priorWeeks,
      newWeekNumber,
      coachHint,
      libraryMovementNames,
    });
  } catch (e) {
    redirect(
      `/${lang}/coach/programs/${programId}?aiWeekError=${encodeURIComponent((e as Error).message)}`,
    );
  }

  // Resolve every AI-invented movement name against the Movement library so
  // matched ones inherit their curated (possibly locked) videoUrl and movementId.
  const aiNames: string[] = [];
  for (const d of nextWeek.days) {
    for (const b of d.blocks ?? []) {
      for (const m of b.movements ?? []) {
        if (m.name) aiNames.push(m.name);
      }
    }
  }
  const libraryByName = await resolveLibraryMovements(aiNames);
  const normalizeName = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,;:!?]+$/g, "");

  await prisma.$transaction(
    async (tx) => {
      const week = await tx.programWeek.create({
        data: {
          programId: full.id,
          weekNumber: nextWeek.weekNumber,
          weekLabel: nextWeek.weekLabel ?? `Week ${nextWeek.weekNumber}`,
        },
      });

      for (let di = 0; di < nextWeek.days.length; di++) {
        const d = nextWeek.days[di];
        const dayDate = new Date(newWeekStart);
        dayDate.setDate(dayDate.getDate() + di);

        const day = await tx.programSession.create({
          data: {
            programWeekId: week.id,
            date: dayDate,
            day: d.dayOfWeek ?? dayDate.toLocaleDateString("en-US", { weekday: "long" }),
            focus: d.isRest ? "Rest day" : (d.focus ?? null),
            intensity: d.isRest ? null : (d.intensity ?? null),
            notes: d.notes ?? null,
          },
        });

        for (let bi = 0; bi < (d.blocks ?? []).length; bi++) {
          const b = d.blocks[bi];
          await tx.programBlock.create({
            data: {
              programSessionId: day.id,
              blockCode: b.blockCode || String.fromCharCode(65 + bi),
              label: b.label ?? null,
              format: b.format ?? null,
              restSec: b.restSec ?? null,
              notes: b.notes ?? null,
              order: bi,
              movements: {
                create: b.movements.map((m, mi) => {
                  const lib = m.name ? libraryByName.get(normalizeName(m.name)) : undefined;
                  const youtubeUrl = lib?.videoUrl ?? movementYoutubeSearchUrl(m.name);
                  return {
                    movementId: lib?.id,
                    customName: lib ? null : m.name,
                    prescription: {
                      sets: m.sets ?? undefined,
                      reps: m.reps ?? undefined,
                      load: m.load ?? undefined,
                      rest: m.rest ?? undefined,
                      notes: m.notes ?? undefined,
                      youtubeUrl,
                    },
                    order: mi,
                    isTest: !!m.isTest,
                  };
                }),
              },
            },
          });
        }
      }

      const newEnd = new Date(newWeekStart);
      newEnd.setDate(newEnd.getDate() + nextWeek.days.length - 1);
      await tx.program.update({
        where: { id: full.id },
        data: {
          durationWeeks: nextWeek.weekNumber,
          endDate: newEnd,
        },
      });
    },
    { timeout: 90_000, maxWait: 10_000 },
  );

  revalidatePath(`/${lang}/coach/programs/${programId}`, "layout");
  redirect(`/${lang}/coach/programs/${programId}?aiWeekAdded=${nextWeek.weekNumber}`);
}

// ────────────────────────────────────────────────────────────
// Week trash: soft-delete + restore
// ────────────────────────────────────────────────────────────

/** Shape of the snapshot we stash in DeletedProgramWeek.snapshot */
type WeekSnapshot = {
  weekNumber: number;
  weekLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  sessions: Array<{
    date: string;
    day: string | null;
    focus: string | null;
    intensity: string | null;
    notes: string | null;
    blocks: Array<{
      blockCode: string;
      label: string | null;
      format: string | null;
      restSec: number | null;
      notes: string | null;
      order: number;
      movements: Array<{
        movementId: string | null;
        customName: string | null;
        prescription: unknown;
        order: number;
        isTest: boolean;
      }>;
    }>;
  }>;
};

/**
 * Delete a single week. Snapshots the entire tree to DeletedProgramWeek first
 * so the coach can restore via the Trash section if it was a mistake.
 * Renumbers any later weeks down by 1 to keep weekNumber contiguous.
 */
export async function deleteProgramWeek(formData: FormData) {
  "use server";
  const weekId = String(formData.get("weekId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  const lang = String(formData.get("lang") ?? "en");
  if (!weekId || !programId) redirect(`/${lang}/coach/programs?error=missing_fields`);

  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  const { coach } = await assertOwnsProgram(programId);

  // Pull the entire week tree for the snapshot.
  const week = await prisma.programWeek.findFirst({
    where: { id: weekId, program: { id: programId, athlete: { coachProfileId: coach.id } } },
    include: {
      sessions: {
        orderBy: { date: "asc" },
        include: {
          blocks: {
            orderBy: { order: "asc" },
            include: { movements: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!week) {
    redirect(`/${lang}/coach/programs/${programId}?weekDeleteError=${encodeURIComponent("Week not found")}`);
  }

  const snapshot: WeekSnapshot = {
    weekNumber: week.weekNumber,
    weekLabel: week.weekLabel,
    startDate: week.startDate ? week.startDate.toISOString().slice(0, 10) : null,
    endDate: week.endDate ? week.endDate.toISOString().slice(0, 10) : null,
    sessions: week.sessions.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      day: s.day,
      focus: s.focus,
      intensity: s.intensity,
      notes: s.notes,
      blocks: s.blocks.map((b) => ({
        blockCode: b.blockCode,
        label: b.label,
        format: b.format,
        restSec: b.restSec,
        notes: b.notes,
        order: b.order,
        movements: b.movements.map((m) => ({
          movementId: m.movementId,
          customName: m.customName,
          prescription: m.prescription,
          order: m.order,
          isTest: m.isTest,
        })),
      })),
    })),
  };

  const deletedRow = await prisma.$transaction(async (tx) => {
    const deleted = await tx.deletedProgramWeek.create({
      data: {
        programId,
        weekNumber: week.weekNumber,
        weekLabel: week.weekLabel,
        snapshot: snapshot as unknown as object,
        deletedBy: session.user.id ?? null,
      },
    });

    // Hard-delete the live row — cascades to sessions/blocks/movements.
    await tx.programWeek.delete({ where: { id: week.id } });

    // Renumber later weeks down by 1 to keep the sequence contiguous.
    // Use a temporary offset to avoid colliding with the unique [programId, weekNumber] index.
    const later = await tx.programWeek.findMany({
      where: { programId, weekNumber: { gt: week.weekNumber } },
      orderBy: { weekNumber: "asc" },
      select: { id: true, weekNumber: true },
    });
    // Bump them into a high range, then back down. Avoids unique-index conflicts.
    for (const w of later) {
      await tx.programWeek.update({
        where: { id: w.id },
        data: { weekNumber: w.weekNumber + 10_000 },
      });
    }
    for (const w of later) {
      await tx.programWeek.update({
        where: { id: w.id },
        data: { weekNumber: w.weekNumber - 1 },
      });
    }

    return deleted;
  }, { timeout: 30_000 });

  revalidatePath(`/${lang}/coach/programs/${programId}`, "layout");
  redirect(`/${lang}/coach/programs/${programId}?weekDeleted=${deletedRow.id}`);
}

/**
 * Restore a previously-deleted week from its snapshot. Inserts the week at the
 * end of the program (new weekNumber = max existing + 1) and recreates every
 * session/block/movement. Removes the snapshot row on success.
 */
export async function restoreProgramWeek(formData: FormData) {
  "use server";
  const deletedId = String(formData.get("deletedId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  const lang = String(formData.get("lang") ?? "en");
  if (!deletedId || !programId) redirect(`/${lang}/coach/programs?error=missing_fields`);

  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  await assertOwnsProgram(programId);

  const stash = await prisma.deletedProgramWeek.findFirst({
    where: { id: deletedId, programId },
  });
  if (!stash) {
    redirect(`/${lang}/coach/programs/${programId}?weekRestoreError=${encodeURIComponent("Deleted week not found or already restored")}`);
  }

  const snap = stash.snapshot as unknown as WeekSnapshot;

  // Pick a weekNumber that doesn't collide: max + 1.
  const maxRow = await prisma.programWeek.findFirst({
    where: { programId },
    orderBy: { weekNumber: "desc" },
    select: { weekNumber: true },
  });
  const newWeekNumber = (maxRow?.weekNumber ?? 0) + 1;

  await prisma.$transaction(async (tx) => {
    const week = await tx.programWeek.create({
      data: {
        programId,
        weekNumber: newWeekNumber,
        weekLabel: snap.weekLabel ?? `Week ${newWeekNumber} (restored)`,
        startDate: snap.startDate ? new Date(snap.startDate) : null,
        endDate: snap.endDate ? new Date(snap.endDate) : null,
      },
    });

    for (const s of snap.sessions) {
      const day = await tx.programSession.create({
        data: {
          programWeekId: week.id,
          date: new Date(s.date),
          day: s.day,
          focus: s.focus,
          intensity: s.intensity,
          notes: s.notes,
        },
      });
      for (const b of s.blocks) {
        await tx.programBlock.create({
          data: {
            programSessionId: day.id,
            blockCode: b.blockCode,
            label: b.label,
            format: b.format,
            restSec: b.restSec,
            notes: b.notes,
            order: b.order,
            movements: {
              create: b.movements.map((m) => ({
                movementId: m.movementId,
                customName: m.customName,
                prescription: (m.prescription ?? undefined) as object | undefined,
                order: m.order,
                isTest: m.isTest,
              })),
            },
          },
        });
      }
    }

    await tx.deletedProgramWeek.delete({ where: { id: stash.id } });
  }, { timeout: 60_000 });

  revalidatePath(`/${lang}/coach/programs/${programId}`, "layout");
  redirect(`/${lang}/coach/programs/${programId}?weekRestored=${newWeekNumber}`);
}

/** Permanently purge a snapshot (no longer restorable). */
export async function purgeDeletedWeek(formData: FormData) {
  "use server";
  const deletedId = String(formData.get("deletedId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  const lang = String(formData.get("lang") ?? "en");
  if (!deletedId || !programId) return;

  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  await assertOwnsProgram(programId);

  await prisma.deletedProgramWeek.deleteMany({ where: { id: deletedId, programId } });
  revalidatePath(`/${lang}/coach/programs/${programId}`, "layout");
  redirect(`/${lang}/coach/programs/${programId}`);
}

// ────────────────────────────────────────────────────────────
// Co-joint sessions: link two athletes' workouts on the same date
// ────────────────────────────────────────────────────────────

/**
 * For a given session date, list the coach's OTHER athletes whose program
 * covers that date (so the coach can pick one to link the workout to).
 * Each entry includes the candidate target sessionId (if one exists on
 * that date) and whether they're already linked to this source.
 */
export async function listCoJointCandidates(
  sourceSessionId: string,
  programId: string,
): Promise<Array<{
  athleteId: string;
  athleteName: string;
  targetSessionId: string | null;
  isLinked: boolean;
}>> {
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) return [];
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) return [];

  const source = await prisma.programSession.findFirst({
    where: {
      id: sourceSessionId,
      programWeek: { program: { id: programId, athlete: { coachProfileId: coach.id } } },
    },
    select: { date: true, coJointKey: true, programWeek: { select: { program: { select: { athleteId: true } } } } },
  });
  if (!source) return [];

  const sourceAthleteId = source.programWeek.program.athleteId;

  // All other athletes owned by this coach.
  const athletes = await prisma.athlete.findMany({
    where: { coachProfileId: coach.id, id: { not: sourceAthleteId } },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  // For each, find a session on the same date in any of their programs.
  const candidates = await Promise.all(
    athletes.map(async (a) => {
      const target = await prisma.programSession.findFirst({
        where: {
          date: source.date,
          programWeek: { program: { athleteId: a.id } },
        },
        select: { id: true, coJointKey: true },
      });
      return {
        athleteId: a.id,
        athleteName: a.fullName,
        targetSessionId: target?.id ?? null,
        isLinked:
          !!source.coJointKey &&
          !!target?.coJointKey &&
          source.coJointKey === target.coJointKey,
      };
    }),
  );

  return candidates;
}

/**
 * Link a source ProgramSession to a target athlete's same-date session.
 * Copies the source session's blocks (with movements + prescription) into
 * the target's session, replacing whatever was there. Tags BOTH sessions
 * with the same coJointKey so they appear as linked.
 *
 * If the target athlete has no session on that date, returns an error —
 * we don't silently create new dates outside the target's existing program.
 */
export async function linkCoJointSession(formData: FormData) {
  "use server";
  const sourceSessionId = String(formData.get("sourceSessionId") ?? "");
  const targetAthleteId = String(formData.get("targetAthleteId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  const lang = String(formData.get("lang") ?? "en");
  if (!sourceSessionId || !targetAthleteId || !programId) {
    redirect(`/${lang}/coach/programs/${programId}?coJointError=${encodeURIComponent("Missing fields")}`);
  }

  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("no coach profile");

  // Verify the coach owns the source program and the target athlete.
  const source = await prisma.programSession.findFirst({
    where: {
      id: sourceSessionId,
      programWeek: { program: { id: programId, athlete: { coachProfileId: coach.id } } },
    },
    include: {
      blocks: {
        orderBy: { order: "asc" },
        include: { movements: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!source) {
    redirect(`/${lang}/coach/programs/${programId}?coJointError=${encodeURIComponent("Source session not found")}`);
  }

  const targetAthlete = await prisma.athlete.findFirst({
    where: { id: targetAthleteId, coachProfileId: coach.id },
  });
  if (!targetAthlete) {
    redirect(`/${lang}/coach/programs/${programId}?coJointError=${encodeURIComponent("Target athlete not found")}`);
  }

  const target = await prisma.programSession.findFirst({
    where: {
      date: source.date,
      programWeek: { program: { athleteId: targetAthleteId } },
    },
  });
  if (!target) {
    redirect(
      `/${lang}/coach/programs/${programId}?coJointError=${encodeURIComponent(
        `${targetAthlete.fullName} has no session on ${source.date.toISOString().slice(0, 10)} — create their program covering this date first.`,
      )}`,
    );
  }

  // Reuse existing coJointKey if either side already has one (so additional
  // athletes can be added to an already-linked group), otherwise mint a new.
  const coJointKey = source.coJointKey || target.coJointKey || crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    // Replace the target's blocks with a deep copy of the source's.
    await tx.programBlock.deleteMany({ where: { programSessionId: target.id } });

    for (const b of source.blocks) {
      await tx.programBlock.create({
        data: {
          programSessionId: target.id,
          blockCode: b.blockCode,
          label: b.label,
          format: b.format,
          restSec: b.restSec,
          notes: b.notes,
          order: b.order,
          movements: {
            create: b.movements.map((m) => ({
              movementId: m.movementId,
              customName: m.customName,
              prescription: (m.prescription ?? undefined) as object | undefined,
              order: m.order,
              isTest: m.isTest,
            })),
          },
        },
      });
    }

    // Mirror focus/intensity/notes from source for clarity.
    await tx.programSession.update({
      where: { id: target.id },
      data: {
        focus: source.focus,
        intensity: source.intensity,
        notes: source.notes,
        coJointKey,
      },
    });

    // Tag the source.
    await tx.programSession.update({
      where: { id: source.id },
      data: { coJointKey },
    });
  }, { timeout: 30_000 });

  revalidatePath(`/${lang}/coach/programs/${programId}`, "layout");
  redirect(
    `/${lang}/coach/programs/${programId}?coJointLinked=${encodeURIComponent(targetAthlete.fullName)}`,
  );
}

/**
 * Remove the co-joint link from a session. Only clears this side — other
 * linked athletes stay linked to each other unless they unlink too.
 */
export async function unlinkCoJointSession(formData: FormData) {
  "use server";
  const sessionId = String(formData.get("sessionId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  const lang = String(formData.get("lang") ?? "en");
  if (!sessionId || !programId) return;

  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) throw new Error("unauthorized");
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("no coach profile");

  const owned = await prisma.programSession.findFirst({
    where: {
      id: sessionId,
      programWeek: { program: { id: programId, athlete: { coachProfileId: coach.id } } },
    },
  });
  if (!owned) return;

  await prisma.programSession.update({
    where: { id: sessionId },
    data: { coJointKey: null },
  });

  revalidatePath(`/${lang}/coach/programs/${programId}`, "layout");
  redirect(`/${lang}/coach/programs/${programId}?coJointUnlinked=1`);
}
