"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/parse-document";
import { parseProgramWithAI, movementYoutubeSearchUrl, type ParsedProgram } from "@/lib/ai-parse-program";

export async function importAndCreateProgram(formData: FormData): Promise<{ error?: string; previewId?: string }> {
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) return { error: "unauthorized" };
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) return { error: "no coach profile" };

  const file = formData.get("file") as File | null;
  const athleteId = String(formData.get("athleteId") ?? "");
  const startDateRaw = String(formData.get("startDate") ?? new Date().toISOString().slice(0, 10));

  if (!file || file.size === 0) return { error: "Pick a file to upload" };
  if (!athleteId) return { error: "Pick an athlete to assign this program to" };

  const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, coachProfileId: coach.id } });
  if (!athlete) return { error: "Athlete not found" };

  let rawText: string;
  try {
    rawText = await extractText(file);
  } catch (e) {
    return { error: `Could not read file: ${(e as Error).message}` };
  }
  if (!rawText.trim()) return { error: "Document appears to be empty" };

  let parsed: ParsedProgram;
  try {
    parsed = await parseProgramWithAI(rawText);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const startDate = new Date(startDateRaw);

  // Create the program tree in one transaction
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
                    youtubeUrl: movementYoutubeSearchUrl(m.name),
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
  }, { timeout: 30_000 });

  revalidatePath(`/`, "layout");
  return { previewId: program.id };
}
