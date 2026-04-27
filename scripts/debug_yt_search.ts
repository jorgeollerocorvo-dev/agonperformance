import { findBestYoutubeVideo } from "@/lib/youtube-search";

(async () => {
  const queries = [
    "back squat exercise demo",
    "pigeon pose exercise demo",
    "wall sit exercise demo",
    "kettlebell swing exercise demo",
    "thruster exercise demo",
  ];
  for (const q of queries) {
    const start = Date.now();
    const url = await findBestYoutubeVideo(q);
    console.log(`${q}\n  → ${url ?? "NULL"}   (${Date.now() - start}ms)`);
  }
})();
