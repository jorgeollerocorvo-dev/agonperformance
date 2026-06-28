"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateProgramFromBrief, type ProgramBrief } from "@/lib/ai-generate-program";
import { aiProgramGenEnabled } from "@/lib/features";
import { movementYoutubeSearchUrl } from "@/lib/ai-parse-program";
import { isJorge } from "@/lib/jorge";
import { extractText } from "@/lib/parse-document";
import { resolveLibraryMovements, listLibraryMovementNames } from "@/lib/movement-resolver";

/* Build a compact athlete-context blob from the DB row, JSON-coercing the
 * coaching-tool fields that are stored as Prisma Json. */
function formatAthleteContext(a: {
  sex: string | null;
  age: number | null;
  division: string | null;
  goals: string | null;
  notes: string | null;
  competitiveGoal: string | null;
  trainingFrequency: unknown;
  current1rms: unknown;
  currentBenchmarks: unknown;
  priorityGaps: unknown;
  programmingNotes: unknown;
  injuryHistory: unknown;
}): string {
  const lines: string[] = [];
  if (a.sex) lines.push(`Sex: ${a.sex}`);
  if (a.age) lines.push(`Age: ${a.age}`);
  if (a.division) lines.push(`Division/Category: ${a.division}`);
  if (a.competitiveGoal) lines.push(`Competitive goal: ${a.competitiveGoal}`);
  if (a.goals) lines.push(`Standing goals: ${a.goals}`);
  if (a.notes) lines.push(`Notes: ${a.notes}`);
  if (a.trainingFrequency && typeof a.trainingFrequency === "object") {
    lines.push(`Training frequency: ${JSON.stringify(a.trainingFrequency)}`);
  }
  if (a.current1rms && typeof a.current1rms === "object") {
    lines.push(`Current 1RMs: ${JSON.stringify(a.current1rms)}`);
  }
  if (a.currentBenchmarks && typeof a.currentBenchmarks === "object") {
    lines.push(`Current benchmarks: ${JSON.stringify(a.currentBenchmarks)}`);
  }
  if (a.priorityGaps && typeof a.priorityGaps === "object") {
    lines.push(`Priority gaps: ${JSON.stringify(a.priorityGaps)}`);
  }
  if (a.programmingNotes && typeof a.programmingNotes === "object") {
    lines.push(`Programming notes: ${JSON.stringify(a.programmingNotes)}`);
  }
  if (a.injuryHistory && Array.isArray(a.injuryHistory) && a.injuryHistory.length > 0) {
    lines.push(`Injury history: ${JSON.stringify(a.injuryHistory)}`);
  }
  return lines.join("\n");
}

export async function generateAndCreateProgram(
  formData: FormData,
): Promise<{ error?: string; previewId?: string }> {
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) return { error: "unauthorized" };

  // Only Jorge can use AI program generation
  if (!isJorge(session)) {
    return { error: "AI program generation is only available for Jorge" };
  }

  if (!aiProgramGenEnabled()) {
    return { error: "AI program generation is currently disabled. Enable AI_PROGRAM_GEN_ENABLED on Railway and add Anthropic credits." };
  }

  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) return { error: "no coach profile" };

  const athleteId = String(formData.get("athleteId") ?? "");
  const weeks = Math.min(52, Math.max(1, parseInt(String(formData.get("weeks") ?? "4"), 10) || 4));
  const daysPerWeekRaw = String(formData.get("daysPerWeek") ?? "").trim();
  const daysPerWeek = daysPerWeekRaw ? Math.min(7, Math.max(1, parseInt(daysPerWeekRaw, 10) || 0)) : null;
  const startDateRaw = String(formData.get("startDate") ?? new Date().toISOString().slice(0, 10));
  const goalOverride = String(formData.get("goalOverride") ?? "").trim() || null;
  const needs = String(formData.get("needs") ?? "").trim();
  const style = String(formData.get("style") ?? "").trim() || null;
  const equipment = String(formData.get("equipment") ?? "").trim() || null;

  if (!athleteId) return { error: "Pick an athlete" };
  if (needs.length < 5) return { error: "Describe what this program should focus on (a sentence is enough)" };

  const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, coachProfileId: coach.id } });
  if (!athlete) return { error: "Athlete not found" };

  // Collect optional reference materials: uploaded files (PDF/Word/Excel/text/etc.)
  // plus pasted text. Both are concatenated into a single guidance blob for the AI.
  const referenceText = String(formData.get("referenceText") ?? "").trim();
  const referenceFiles = formData.getAll("referenceFiles").filter((f): f is File => f instanceof File && f.size > 0);

  const referenceParts: string[] = [];
  for (const f of referenceFiles) {
    try {
      const txt = (await extractText(f)).trim();
      if (txt) referenceParts.push(`=== ${f.name} ===\n${txt}`);
    } catch (e) {
      // Skip unreadable files but surface the error so the coach knows.
      return { error: `Could not read reference file "${f.name}": ${(e as Error).message}` };
    }
  }
  if (referenceText) referenceParts.push(`=== Pasted notes ===\n${referenceText}`);
  const referenceMaterials = referenceParts.length > 0 ? referenceParts.join("\n\n") : null;

  // Tell the AI which curated library names to prefer so generated movements
  // resolve against locked videos.
  const libraryMovementNames = await listLibraryMovementNames();

  const brief: ProgramBrief = {
    athleteName: athlete.fullName,
    athleteContext: formatAthleteContext(athlete),
    goalOverride,
    needs,
    durationWeeks: weeks,
    daysPerWeek,
    style,
    equipment,
    referenceMaterials,
    libraryMovementNames,
  };

  let parsed;
  try {
    parsed = await generateProgramFromBrief(brief);
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!parsed.weeks || parsed.weeks.length === 0) {
    return { error: "AI returned an empty program. Try a more specific brief." };
  }

  // Resolve every movement name the AI invented against the Movement library so
  // matched ones inherit their curated (possibly locked) videoUrl and keep a
  // proper movementId — same lookup the manual saveProgram path already does.
  const allNames: string[] = [];
  for (const w of parsed.weeks) {
    for (const d of w.days) {
      for (const b of d.blocks ?? []) {
        for (const m of b.movements ?? []) {
          if (m.name) allNames.push(m.name);
        }
      }
    }
  }
  const libraryByName = await resolveLibraryMovements(allNames);
  const normalizeName = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,;:!?]+$/g, "");

  const startDate = new Date(startDateRaw);

  const program = await prisma.$transaction(async (tx) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + parsed.durationWeeks * 7 - 1);

    const prog = await tx.program.create({
      data: {
        athleteId: athlete.id,
        title: parsed.title,
        goal: parsed.goal ?? goalOverride,
        startDate,
        endDate,
        durationWeeks: parsed.durationWeeks,
      },
    });

    for (let wi = 0; wi < parsed.weeks.length; wi++) {
      const w = parsed.weeks[wi];
      const createdWeek = await tx.programWeek.create({
        data: {
          programId: prog.id,
          weekNumber: w.weekNumber || wi + 1,
          weekLabel: w.weekLabel ?? null,
        },
      });

      for (let di = 0; di < w.days.length; di++) {
        const d = w.days[di];
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + (w.weekNumber - 1) * 7 + di);

        const createdDay = await tx.programSession.create({
          data: {
            programWeekId: createdWeek.id,
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
              programSessionId: createdDay.id,
              blockCode: b.blockCode || String.fromCharCode(65 + bi),
              label: b.label ?? null,
              format: b.format ?? null,
              restSec: b.restSec ?? null,
              notes: b.notes ?? null,
              order: bi,
              movements: {
                create: b.movements.map((m, mi) => {
                  const lib = m.name ? libraryByName.get(normalizeName(m.name)) : undefined;
                  // If matched: link to library row and use its (possibly locked)
                  // curated video. Otherwise: keep the AI's free-text name and
                  // fall back to a YouTube search URL.
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
    }

    return prog;
  }, { timeout: 90_000, maxWait: 10_000 });

  revalidatePath(`/`, "layout");
  return { previewId: program.id };
}

export async function generateAndRedirect(formData: FormData) {
  "use server";
  const lang = String(formData.get("lang") ?? "en");
  const result = await generateAndCreateProgram(formData);
  if (result.error) {
    redirect(`/${lang}/coach/programs/ai-new?error=${encodeURIComponent(result.error)}`);
  }
  if (result.previewId) {
    redirect(`/${lang}/coach/programs/${result.previewId}?aiCreated=1`);
  }
}
