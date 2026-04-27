import { PrismaClient } from "@prisma/client";
import { findBestYoutubeVideo } from "../lib/youtube-search";

const prisma = new PrismaClient();

/**
 * One-time backfill: walk every Movement row with no cached videoUrl,
 * find the best <=45s demo per the existing filter (trusted channels,
 * popularity, blocklist), and persist it. Locked rows are skipped.
 *
 * Re-runnable: only touches rows where videoUrl is still null.
 */

// YouTube blocks fast scraping — this delay stays under their rate limit.
// 5s × 332 ≈ 28 min for a full backfill. Rerun-able (only fills nulls).
const DELAY_MS = 3000;
const PROGRESS_EVERY = 5;
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const todo = await prisma.movement.findMany({
    where: { isActive: true, videoUrl: null, videoLocked: false },
    orderBy: [{ category: "asc" }, { nameEn: "asc" }],
  });

  console.log(`Resolving videos for ${todo.length} movements…\n`);

  let resolved = 0;
  let missed = 0;
  const startedAt = Date.now();

  for (let i = 0; i < todo.length; i++) {
    const m = todo[i];
    const t0 = Date.now();
    // Rotate User-Agent across requests to look less robotic
    process.env.YT_USER_AGENT = USER_AGENTS[i % USER_AGENTS.length];
    const url = await findBestYoutubeVideo(`${m.nameEn} exercise demo`);

    if (url) {
      await prisma.movement.update({ where: { id: m.id }, data: { videoUrl: url } });
      resolved++;
    } else {
      missed++;
    }

    if ((i + 1) % PROGRESS_EVERY === 0 || i === todo.length - 1) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`  [${i + 1}/${todo.length}] ${resolved} resolved, ${missed} missed (${elapsed}s)`);
    }

    const tookThisRow = Date.now() - t0;
    if (tookThisRow < DELAY_MS) await sleep(DELAY_MS - tookThisRow);
  }

  console.log(`\n✓ Done. ${resolved} resolved, ${missed} missed.`);
  await prisma.$disconnect();
})();
