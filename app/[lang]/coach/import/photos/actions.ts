"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseWorkoutPhoto, type ParsedWorkoutPhoto } from "@/lib/ai-parse-workout-photo";
import { resolveLibraryMovements } from "@/lib/movement-resolver";
import { resolveOrCreateMovementByName } from "@/lib/youtube-search";

export type PhotoImportResult = {
  ok: boolean;
  perPhoto: Array<{
    filename: string;
    error?: string;
    date?: string | null;
    exerciseCount?: number;
    targetProgramId?: string;
  }>;
};

const MAX_PHOTOS = 12;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB per photo — Gemini vision limit is ~20MB but we're being tight for Railway egress
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * Ingest 1..N workout-log photos for a single athlete. Each photo is parsed
 * independently in parallel, then each resulting session is written on its
 * own date. Weights land as movement-level notes so the athlete's calendar
 * shows exactly what they lifted — like a personal trainer's notebook.
 */
export async function importWorkoutPhotos(formData: FormData): Promise<PhotoImportResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, perPhoto: [{ filename: "-", error: "Not authenticated" }] };

  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) return { ok: false, perPhoto: [{ filename: "-", error: "Coach profile not found" }] };

  const athleteId = String(formData.get("athleteId") ?? "");
  if (!athleteId) return { ok: false, perPhoto: [{ filename: "-", error: "Pick an athlete first" }] };

  const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, coachProfileId: coach.id } });
  if (!athlete) return { ok: false, perPhoto: [{ filename: "-", error: "Athlete not found" }] };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, perPhoto: [{ filename: "-", error: "No photos uploaded" }] };
  if (files.length > MAX_PHOTOS) {
    return { ok: false, perPhoto: [{ filename: "-", error: `Max ${MAX_PHOTOS} photos per upload` }] };
  }

  // Parse every photo in parallel — Gemini's free tier handles concurrent
  // requests fine and the coach shouldn't wait N × latency for a notebook.
  const parseResults = await Promise.all(
    files.map(async (file) => {
      const filename = file.name || "photo";
      try {
        if (file.size > MAX_BYTES) {
          return { filename, error: `Photo exceeds ${Math.round(MAX_BYTES / 1024 / 1024)}MB` } as const;
        }
        if (!ACCEPTED.includes(file.type)) {
          return { filename, error: `Unsupported image type: ${file.type || "unknown"}` } as const;
        }
        const buf = Buffer.from(await file.arrayBuffer());
        const base64 = buf.toString("base64");
        // Gemini/Anthropic reject heic/heif — the browser typically auto-
        // converts on upload but on iOS-native paths this can slip through.
        // Coach sees a clear error and can re-export as JPEG.
        const mimeType = file.type === "image/heic" || file.type === "image/heif" ? "image/jpeg" : file.type;
        const parsed = await parseWorkoutPhoto({ base64, mimeType });
        return { filename, parsed } as const;
      } catch (e) {
        return { filename, error: (e as Error).message } as const;
      }
    }),
  );

  // Second pass: persist each successful parse. Sequential (not parallel) to
  // avoid clobbering the same ProgramSession if two photos share a date.
  const perPhoto: PhotoImportResult["perPhoto"] = [];
  let touchedProgramId: string | null = null;
  for (const r of parseResults) {
    if ("error" in r) {
      perPhoto.push({ filename: r.filename, error: r.error });
      continue;
    }
    if (!r.parsed.date) {
      perPhoto.push({ filename: r.filename, error: "No date detected in the photo — retake with the date visible or type it manually." });
      continue;
    }
    if (r.parsed.exercises.length === 0) {
      perPhoto.push({ filename: r.filename, error: "No exercises detected — is this a workout log?" });
      continue;
    }
    try {
      const programId = await persistParsedPhoto(coach.id, athleteId, r.parsed);
      touchedProgramId = programId;
      perPhoto.push({
        filename: r.filename,
        date: r.parsed.date,
        exerciseCount: r.parsed.exercises.length,
        targetProgramId: programId,
      });
    } catch (e) {
      perPhoto.push({ filename: r.filename, error: (e as Error).message });
    }
  }

  if (touchedProgramId) {
    revalidatePath(`/[lang]/coach/programs/${touchedProgramId}`, "page");
  }
  const ok = perPhoto.some((p) => !p.error);
  return { ok, perPhoto };
}

async function persistParsedPhoto(
  coachId: string,
  athleteId: string,
  parsed: ParsedWorkoutPhoto,
): Promise<string> {
  const date = new Date(parsed.date!);

  // Step 1: resolve/attach to a program that owns a week covering this date.
  // Reuse the athlete's most recent program; if none exists, create a
  // "Training log" program starting on this date. Same pattern as
  // copyDayToAthlete so the layout math (startDate + wi*7) works.
  let program = await prisma.program.findFirst({
    where: { athleteId },
    orderBy: { createdAt: "desc" },
    include: { weeks: true },
  });
  if (!program) {
    program = await prisma.program.create({
      data: {
        athleteId,
        title: "Training log",
        startDate: date,
        weeks: { create: [{ weekNumber: 1, weekLabel: "W1" }] },
      },
      include: { weeks: true },
    });
  }
  const daysDiff = Math.floor((date.getTime() - new Date(program.startDate).getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.max(1, Math.floor(daysDiff / 7) + 1);
  let week = program.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) {
    week = await prisma.programWeek.create({
      data: { programId: program.id, weekNumber, weekLabel: `W${weekNumber}` },
    });
  }

  // Step 2: find or create the ProgramSession on that date. If one exists,
  // we WIPE its blocks first — the photo is the source of truth for what
  // actually happened. Session-level notes are merged, not replaced.
  let target = await prisma.programSession.findFirst({
    where: {
      date,
      programWeek: { program: { athleteId } },
    },
  });
  if (!target) {
    target = await prisma.programSession.create({
      data: {
        programWeekId: week.id,
        date,
      },
    });
  }

  // Step 3: resolve every exercise name against the library so videos come
  // along for free (library-hit is deterministic + $0). Names still unmatched
  // fall through to resolveOrCreateMovementByName which library-checks again
  // then hits YouTube once as a bootstrap, cached forever on the row.
  const names = parsed.exercises.map((e) => e.name).filter(Boolean);
  const libraryMatches = await resolveLibraryMovements(names);
  const resolvedIds = new Map<string, string | null>();
  for (const name of names) {
    const norm = name.toLowerCase().trim();
    const hit = libraryMatches.get(norm);
    if (hit) {
      resolvedIds.set(name, hit.id);
      continue;
    }
    try {
      const boot = await resolveOrCreateMovementByName(name);
      resolvedIds.set(name, boot?.id ?? null);
    } catch {
      resolvedIds.set(name, null);
    }
  }

  // Step 4: write the session. Wipe existing blocks, then create a single
  // block per exercise (photos rarely encode a block structure — the block
  // wrapper is just there so ProgramMovement can hang off it).
  await prisma.$transaction(async (tx) => {
    await tx.programBlock.deleteMany({ where: { programSessionId: target!.id } });

    // One block per exercise keeps the UI clean; blockCode A/B/C…
    const blockRows = await tx.programBlock.createManyAndReturn({
      data: parsed.exercises.map((ex, i) => ({
        programSessionId: target!.id,
        blockCode: String.fromCharCode(65 + Math.min(i, 25)),
        label: null,
        format: null,
        restSec: null,
        notes: null,
        order: i,
      })),
      select: { id: true, order: true },
    });
    const blockIdByOrder = new Map(blockRows.map((b) => [b.order, b.id]));

    const movementRows = parsed.exercises.map((ex, i) => {
      const blockId = blockIdByOrder.get(i)!;
      const movementId = resolvedIds.get(ex.name) ?? null;
      // The weight the athlete actually used lives as notes on the movement
      // — exactly like a coach jotting "hit 82.5kg for 5" in their notebook.
      const loadLine = ex.load ? `Load: ${ex.load}` : null;
      const notesLine = ex.notes || null;
      const notes = [loadLine, notesLine].filter(Boolean).join(" · ") || null;
      return {
        programBlockId: blockId,
        movementId,
        customName: movementId ? null : ex.name,
        prescription: {
          sets: ex.sets ?? undefined,
          reps: ex.reps ?? undefined,
          load: ex.load ?? undefined,
          rest: ex.rest ?? undefined,
          notes: notes ?? undefined,
        } as object,
        order: i,
        isTest: false,
      };
    });
    if (movementRows.length > 0) {
      await tx.programMovement.createMany({ data: movementRows });
    }

    await tx.programSession.update({
      where: { id: target!.id },
      data: {
        focus: parsed.focus ?? target!.focus,
        notes: parsed.sessionNotes ?? target!.notes,
      },
    });
  }, { timeout: 30_000, maxWait: 5_000 });

  return program.id;
}
