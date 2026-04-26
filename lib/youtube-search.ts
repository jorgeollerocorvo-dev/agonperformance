import { prisma } from "@/lib/prisma";

/**
 * Find the first YouTube video matching a query, with no API key.
 *
 * Strategy: scrape https://www.youtube.com/results — the HTML embeds a JSON blob
 * (`var ytInitialData = ...`) that contains the search results. We extract the first
 * 11-character `videoId`. Cached at the Next.js fetch level for 1 day per query.
 *
 * Returns a canonical https://www.youtube.com/watch?v=ID URL, or null on failure.
 */
export async function findFirstYoutubeVideo(query: string): Promise<string | null> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 60 * 60 * 24 }, // 1 day
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // The first plausible 11-char videoId in ytInitialData is the top result.
    // Skip mix/playlist results which use different keys.
    const match = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : null;
  } catch {
    return null;
  }
}

/**
 * Get a video URL for a movement, caching the result on the Movement table.
 *
 * Lookup priority:
 *   1. The Movement library's `videoUrl` if already set (fastest path, no fetch)
 *   2. Scrape YouTube search for `<movementName> exercise demo`, then persist on the row.
 *
 * If the scrape fails or no Movement row exists (custom movement), returns null
 * and the UI falls back to a placeholder card.
 */
export async function ensureMovementVideoUrl(
  movementId: string | null,
  fallbackName: string,
): Promise<string | null> {
  if (movementId) {
    const m = await prisma.movement.findUnique({ where: { id: movementId } });
    if (m?.videoUrl) return m.videoUrl;
    const found = await findFirstYoutubeVideo(`${m?.nameEn ?? fallbackName} exercise demo`);
    if (found) {
      await prisma.movement.update({ where: { id: movementId }, data: { videoUrl: found } });
      return found;
    }
    return null;
  }
  // Custom (non-library) movement — search but don't persist
  return await findFirstYoutubeVideo(`${fallbackName} exercise demo`);
}
