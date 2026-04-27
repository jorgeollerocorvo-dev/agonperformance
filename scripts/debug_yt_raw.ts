(async () => {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent("back squat demo")}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  console.log(`status=${res.status}, ok=${res.ok}`);
  const html = await res.text();
  console.log(`html length: ${html.length}`);

  const renderers = ["videoRenderer", "reelItemRenderer", "compactVideoRenderer", "shortsLockupViewModel", "lockupViewModel"];
  for (const r of renderers) {
    const count = (html.match(new RegExp(`"${r}":\\{`, "g")) ?? []).length;
    console.log(`  ${r}: ${count} occurrences`);
  }

  const ids = [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].slice(0, 5);
  console.log(`First few videoIds: ${ids.map(m => m[1]).join(", ")}`);

  // Check for length info
  const lengths = [...html.matchAll(/"lengthText":\{[^}]*?"simpleText":"([^"]+)"/g)].slice(0, 5);
  console.log(`First few durations: ${lengths.map(m => m[1]).join(", ")}`);
})();
