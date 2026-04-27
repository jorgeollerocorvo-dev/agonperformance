// Quick smoke test with the new Cookie + UA headers, 5 queries, 3s apart
import { findBestYoutubeVideo } from "../lib/youtube-search";

const queries = [
  "back squat exercise demo",
  "deadlift exercise demo",
  "bench press exercise demo",
  "pigeon pose exercise demo",
  "lat stretch exercise demo",
];

(async () => {
  for (const q of queries) {
    const t0 = Date.now();
    const url = await findBestYoutubeVideo(q);
    console.log(`${q.padEnd(40)} → ${url ?? "NULL"} (${Date.now() - t0}ms)`);
    await new Promise((r) => setTimeout(r, 3000));
  }
})();
