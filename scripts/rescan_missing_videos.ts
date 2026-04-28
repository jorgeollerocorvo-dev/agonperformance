import { PrismaClient } from "@prisma/client";
import { findYoutubeCandidates } from "../lib/youtube-search";

const prisma = new PrismaClient();

/**
 * Second-pass resolver for movements that came back empty on the first pass.
 *
 * Strategy: try multiple query variants per movement, prefer the official
 * CrossFit channel ("CrossFit®"), accept up to 120s, and only persist a URL
 * if at least one variant returned a candidate.
 *
 * - Skips locked movements (user-pinned).
 * - Skips movements that already have a videoUrl (don't disturb earlier picks).
 */

const DELAY_MS = 3000;
const MAX_SEC = 120;

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];

const CROSSFIT_CHANNEL_KEYWORDS = ["crossfit"]; // matches "CrossFit®", "CrossFit Inc.", etc.

function isCrossFitChannel(channel: string | null): boolean {
  if (!channel) return false;
  const lc = channel.toLowerCase();
  return CROSSFIT_CHANNEL_KEYWORDS.some((k) => lc.includes(k));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const todo = await prisma.movement.findMany({
    where: { isActive: true, videoUrl: null, videoLocked: false },
    orderBy: [{ category: "asc" }, { nameEn: "asc" }],
  });

  console.log(`Re-scanning ${todo.length} movements with CrossFit preference + variants…\n`);

  let resolved = 0;
  let stillMissing = 0;
  const startedAt = Date.now();

  for (let i = 0; i < todo.length; i++) {
    const m = todo[i];
    process.env.YT_USER_AGENT = USER_AGENTS[i % USER_AGENTS.length];

    // Try a few query shapes; collect every candidate from each.
    const variants = [
      `${m.nameEn} crossfit`,            // CrossFit-tagged search
      `${m.nameEn} crossfit movement`,
      `crossfit ${m.nameEn}`,
      `${m.nameEn} demo`,
      `${m.nameEn} technique`,
    ];

    type Cand = { id: string; durationSec: number | null; channel: string | null; queryUsed: string };
    const all: Cand[] = [];
    for (const q of variants) {
      const cands = await findYoutubeCandidates(q, 8);
      for (const c of cands) all.push({ ...c, queryUsed: q });
      await sleep(DELAY_MS);
    }

    if (all.length === 0) {
      stillMissing++;
      console.log(`  [${i + 1}/${todo.length}] ✗ ${m.nameEn} — no candidates from any variant`);
      continue;
    }

    // Filter ≤120s; rank: CrossFit channel > shorter duration > earlier in list
    const filtered = all.filter((c) => c.durationSec == null || c.durationSec <= MAX_SEC);
    const pool = filtered.length > 0 ? filtered : all;

    pool.sort((a, b) => {
      const aCF = isCrossFitChannel(a.channel) ? 1 : 0;
      const bCF = isCrossFitChannel(b.channel) ? 1 : 0;
      if (aCF !== bCF) return bCF - aCF;
      const aDur = a.durationSec ?? 999;
      const bDur = b.durationSec ?? 999;
      return aDur - bDur;
    });

    // De-dupe: if multiple variants surfaced the same id, only count it once.
    const seen = new Set<string>();
    const ranked = pool.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    const pick = ranked[0];
    const url = `https://www.youtube.com/watch?v=${pick.id}`;
    await prisma.movement.update({ where: { id: m.id }, data: { videoUrl: url } });
    resolved++;

    const cfTag = isCrossFitChannel(pick.channel) ? " ⭐CrossFit" : "";
    const durTag = pick.durationSec != null ? `${pick.durationSec}s` : "?";
    if ((i + 1) % 5 === 0 || i === todo.length - 1) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      console.log(`  [${i + 1}/${todo.length}] ${resolved} resolved, ${stillMissing} still missing (${elapsed}s)`);
    } else {
      console.log(`    ✓ ${m.nameEn} → ${pick.channel ?? "?"} · ${durTag}${cfTag}`);
    }
  }

  console.log(`\n✓ Done. ${resolved} new resolutions, ${stillMissing} still missing out of ${todo.length}.`);
  await prisma.$disconnect();
})();
