import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Pull every recent video from the official CrossFit YouTube channel (@crossfit),
 * try to match each one against a Movement in our library by title, and (when
 * matched) set Movement.videoUrl to the CrossFit URL and lock it.
 *
 * Approach:
 *  1. Fetch the /videos tab HTML for the channel.
 *  2. Walk each `videoRenderer` / `gridVideoRenderer` block in ytInitialData and
 *     extract { id, title, durationSec }.
 *  3. Page through with the YouTube `continuation` API up to MAX_PAGES so we get
 *     hundreds of videos rather than just the first ~30.
 *  4. For each unlocked Movement, find the best title match using token overlap
 *     against `nameEn`.
 *  5. Apply the match (Movement.videoUrl = CrossFit URL, videoLocked = true).
 *     We DO overwrite already-resolved-but-unlocked movements — the official
 *     CrossFit demo is preferable to whatever generic demo the auto-resolver picked.
 *     We DO NOT overwrite movements the user has manually locked.
 */

const MAX_PAGES = 12; // ~12 × 30 = ~360 videos
const PAGE_DELAY_MS = 1500;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

type CFVideo = { id: string; title: string; durationSec: number | null };

function parseDuration(s: string | null | undefined): number | null {
  if (!s) return null;
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function findRendererBlocks(html: string, tag: string): string[] {
  const out: string[] = [];
  const search = `"${tag}":{`;
  let i = 0;
  while (true) {
    const start = html.indexOf(search, i);
    if (start < 0) break;
    let j = start + search.length;
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

function findSimpleText(src: string, key: string, windowSize = 800): string | null {
  const idx = src.indexOf(`"${key}":`);
  if (idx < 0) return null;
  const window = src.slice(idx, idx + windowSize);
  const m = window.match(/"simpleText":"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].replace(/\\(.)/g, "$1") : null;
}

function findRunsText(src: string, key: string, windowSize = 600): string | null {
  const idx = src.indexOf(`"${key}":`);
  if (idx < 0) return null;
  const window = src.slice(idx, idx + windowSize);
  const m = window.match(/"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].replace(/\\(.)/g, "$1") : null;
}

function parseVideoBlock(src: string): CFVideo | null {
  const idMatch = src.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
  if (!idMatch) return null;
  const title =
    findRunsText(src, "title") ?? findSimpleText(src, "title");
  const dur = findSimpleText(src, "lengthText");
  return { id: idMatch[1], title: title ?? "", durationSec: parseDuration(dur) };
}

/** Pull the ytcfg blob so we can build continuation requests with the right auth keys. */
function extractYtcfg(html: string): { apiKey?: string; clientName?: string; clientVersion?: string; visitorData?: string } {
  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const clientName = html.match(/"INNERTUBE_CONTEXT_CLIENT_NAME":"?(\d+)"?/);
  const clientVersion = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/);
  const visitor = html.match(/"visitorData":"([^"]+)"/);
  return {
    apiKey: apiKeyMatch?.[1],
    clientName: clientName?.[1],
    clientVersion: clientVersion?.[1],
    visitorData: visitor?.[1],
  };
}

function extractContinuation(src: string): string | null {
  const m = src.match(/"continuationCommand":\{"token":"([^"]+)"/);
  return m ? m[1] : null;
}

async function fetchInitialPage(): Promise<{ html: string }> {
  const res = await fetch("https://www.youtube.com/@crossfit/videos", {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "CONSENT=YES+1",
    },
  });
  if (!res.ok) throw new Error(`channel fetch ${res.status}`);
  return { html: await res.text() };
}

async function fetchContinuation(token: string, cfg: ReturnType<typeof extractYtcfg>): Promise<{ json: unknown } | null> {
  if (!cfg.apiKey || !cfg.clientName || !cfg.clientVersion) return null;
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/browse?key=${cfg.apiKey}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        "X-YouTube-Client-Name": cfg.clientName,
        "X-YouTube-Client-Version": cfg.clientVersion,
        "Cookie": "CONSENT=YES+1",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: cfg.clientVersion,
            visitorData: cfg.visitorData,
          },
        },
        continuation: token,
      }),
    },
  );
  if (!res.ok) return null;
  return { json: await res.json() };
}

async function fetchAllChannelVideos(): Promise<CFVideo[]> {
  const { html } = await fetchInitialPage();
  const cfg = extractYtcfg(html);
  console.log(`[ytcfg] apiKey=${cfg.apiKey ? "✓" : "✗"} client=${cfg.clientName}/${cfg.clientVersion}`);

  const all: CFVideo[] = [];
  const seen = new Set<string>();

  // First-page videos (richItemRenderer wraps videoRenderer in channel grids)
  const firstPageBlocks = [
    ...findRendererBlocks(html, "videoRenderer"),
    ...findRendererBlocks(html, "gridVideoRenderer"),
  ];
  for (const b of firstPageBlocks) {
    const v = parseVideoBlock(b);
    if (v && !seen.has(v.id)) { seen.add(v.id); all.push(v); }
  }
  console.log(`[page 1] ${all.length} videos`);

  // Find the continuation token from the initial HTML
  let token = extractContinuation(html);
  for (let page = 2; page <= MAX_PAGES && token; page++) {
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    const result = await fetchContinuation(token, cfg);
    if (!result) break;
    const blob = JSON.stringify(result.json);
    const blocks = [
      ...findRendererBlocks(blob, "videoRenderer"),
      ...findRendererBlocks(blob, "gridVideoRenderer"),
    ];
    let added = 0;
    for (const b of blocks) {
      const v = parseVideoBlock(b);
      if (v && !seen.has(v.id)) { seen.add(v.id); all.push(v); added++; }
    }
    token = extractContinuation(blob);
    console.log(`[page ${page}] +${added} videos (total ${all.length})${token ? "" : " — last page"}`);
    if (added === 0) break;
  }

  return all;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Title matching
 * ────────────────────────────────────────────────────────────────────────── */

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "in", "to", "for", "with", "and", "or",
  "how", "tutorial", "demo", "exercise", "movement", "crossfit",
  "is", "your", "my", "by", "on", "at", "from",
]);

function tokens(s: string): string[] {
  // Keep hyphens inside words so "v-up", "z-press", "sit-up", "push-up" stay intact
  // and don't degrade into unmatchable single-letter pieces.
  return s
    .toLowerCase()
    .replace(/[^a-z0-9- ]+/g, " ")
    .split(/\s+/)
    .filter((w) => {
      if (!w || STOP_WORDS.has(w)) return false;
      // Reject lone hyphens or pure digits
      if (/^-+$/.test(w)) return false;
      // Keep if it's at least 2 alphanumeric chars total
      return w.replace(/-/g, "").length > 1;
    });
}

// Qualifier words: if a title contains any of these and the movement name does
// NOT, the title is referring to a more specific variant and we should reject
// the match. Prevents "Power clean" from matching "Hang Power Clean Cycling",
// "Bench press" from matching "Decline Bench Press", etc.
const QUALIFIERS = new Set([
  // Loading / equipment
  "hang", "block", "deficit", "tempo", "pause", "paused",
  "dumbbell", "kettlebell", "barbell", "sandbag", "trap-bar",
  "single-arm", "single-leg", "double", "half", "full", "partial",
  "banded", "weighted",
  // Style / pattern
  "strict", "kipping", "butterfly",
  "sumo", "conventional", "snatch-grip", "snatch",
  "front", "back", "overhead", "behind", "incline", "decline",
  "seated", "standing", "kneeling", "supine", "prone",
  "cossack", "bulgarian", "romanian", "split",
  "high", "low", "wide", "narrow", "close-grip", "wide-grip",
  "lying", "rear", "muscle-up", "kipping-pull-up",
  // Direction
  "lateral", "medial", "rear-foot-elevated",
  "medicine", "ghd", "wall-facing", "rebok", "abmat",
]);

/**
 * Strict title matcher.
 *
 * A video matches a movement only if:
 *   - EVERY content word of the movement name appears in the title.
 *   - The title doesn't contain a "contradictory" word (e.g., movement is
 *     "front squat" but title contains "back" → reject).
 *
 * Among all matching videos, pick the shortest title (most likely a clean
 * single-movement demo, not a long tutorial / class video).
 */
const CONTRADICTIONS: Array<[string, string[]]> = [
  ["snatch", ["clean"]],
  ["clean", ["snatch"]],
  ["front", ["back"]],
  ["back", ["front"]],
  ["incline", ["decline", "flat"]],
  ["decline", ["incline", "flat"]],
  ["overhead", ["below"]],
  ["strict", ["kip", "kipping", "butterfly"]],
  ["kipping", ["strict"]],
  ["dumbbell", ["barbell", "kettlebell"]],
  ["kettlebell", ["dumbbell", "barbell"]],
  ["barbell", ["dumbbell", "kettlebell"]],
  ["sumo", ["conventional"]],
  ["pull", ["push"]],
  ["push", ["pull"]],
  ["lateral", ["medial"]],
  ["lunge", ["squat"]],
  ["squat", ["lunge"]],
  ["press", ["pull", "row"]],
  ["row", ["press"]],
  ["seated", ["standing"]],
  ["standing", ["seated", "kneeling"]],
  ["kneeling", ["standing"]],
  ["v-up", ["muscle"]],
  ["sit-up", ["pull-up", "push-up"]],
  ["step", ["jump"]],
  ["jump", ["step"]],
];

function hasContradictionAgainst(movementTokens: Set<string>, titleTokens: Set<string>): boolean {
  for (const [tag, against] of CONTRADICTIONS) {
    if (movementTokens.has(tag)) {
      for (const bad of against) {
        if (titleTokens.has(bad)) return true;
      }
    }
  }
  return false;
}

function bestMatch(movementName: string, videos: CFVideo[]): CFVideo | null {
  const movementTokens = new Set(tokens(movementName));
  if (movementTokens.size === 0) return null;

  const candidates: { v: CFVideo; titleSize: number }[] = [];
  for (const v of videos) {
    const titleTokens = new Set(tokens(v.title));
    if (titleTokens.size === 0) continue;

    // Strict: every movement token must be in the title
    let allPresent = true;
    for (const w of movementTokens) {
      if (!titleTokens.has(w)) { allPresent = false; break; }
    }
    if (!allPresent) continue;

    // Reject contradictory variants (front vs back, snatch vs clean, etc.)
    if (hasContradictionAgainst(movementTokens, titleTokens)) continue;

    // Reject if title has qualifier words that the movement name doesn't.
    // E.g., movement "Power clean" must NOT match "Hang Power Clean".
    let qualifierMismatch = false;
    for (const t of titleTokens) {
      if (QUALIFIERS.has(t) && !movementTokens.has(t)) {
        qualifierMismatch = true;
        break;
      }
    }
    if (qualifierMismatch) continue;

    candidates.push({ v, titleSize: titleTokens.size });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.titleSize - b.titleSize);
  return candidates[0].v;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Main
 * ────────────────────────────────────────────────────────────────────────── */

(async () => {
  console.log("Fetching all videos from @crossfit…");
  const videos = await fetchAllChannelVideos();
  console.log(`\n→ Pulled ${videos.length} videos from @crossfit\n`);

  // Sample sanity check
  console.log("Sample titles:");
  for (const v of videos.slice(0, 8)) console.log(`  · ${v.title}  (${v.durationSec ?? "?"}s)`);
  console.log();

  const movements = await prisma.movement.findMany({
    where: { isActive: true, videoLocked: false },
  });

  console.log(`Matching against ${movements.length} unlocked movements…\n`);

  let matched = 0;
  let skipped = 0;
  for (const m of movements) {
    const hit = bestMatch(m.nameEn, videos);
    if (!hit) { skipped++; continue; }
    const url = `https://www.youtube.com/watch?v=${hit.id}`;
    if (m.videoUrl === url) {
      // Already pointing at this exact video — just lock it.
      await prisma.movement.update({
        where: { id: m.id },
        data: { videoLocked: true },
      });
    } else {
      await prisma.movement.update({
        where: { id: m.id },
        data: { videoUrl: url, videoLocked: true },
      });
    }
    matched++;
    console.log(`  ✓ ${m.nameEn.padEnd(45)} → "${hit.title}"`);
  }

  console.log(`\n✓ Matched + locked: ${matched}`);
  console.log(`  No CrossFit match: ${skipped}`);

  await prisma.$disconnect();
})();
