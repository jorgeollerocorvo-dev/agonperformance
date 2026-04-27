import { prisma } from "@/lib/prisma";

/* ──────────────────────────────────────────────────────────────────────────
 * YouTube no-key search with quality + duration filter.
 *
 * - Scrapes https://www.youtube.com/results — no API key, no cost.
 * - Parses every `videoRenderer` block in `ytInitialData` and extracts
 *   id, title, channel, view count, and duration.
 * - Filters: duration ≤ MAX_DURATION_SEC (45s default per product spec).
 * - Ranks by trusted-channel whitelist > view count (popularity = quality proxy).
 * - Falls back to a slightly looser duration if no <=45s candidate exists,
 *   so users always see *something* rather than the placeholder.
 * ────────────────────────────────────────────────────────────────────────── */

const MAX_DURATION_SEC = 45; // hard preference
const SOFT_DURATION_SEC = 90; // fallback if nothing ≤ 45s

// Lower-case substrings of trusted fitness channels. If the video's channel name
// contains any of these, it gets a big quality boost in the ranking.
const TRUSTED_CHANNELS: string[] = [
  "crossfit",
  "squat university",
  "athlean-x",
  "athleanx",
  "barbend",
  "buff dudes",
  "calisthenicmovement",
  "kabuki strength",
  "atg",
  "knees over toes",
  "pamela reif",
  "chris heria",
  "jeff nippard",
  "renaissance periodization",
  "rp strength",
  "matt does fitness",
  "starting strength",
  "stronger by science",
  "tier three tactical",
  "alan thrall",
  "untamed strength",
  "scott herman",
  "strongerrx",
  "yoga with adriene",
  "pure barre",
  "the body coach",
  "hwpo",
  "mayhem athlete",
];

// Title substrings that usually indicate something we don't want
// (compilations, fail comps, gym tours, transformations).
const TITLE_BLOCKLIST: string[] = [
  "compilation",
  "fail",
  "transformation",
  "gym tour",
  "what i eat",
  "vlog",
  "reaction",
];

type ParsedYouTubeResult = {
  id: string;
  title: string;
  durationSec: number | null;
  viewCount: number | null;
  channel: string | null;
};

function parseDuration(s: string | null | undefined): number | null {
  if (!s) return null;
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function parseViews(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.match(/([\d,.]+)\s*([KMB])?/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(n)) return null;
  const suffix = (m[2] ?? "").toUpperCase();
  if (suffix === "K") n *= 1_000;
  if (suffix === "M") n *= 1_000_000;
  if (suffix === "B") n *= 1_000_000_000;
  return Math.round(n);
}

/** Find every `"videoRenderer":{...}` block, balancing braces and skipping string contents. */
function findRendererBlocks(html: string): string[] {
  const out: string[] = [];
  let i = 0;
  const tag = '"videoRenderer":{';
  while (true) {
    const start = html.indexOf(tag, i);
    if (start < 0) break;
    let j = start + tag.length;
    let depth = 1;
    while (j < html.length && depth > 0) {
      const c = html[j];
      if (c === '"') {
        j++;
        while (j < html.length && html[j] !== '"') {
          if (html[j] === "\\") j++;
          j++;
        }
      } else if (c === "{") depth++;
      else if (c === "}") depth--;
      j++;
    }
    out.push(html.slice(start, j));
    i = j;
  }
  return out;
}

/**
 * Find the first `"<key>":` in `src` after `from`, then return the first
 * `"simpleText":"…"` value that appears within `windowSize` chars after it.
 * Robust to nested objects (regex with nested-brace counting is brittle).
 */
function findSimpleText(src: string, key: string, windowSize = 800): string | null {
  const k = `"${key}":`;
  const idx = src.indexOf(k);
  if (idx < 0) return null;
  const window = src.slice(idx, idx + windowSize);
  const m = window.match(/"simpleText":"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].replace(/\\(.)/g, "$1") : null;
}

/** Like findSimpleText but pulls the first `runs[0].text` instead. */
function findRunsText(src: string, key: string, windowSize = 600): string | null {
  const k = `"${key}":`;
  const idx = src.indexOf(k);
  if (idx < 0) return null;
  const window = src.slice(idx, idx + windowSize);
  const m = window.match(/"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].replace(/\\(.)/g, "$1") : null;
}

function parseRenderer(src: string): ParsedYouTubeResult | null {
  const idMatch = src.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
  if (!idMatch) return null;
  const id = idMatch[1];

  const title = findRunsText(src, "title") ?? findSimpleText(src, "title");
  const lengthText = findSimpleText(src, "lengthText");
  const viewCountText = findSimpleText(src, "viewCountText");
  const channel =
    findRunsText(src, "longBylineText") ?? findRunsText(src, "ownerText");

  return {
    id,
    title: title ?? "",
    durationSec: parseDuration(lengthText),
    viewCount: parseViews(viewCountText),
    channel,
  };
}

function score(r: ParsedYouTubeResult): number {
  let s = 0;
  // Big boost for trusted channels
  if (r.channel) {
    const lc = r.channel.toLowerCase();
    if (TRUSTED_CHANNELS.some((t) => lc.includes(t))) s += 10_000;
  }
  // Penalize blocked title words
  const tlc = (r.title ?? "").toLowerCase();
  if (TITLE_BLOCKLIST.some((b) => tlc.includes(b))) s -= 5_000;
  // Popularity proxy — diminishing returns
  if (r.viewCount && r.viewCount > 0) s += Math.log10(r.viewCount) * 100;
  // Strong preference for short clips: tighter is better
  if (r.durationSec != null) {
    if (r.durationSec <= MAX_DURATION_SEC) s += 500;
    else if (r.durationSec <= SOFT_DURATION_SEC) s += 100;
    // tiebreak: closer to ideal 25-30s gets a tiny bonus
    s -= Math.abs(r.durationSec - 27);
  }
  return s;
}

/** Search YouTube and return the best video URL by our quality+duration ranking, or null. */
export async function findBestYoutubeVideo(query: string): Promise<string | null> {
  // No "Shorts" filter — that filter changes the renderer to `shortsLockupViewModel`
  // which doesn't expose duration or channel cleanly. Regular search covers shorts too,
  // and we filter ≤45s ourselves.
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const blocks = findRendererBlocks(html);
    const candidates = blocks
      .map(parseRenderer)
      .filter((r): r is ParsedYouTubeResult => r !== null);

    if (candidates.length === 0) return null;

    // Strict pass: duration <= 45s
    const strict = candidates.filter(
      (r) => r.durationSec != null && r.durationSec <= MAX_DURATION_SEC,
    );
    if (strict.length > 0) {
      strict.sort((a, b) => score(b) - score(a));
      return `https://www.youtube.com/watch?v=${strict[0].id}`;
    }

    // Soft pass: <= 90s
    const soft = candidates.filter(
      (r) => r.durationSec != null && r.durationSec <= SOFT_DURATION_SEC,
    );
    if (soft.length > 0) {
      soft.sort((a, b) => score(b) - score(a));
      return `https://www.youtube.com/watch?v=${soft[0].id}`;
    }

    // Last resort: any duration. Better to show a video than a gradient placeholder.
    candidates.sort((a, b) => score(b) - score(a));
    return `https://www.youtube.com/watch?v=${candidates[0].id}`;
  } catch {
    return null;
  }
}

/**
 * Get a video URL for a movement, caching the result on the Movement table.
 * Re-uses {@link findBestYoutubeVideo} so cached URLs already pass the filters.
 */
export async function ensureMovementVideoUrl(
  movementId: string | null,
  fallbackName: string,
): Promise<string | null> {
  if (movementId) {
    const m = await prisma.movement.findUnique({ where: { id: movementId } });
    if (m?.videoUrl) return m.videoUrl;
    const found = await findBestYoutubeVideo(`${m?.nameEn ?? fallbackName} exercise demo`);
    if (found) {
      await prisma.movement.update({ where: { id: movementId }, data: { videoUrl: found } });
      return found;
    }
    return null;
  }
  // Custom (non-library) movement — search but don't persist
  return await findBestYoutubeVideo(`${fallbackName} exercise demo`);
}

// Back-compat: older imports that still use the name
export { findBestYoutubeVideo as findFirstYoutubeVideo };
