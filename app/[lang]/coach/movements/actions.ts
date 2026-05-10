"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";
import { findYoutubeCandidates } from "@/lib/youtube-search";

async function assertJorge() {
  const session = await auth();
  if (!isJorge(session)) throw new Error("forbidden");
}

/**
 * Reject the current video and pick the next-best candidate.
 * Excludes the current video ID + any already-tried IDs (kept in memory only;
 * if all top candidates have been tried we wrap around).
 */
export async function rerollMovementVideo(movementId: string): Promise<{ url: string | null }> {
  await assertJorge();
  const m = await prisma.movement.findUnique({ where: { id: movementId } });
  if (!m) return { url: null };
  if (m.videoLocked) return { url: m.videoUrl }; // refuse to reroll a locked one

  const cands = await findYoutubeCandidates(`${m.nameEn} exercise demo`, 8);
  if (cands.length === 0) return { url: null };

  // Pick first candidate whose ID isn't the current one
  const currentId = (m.videoUrl ?? "").match(/v=([A-Za-z0-9_-]{11})/)?.[1] ?? null;
  const next = cands.find((c) => c.id !== currentId) ?? cands[0];
  const url = `https://www.youtube.com/watch?v=${next.id}`;
  await prisma.movement.update({
    where: { id: movementId },
    data: { videoUrl: url },
  });
  revalidatePath(`/`, "layout");
  return { url };
}

/** Toggle the lock state. Locked URLs are never replaced by the auto-resolver or reroll. */
export async function toggleMovementLock(movementId: string): Promise<{ locked: boolean }> {
  await assertJorge();
  const m = await prisma.movement.findUnique({ where: { id: movementId } });
  if (!m) return { locked: false };
  const updated = await prisma.movement.update({
    where: { id: movementId },
    data: { videoLocked: !m.videoLocked },
  });
  revalidatePath(`/`, "layout");
  return { locked: updated.videoLocked };
}

/** Hand-paste a URL (used when none of the auto-picks are good enough). */
export async function setMovementVideoUrl(movementId: string, url: string): Promise<{ ok: boolean }> {
  await assertJorge();
  const trimmed = url.trim();
  if (!trimmed) return { ok: false };
  await prisma.movement.update({
    where: { id: movementId },
    data: { videoUrl: trimmed },
  });
  revalidatePath(`/`, "layout");
  return { ok: true };
}

/** Wipe the cached URL so the next athlete view picks fresh. */
export async function clearMovementVideo(movementId: string): Promise<void> {
  await assertJorge();
  await prisma.movement.update({
    where: { id: movementId },
    data: { videoUrl: null, videoLocked: false },
  });
  revalidatePath(`/`, "layout");
}

/** Create a new movement with optional auto-searched or custom video, and optional lock. */
export async function createMovement(
  nameEn: string,
  nameEs?: string | null,
  autoSearchVideo?: boolean,
  customVideoUrl?: string | null,
  lockVideo?: boolean
): Promise<{ id: string; videoUrl: string | null; error?: string }> {
  await assertJorge();

  const trimmedEn = nameEn.trim();
  const trimmedEs = nameEs?.trim() ?? null;

  if (!trimmedEn) return { id: "", videoUrl: null, error: "Exercise name required" };

  // Generate a code from the English name (lowercase, spaces → underscores)
  const code = trimmedEn
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");

  let videoUrl: string | null = null;
  let shouldLock = false;

  // Prefer custom URL if provided, otherwise auto-search
  if (customVideoUrl) {
    videoUrl = customVideoUrl.trim();
    shouldLock = lockVideo ?? false;
  } else if (autoSearchVideo) {
    const cands = await findYoutubeCandidates(`${trimmedEn} exercise demo`, 3);
    if (cands.length > 0) {
      videoUrl = `https://www.youtube.com/watch?v=${cands[0].id}`;
    }
  }

  const movement = await prisma.movement.create({
    data: {
      nameEn: trimmedEn,
      nameEs: trimmedEs,
      code,
      videoUrl,
      videoLocked: shouldLock,
      isActive: true,
    },
  });

  revalidatePath(`/`, "layout");
  return { id: movement.id, videoUrl };
}

/**
 * Delete a movement by marking it as inactive.
 * This soft-deletes the movement while preserving program history.
 * Programs already using this movement will continue to reference it,
 * but it won't appear in new program creation or the movement library.
 */
export async function deleteMovement(movementId: string): Promise<{ ok: boolean; error?: string }> {
  await assertJorge();

  const movement = await prisma.movement.findUnique({
    where: { id: movementId },
    include: {
      programMovements: {
        include: {
          programBlock: {
            include: {
              programSession: {
                include: {
                  programWeek: {
                    include: {
                      program: {
                        include: {
                          athlete: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!movement) {
    return { ok: false, error: "Movement not found" };
  }

  // Count how many programs use this movement
  const programCount = new Set(
    movement.programMovements.map((pm) => pm.programBlock.programSession.programWeek.program.id)
  ).size;

  if (programCount > 0) {
    return {
      ok: false,
      error: `Cannot delete: ${programCount} program(s) still use this movement. Remove from programs first.`,
    };
  }

  // Safe to delete - mark as inactive
  await prisma.movement.update({
    where: { id: movementId },
    data: { isActive: false },
  });

  revalidatePath(`/`, "layout");
  return { ok: true };
}
