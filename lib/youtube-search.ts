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

/**
 * Search YouTube and return up to N best video candidates ranked by our quality+duration scoring.
 * Used by the admin panel to offer alternatives ("X" reroll button).
 */
export async function findYoutubeCandidates(query: string, limit = 6): Promise<{ id: string; title: string; durationSec: number | null; channel: string | null }[]> {
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
    if (!res.ok) return [];
    const html = await res.text();
    const blocks = findRendererBlocks(html);
    const candidates = blocks.map(parseRenderer).filter((r): r is ParsedYouTubeResult => r !== null);
    candidates.sort((a, b) => score(b) - score(a));
    return candidates.slice(0, limit).map((c) => ({
      id: c.id,
      title: c.title,
      durationSec: c.durationSec,
      channel: c.channel,
    }));
  } catch {
    return [];
  }
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
          process.env.YT_USER_AGENT ??
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        // Pretend we already accepted the EU consent so YouTube doesn't redirect us
        // to consent.youtube.com (which has no search results).
        "Cookie": "CONSENT=YES+; SOCS=CAI",
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
 *
 * Locked URLs (videoLocked = true) are returned unchanged — the admin can pin a
 * curated demo and the auto-resolver leaves it alone forever.
 */
// Cache empty-search-result attempts for this long before re-hitting YouTube.
// A movement with no video that we already couldn't resolve doesn't need to
// be rechecked on every page load — that's the biggest source of Railway
// egress + wasted CPU in the current design.
const NEGATIVE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

export async function ensureMovementVideoUrl(
  movementId: string | null,
  fallbackName: string,
): Promise<string | null> {
  if (movementId) {
    const m = await prisma.movement.findUnique({ where: { id: movementId } });
    if (m?.videoUrl) return m.videoUrl;
    // Negative-cache: if the last attempt (updatedAt) was within a week and
    // still produced nothing, skip re-hitting YouTube — that call is the
    // single largest cost driver on athlete page loads.
    if (m && Date.now() - new Date(m.updatedAt ?? m.createdAt).getTime() < NEGATIVE_CACHE_MS) {
      return null;
    }
    const found = await findBestYoutubeVideo(`${m?.nameEn ?? fallbackName} exercise demo`);
    // Always bump updatedAt (via the update below) so a null result still
    // starts the 7-day cooldown.
    await prisma.movement.update({
      where: { id: movementId },
      data: found ? { videoUrl: found } : { updatedAt: new Date() },
    });
    return found;
  }
  // Custom (non-library) movement — search but don't persist.
  return await findBestYoutubeVideo(`${fallbackName} exercise demo`);
}

/**
 * Batched equivalent of `ensureMovementVideoUrl` for a set of (movementId,
 * name) pairs — one Movement.findMany up front so N athlete-page movements
 * don't fire N SELECTs, then YouTube fallback only for the (few) rows that
 * are actually missing videos AND outside the negative-cache window.
 *
 * Returns a Map keyed by whatever the caller uses as `key` in each pair.
 */
export async function ensureMovementVideoUrls<K>(
  pairs: { key: K; movementId: string | null; fallbackName: string }[],
): Promise<Map<K, string | null>> {
  const out = new Map<K, string | null>();
  const ids = Array.from(new Set(pairs.map((p) => p.movementId).filter((id): id is string => !!id)));
  const rows = ids.length
    ? await prisma.movement.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameEn: true, videoUrl: true, updatedAt: true, createdAt: true },
      })
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const now = Date.now();
  // Only the pairs that still need a YouTube hit.
  const misses: { key: K; movementId: string | null; name: string }[] = [];
  for (const p of pairs) {
    const row = p.movementId ? byId.get(p.movementId) : null;
    if (row?.videoUrl) {
      out.set(p.key, row.videoUrl);
      continue;
    }
    if (row && now - new Date(row.updatedAt ?? row.createdAt).getTime() < NEGATIVE_CACHE_MS) {
      out.set(p.key, null);
      continue;
    }
    out.set(p.key, null);
    misses.push({ key: p.key, movementId: p.movementId, name: row?.nameEn ?? p.fallbackName });
  }
  // Run misses in parallel, but keep the number small — an athlete page with
  // 50 unresolved movements shouldn't burst 50 YouTube requests. Cap at 5.
  const capped = misses.slice(0, 5);
  const results = await Promise.allSettled(
    capped.map(async (m) => ({ key: m.key, id: m.movementId, url: await findBestYoutubeVideo(`${m.name} exercise demo`) })),
  );
  const toPersist: { id: string; url: string | null }[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    if (r.value.url) out.set(r.value.key, r.value.url);
    if (r.value.id) toPersist.push({ id: r.value.id, url: r.value.url });
  }
  // Persist in parallel — small burst of UPDATEs is fine.
  await Promise.allSettled(
    toPersist.map((t) =>
      prisma.movement.update({
        where: { id: t.id },
        data: t.url ? { videoUrl: t.url } : { updatedAt: new Date() },
      }),
    ),
  );
  return out;
}

// Back-compat: older imports that still use the name
export { findBestYoutubeVideo as findFirstYoutubeVideo };

/**
 * Given a free-text movement name, either return the matching Movement library
 * entry (case-insensitive across nameEn/nameEs/nameAr) or create a new one
 * whose videoUrl is a real YouTube video discovered via findBestYoutubeVideo.
 *
 * Used when the coach renames a movement in the program builder: if the new
 * name doesn't already exist in the library, we bootstrap a library entry
 * (with a real video) so the program row can point its movementId at it and
 * the joined videoUrl works everywhere reads happen.
 *
 * Returns null only if the name is empty. Otherwise always returns an id
 * (videoUrl may still be null if YouTube search found nothing).
 */
export async function resolveOrCreateMovementByName(
  name: string,
): Promise<{ id: string; videoUrl: string | null } | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const q = trimmed.toLowerCase();

  // Case-insensitive exact match against any of the localized names.
  const existing = await prisma.movement.findFirst({
    where: {
      OR: [
        { nameEn: { equals: trimmed, mode: "insensitive" } },
        { nameEs: { equals: trimmed, mode: "insensitive" } },
        { nameAr: { equals: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, videoUrl: true, videoLocked: true, updatedAt: true, createdAt: true },
  });
  if (existing) {
    if (existing.videoUrl || existing.videoLocked) {
      return { id: existing.id, videoUrl: existing.videoUrl };
    }
    // Negative-cache: don't re-search YouTube for a library row we just tried.
    if (Date.now() - new Date(existing.updatedAt ?? existing.createdAt).getTime() < NEGATIVE_CACHE_MS) {
      return { id: existing.id, videoUrl: null };
    }
    const found = await findBestYoutubeVideo(`${trimmed} exercise demo`);
    await prisma.movement.update({
      where: { id: existing.id },
      data: found ? { videoUrl: found } : { updatedAt: new Date() },
    });
    return { id: existing.id, videoUrl: found };
  }

  // No library entry yet — search YouTube then bootstrap the library.
  const found = await findBestYoutubeVideo(`${trimmed} exercise demo`);
  const code = q.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || `custom_${Date.now()}`;

  // Race-safe upsert on the unique `code` — two coaches saving the same new
  // name concurrently should converge on one row, not throw.
  const created = await prisma.movement.upsert({
    where: { code },
    update: found ? { videoUrl: found } : {},
    create: { code, nameEn: trimmed, videoUrl: found },
    select: { id: true, videoUrl: true },
  });
  return created;
}
