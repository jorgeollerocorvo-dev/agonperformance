"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/parse-document";
import { parseProgramWithAI, bestYoutubeUrl, type ParsedProgram } from "@/lib/ai-parse-program";
import { aiImportEnabled } from "@/lib/features";

export async function importAndCreateProgram(formData: FormData): Promise<{ error?: string; previewId?: string }> {
  if (!aiImportEnabled()) {
    return { error: "AI program import is currently disabled. Build the program manually from the athlete page." };
  }
  console.log("[import] start", new Date().toISOString());
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) {
    console.log("[import] unauthorized");
    return { error: "unauthorized" };
  }
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) { console.log("[import] no coach profile"); return { error: "no coach profile" }; }

  const file = formData.get("file") as File | null;
  const pastedText = String(formData.get("pastedText") ?? "").trim();
  const athleteId = String(formData.get("athleteId") ?? "");
  const startDateRaw = String(formData.get("startDate") ?? new Date().toISOString().slice(0, 10));

  console.log(`[import] athleteId=${athleteId} fileSize=${file?.size ?? 0} fileName=${file?.name ?? ""} pasteLen=${pastedText.length} startDate=${startDateRaw}`);

  if (!athleteId) return { error: "Pick an athlete to assign this program to" };
  if ((!file || file.size === 0) && !pastedText) {
    return { error: "Pick a file to upload or paste your program text" };
  }

  const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, coachProfileId: coach.id } });
  if (!athlete) { console.log(`[import] athlete not found id=${athleteId} coach=${coach.id}`); return { error: "Athlete not found" }; }

  let rawText: string;
  let docFilename: string | null = null;
  let docMime: string | null = null;
  let docSource: "upload" | "paste";
  if (pastedText) {
    rawText = pastedText;
    docSource = "paste";
  } else {
    try {
      rawText = await extractText(file!);
      docFilename = file!.name || null;
      docMime = file!.type || null;
      docSource = "upload";
    } catch (e) {
      console.error("[import] extract failed", e);
      return { error: `Could not read file: ${(e as Error).message}` };
    }
  }
  if (!rawText.trim()) {
    console.log("[import] empty text after extract");
    return { error: "Document / text appears to be empty" };
  }
  console.log(`[import] extracted ${rawText.length} chars`);

  let parsed: ParsedProgram;
  try {
    parsed = await parseProgramWithAI(rawText);
    console.log(`[import] parsed: ${parsed.weeks?.length ?? 0} weeks, title="${parsed.title}"`);
  } catch (e) {
    console.error("[import] AI parse failed", e);
    return { error: (e as Error).message };
  }

  if (!parsed.weeks || parsed.weeks.length === 0) {
    console.log("[import] AI returned 0 weeks — refusing to save empty program");
    return { error: "The AI couldn't find a program structure in this document. Try a clearer format with explicit days and exercises." };
  }

  const startDate = new Date(startDateRaw);

  // Create the program tree in one transaction.
  // Larger timeout because long programs touch hundreds of rows.
  const program = await prisma.$transaction(async (tx) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + parsed.durationWeeks * 7 - 1);

    const prog = await tx.program.create({
      data: {
        athleteId: athlete.id,
        title: parsed.title,
        goal: parsed.goal ?? null,
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
            date: d.date ? new Date(d.date) : dayDate,
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
                create: b.movements.map((m, mi) => ({
                  customName: m.name,
                  prescription: {
                    sets: m.sets ?? undefined,
                    reps: m.reps ?? undefined,
                    load: m.load ?? undefined,
                    rest: m.rest ?? undefined,
                    notes: m.notes ?? undefined,
                    youtubeUrl: bestYoutubeUrl(m),
                  },
                  order: mi,
                  isTest: !!m.isTest,
                })),
              },
            },
          });
        }
      }
    }

    return prog;
  }, { timeout: 90_000, maxWait: 10_000 });

  console.log(`[import] program saved id=${program.id}`);

  // Persist the source document so the coach can re-download or re-generate later.
  try {
    await prisma.programDocument.create({
      data: {
        programId: program.id,
        filename: docFilename,
        mimeType: docMime,
        rawText,
        source: docSource,
      },
    });
    console.log("[import] document saved");
  } catch (e) {
    // Don't fail the whole import if doc persist fails — program is already there.
    console.error("[import] document save failed", e);
  }

  revalidatePath(`/`, "layout");
  console.log("[import] done");
  return { previewId: program.id };
}

// ────────────────────────────────────────────────────────────
// Regenerate program tree from a stored ProgramDocument
// ────────────────────────────────────────────────────────────

export async function regenerateProgramFromDocument(programId: string): Promise<{ error?: string; ok?: boolean }> {
  if (!aiImportEnabled()) {
    return { error: "AI program import is currently disabled." };
  }
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) return { error: "unauthorized" };
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) return { error: "no coach profile" };

  const program = await prisma.program.findFirst({
    where: { id: programId, athlete: { coachProfileId: coach.id } },
    include: { documents: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!program) return { error: "Program not found" };
  if (program.documents.length === 0) {
    return { error: "No source document is stored for this program. Re-upload or paste the original." };
  }

  const rawText = program.documents[0].rawText;

  let parsed: ParsedProgram;
  try {
    parsed = await parseProgramWithAI(rawText);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const startDate = program.startDate;

  await prisma.$transaction(async (tx) => {
    // Replace title/goal/duration if Claude returns better values
    await tx.program.update({
      where: { id: program.id },
      data: {
        title: parsed.title || program.title,
        goal: parsed.goal ?? program.goal,
        durationWeeks: parsed.durationWeeks ?? program.durationWeeks,
      },
    });

    // Wipe and rebuild the week tree
    await tx.programWeek.deleteMany({ where: { programId: program.id } });

    for (let wi = 0; wi < parsed.weeks.length; wi++) {
      const w = parsed.weeks[wi];
      const createdWeek = await tx.programWeek.create({
        data: {
          programId: program.id,
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
            date: d.date ? new Date(d.date) : dayDate,
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
                create: b.movements.map((m, mi) => ({
                  customName: m.name,
                  prescription: {
                    sets: m.sets ?? undefined,
                    reps: m.reps ?? undefined,
                    load: m.load ?? undefined,
                    rest: m.rest ?? undefined,
                    notes: m.notes ?? undefined,
                    youtubeUrl: bestYoutubeUrl(m),
                  },
                  order: mi,
                  isTest: !!m.isTest,
                })),
              },
            },
          });
        }
      }
    }
  }, { timeout: 30_000 });

  revalidatePath(`/`, "layout");
  return { ok: true };
}
