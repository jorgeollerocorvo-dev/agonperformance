import { prisma } from "@/lib/prisma";

/**
 * Match a list of free-text movement names against the Movement library.
 *
 * Used by every code path that PERSISTS a program (manual save, AI new program,
 * AI progression week, document import) so a movement the coach typed
 * — "Back squat" — links to the library row and inherits its locked videoUrl.
 *
 * Matching is case-insensitive, ignores extra whitespace, and falls back to
 * trying without trailing punctuation. Movements that don't match return
 * undefined and the caller should keep them as customName + a search URL.
 */
export type LibraryMatch = {
  id: string;
  nameEn: string;
  /** The curated (possibly locked) video URL stored on the library row. */
  videoUrl: string | null;
};

const normalize = (s: string): string =>
  s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,;:!?]+$/g, "");

export async function resolveLibraryMovements(
  rawNames: Iterable<string>,
): Promise<Map<string, LibraryMatch>> {
  const uniqueNames = new Set<string>();
  for (const n of rawNames) {
    const norm = normalize(n);
    if (norm) uniqueNames.add(norm);
  }
  if (uniqueNames.size === 0) return new Map();

  // Case-insensitive `in` requires per-row OR'd `equals`. Prisma's `in` is
  // exact-match only, so we fetch a superset and filter in JS.
  const rows = await prisma.movement.findMany({
    where: {
      isActive: true,
      OR: Array.from(uniqueNames).map((n) => ({
        nameEn: { equals: n, mode: "insensitive" as const },
      })),
    },
    select: { id: true, nameEn: true, videoUrl: true },
  });

  const map = new Map<string, LibraryMatch>();
  for (const r of rows) {
    map.set(normalize(r.nameEn), r);
  }
  return map;
}

/**
 * Fetch a compact list of library movement names to inject into the AI prompt
 * as a hint, so the model tends to pick names that will resolve cleanly.
 *
 * Trimmed to ~300 names max to keep the prompt under ~6k tokens of overhead.
 */
export async function listLibraryMovementNames(limit = 300): Promise<string[]> {
  const rows = await prisma.movement.findMany({
    where: { isActive: true },
    select: { nameEn: true },
    orderBy: [{ category: "asc" }, { nameEn: "asc" }],
    take: limit,
  });
  return rows.map((r) => r.nameEn);
}
