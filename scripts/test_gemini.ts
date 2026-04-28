import { generateText } from "../lib/ai-call";

(async () => {
  const t = await generateText({
    systemPrompt: "Reply with a single word: OK",
    userPrompt: "test",
    maxTokens: 16,
  });
  console.log("Gemini response:", JSON.stringify(t));
})();
