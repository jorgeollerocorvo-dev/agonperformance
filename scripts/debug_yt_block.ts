(async () => {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent("back squat demo")}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await res.text();
  // Find first videoRenderer block manually
  const tag = '"videoRenderer":{';
  const start = html.indexOf(tag);
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
  const block = html.slice(start, j);
  console.log(`Block length: ${block.length}`);
  console.log("First 3000 chars:");
  console.log(block.slice(0, 3000));
})();
