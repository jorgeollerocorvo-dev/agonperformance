// Direct curl-style test of multiple models so we can see the real error body
const KEY = process.env.GEMINI_API_KEY ?? "";

async function tryModel(model: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: 'Say "OK"' }] }],
        generationConfig: { maxOutputTokens: 16, temperature: 0.4 },
      }),
    },
  );
  const body = await res.text();
  console.log(`[${model}] HTTP ${res.status}`);
  console.log(body.slice(0, 700));
  console.log("---");
}

(async () => {
  await tryModel("gemini-2.0-flash");
  await tryModel("gemini-1.5-flash");
  await tryModel("gemini-flash-latest");
})();
