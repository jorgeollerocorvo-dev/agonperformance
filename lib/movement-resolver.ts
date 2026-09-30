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
  // exact-match only, so we fetch a superset and filter in JS. We check all
  // three localized name columns so a coach typing "sentadilla" or "‫قرفصاء‬"
  // finds the same row an English-typing coach would — matters because
  // library hits are free (curated videos), and misses fall through to
  // YouTube scraping which costs Railway egress.
  const namesArray = Array.from(uniqueNames);
  const rows = await prisma.movement.findMany({
    where: {
      isActive: true,
      OR: namesArray.flatMap((n) => [
        { nameEn: { equals: n, mode: "insensitive" as const } },
        { nameEs: { equals: n, mode: "insensitive" as const } },
        { nameAr: { equals: n, mode: "insensitive" as const } },
      ]),
    },
    select: { id: true, nameEn: true, nameEs: true, nameAr: true, videoUrl: true },
  });

  const map = new Map<string, LibraryMatch>();
  for (const r of rows) {
    // Index by every localized name so the caller's lookup key matches.
    const match: LibraryMatch = { id: r.id, nameEn: r.nameEn, videoUrl: r.videoUrl };
    if (r.nameEn) map.set(normalize(r.nameEn), match);
    if (r.nameEs) map.set(normalize(r.nameEs), match);
    if (r.nameAr) map.set(normalize(r.nameAr), match);
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
