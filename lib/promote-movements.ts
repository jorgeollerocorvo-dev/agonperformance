import { prisma } from "@/lib/prisma";
import { isYoutubeSearch } from "@/lib/youtube";

/**
 * Standard #4 — auto-promote stable movements into the coach's own library.
 *
 * If a ProgramMovement has been in a client's program for more than 24h AND
 * has a resolved YouTube demo URL (either via the Movement library join or
 * via the prescription.youtubeUrl override), copy it into the coach's
 * CoachMovement library so future programs find it in the library-first
 * sweep.
 *
 * Design points:
 * - Runs as a fire-and-forget side-effect on coach-side page loads (no cron
 *   cost, no new worker process).
 * - Caps itself at MAX_PROMOTIONS per invocation so a coach with 1000s of
 *   unseen movements doesn't blow up a single request.
 * - De-dupes by (coachProfileId, code) via CoachMovement's unique index,
 *   using upsert — safe to run concurrently from multiple tabs.
 * - Never throws: the caller passes `void promoteStableMovementsToCoachLibrary(...)`
 *   and treats failures as a no-op.
 */

const PROMOTION_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_PROMOTIONS = 25;

export async function promoteStableMovementsToCoachLibrary(coachProfileId: string): Promise<number> {
  const cutoff = new Date(Date.now() - PROMOTION_AGE_MS);
  try {
    // Pull candidate movements: belong to one of this coach's athletes'
    // programs, older than 24h, and either library-linked (so videoUrl can
    // be joined) or have a prescription.youtubeUrl set.
    const candidates = await prisma.programMovement.findMany({
      where: {
        createdAt: { lt: cutoff },
        programBlock: {
          programSession: {
            programWeek: {
              program: { athlete: { coachProfileId } },
            },
          },
        },
      },
      select: {
        movementId: true,
        customName: true,
        prescription: true,
        movement: { select: { nameEn: true, videoUrl: true } },
      },
      take: 500, // cap read; the inner filter + dedup trims further
    });

    // De-dupe to (name, videoUrl) pairs where both are present.
    type Pair = { name: string; videoUrl: string };
    const uniquePairs = new Map<string, Pair>();
    for (const row of candidates) {
      const libVideo = row.movement?.videoUrl ?? null;
      const presc = (row.prescription ?? {}) as Record<string, unknown>;
      const rawPresc = typeof presc.youtubeUrl === "string" ? presc.youtubeUrl : null;
      const prescVideo = rawPresc && !isYoutubeSearch(rawPresc) ? rawPresc : null;
      const videoUrl = libVideo ?? prescVideo;
      if (!videoUrl) continue;

      const name = row.movement?.nameEn ?? row.customName;
      if (!name || !name.trim()) continue;

      const key = name.toLowerCase().trim();
      if (!uniquePairs.has(key)) uniquePairs.set(key, { name: name.trim(), videoUrl });
      if (uniquePairs.size >= MAX_PROMOTIONS) break;
    }

    if (uniquePairs.size === 0) return 0;

    // Check which codes already exist in this coach's library so we don't
    // churn unnecessary writes.
    const codes = Array.from(uniquePairs.values()).map((p) => toCode(p.name));
    const existing = await prisma.coachMovement.findMany({
      where: { coachProfileId, code: { in: codes } },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((e) => e.code));

    let promoted = 0;
    for (const pair of uniquePairs.values()) {
      const code = toCode(pair.name);
      if (existingCodes.has(code)) continue;
      try {
        await prisma.coachMovement.create({
          data: {
            coachProfileId,
            code,
            nameEn: pair.name,
            videoUrl: pair.videoUrl,
            isActive: true,
          },
        });
        promoted++;
      } catch {
        // Unique conflict from a concurrent run — ignore.
      }
    }
    return promoted;
  } catch {
    return 0;
  }
}

function toCode(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || `custom_${Date.now()}`;
}
