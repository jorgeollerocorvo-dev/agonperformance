import Anthropic from "@anthropic-ai/sdk";
const key = (process.env.ANTHROPIC_API_KEY ?? "").trim();
console.log(`Key length: ${key.length}`);
console.log(`Key prefix: ${key.slice(0, 12)}...`);
if (!key) { console.error("MISSING"); process.exit(1); }
const c = new Anthropic({ apiKey: key });
(async () => {
  try {
    const r = await c.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 32,
      messages: [{ role: "user", content: 'reply just the word OK' }],
    });
    const t = r.content.find((b) => b.type === "text");
    console.log("✓ OK:", t && t.type === "text" ? t.text : JSON.stringify(r));
  } catch (e) {
    const err = e as { status?: number; message?: string };
    console.error(`✗ Anthropic call failed (${err.status ?? "?"}): ${err.message}`);
  }
})();
