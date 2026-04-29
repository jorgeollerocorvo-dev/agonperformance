/**
 * Provider-agnostic AI text-generation wrapper with automatic fallback.
 *
 * Primary provider:
 *   1. Google Gemini (FREE tier: 15 req/min, 1500 req/day)  — if  GEMINI_API_KEY  is set
 *
 * Fallback provider (triggered if primary hits quota/rate-limit):
 *   2. Anthropic Claude — if  ANTHROPIC_API_KEY  is set
 *
 * Both providers are called via REST. If Gemini quota is exhausted, the system
 * automatically retries with Anthropic—no manual intervention needed.
 *
 * Setup (on Railway):
 *   # For free Gemini (recommended):
 *   railway variables --set "GEMINI_API_KEY=AIza..."
 *
 *   # For fallback (optional but recommended):
 *   railway variables --set "ANTHROPIC_API_KEY=sk-ant-..."
 *
 * Optional model overrides:
 *   GEMINI_MODEL=gemini-flash-latest     (default; resolves to current free model)
 *   ANTHROPIC_GEN_MODEL=claude-haiku-4-5 (default fallback model)
 */

import Anthropic from "@anthropic-ai/sdk";

export type AiCallOptions = {
  systemPrompt: string;
  userPrompt: string;
  /** When true, ask the model for valid JSON. Both providers honor this. */
  expectJson?: boolean;
  /** Soft cap on output tokens (Gemini & Anthropic both respect it). */
  maxTokens?: number;
};

export function activeProvider(): "gemini" | "anthropic" | null {
  if ((process.env.GEMINI_API_KEY ?? "").trim()) return "gemini";
  if ((process.env.ANTHROPIC_API_KEY ?? "").trim()) return "anthropic";
  return null;
}

export function secondaryProvider(): "gemini" | "anthropic" | null {
  const primary = activeProvider();
  // Return the other one if primary exists, null otherwise
  if (primary === "gemini" && (process.env.ANTHROPIC_API_KEY ?? "").trim()) return "anthropic";
  if (primary === "anthropic" && (process.env.GEMINI_API_KEY ?? "").trim()) return "gemini";
  return null;
}

/**
 * Generate text with automatic fallback.
 * If the primary provider fails with quota/rate-limit, tries the secondary.
 */
export async function generateText(opts: AiCallOptions): Promise<string> {
  const primary = activeProvider();
  if (!primary) {
    throw new Error(
      "No AI provider configured. Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY on Railway.",
    );
  }

  try {
    if (primary === "gemini") {
      return await callGemini(opts);
    }
    return await callAnthropic(opts);
  } catch (e) {
    const err = e as Error;
    const isQuotaError = err.message.includes("rate limit") || err.message.includes("quota") || err.message.includes("429");

    if (!isQuotaError) throw e; // Only fallback for quota/rate-limit errors

    const fallback = secondaryProvider();
    if (!fallback) throw e; // No fallback available

    console.warn(`⚠️  ${primary} hit quota limit, falling back to ${fallback}...`);

    if (fallback === "gemini") {
      return await callGemini(opts);
    }
    return await callAnthropic(opts);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Google Gemini
 * ────────────────────────────────────────────────────────────────────────── */

async function callGemini(opts: AiCallOptions): Promise<string> {
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  // `gemini-flash-latest` resolves to whatever free-tier flash model is current
  // (gemini-3-flash-preview as of 2026-04). Override via GEMINI_MODEL if needed.
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: opts.systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
    generationConfig: {
      // Bigger headroom + disable "thinking" tokens so the budget all goes to
      // the real answer (this is structured-output extraction, no CoT needed).
      maxOutputTokens: opts.maxTokens ?? 16_000,
      temperature: 0.4,
      thinkingConfig: { thinkingBudget: 0 },
      ...(opts.expectJson ? { responseMimeType: "application/json" } : {}),
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    throw new Error(`Gemini network error: ${(e as Error).message}`);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("Gemini rate limit hit (free tier: 15 req/min, 1500 req/day). System will automatically try Anthropic if available.");
    }
    if (res.status === 400 && /quota|exceeded/i.test(errText)) {
      throw new Error("Gemini quota exhausted (free tier daily limit). System will automatically try Anthropic if available.");
    }
    if (res.status === 400 && /API key/i.test(errText)) {
      throw new Error("Gemini rejected the API key. Get a free one at https://aistudio.google.com/app/apikey and update GEMINI_API_KEY on Railway.");
    }
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 300)}`);
  }

  type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; promptFeedback?: { blockReason?: string } };
  const json = (await res.json()) as GeminiResponse;
  if (json.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt: ${json.promptFeedback.blockReason}`);
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini returned an empty response.");
  return text.trim();
}

/* ──────────────────────────────────────────────────────────────────────────
 * Anthropic Claude (fallback)
 * ────────────────────────────────────────────────────────────────────────── */

async function callAnthropic(opts: AiCallOptions): Promise<string> {
  const key = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  const model = process.env.ANTHROPIC_GEN_MODEL ?? "claude-haiku-4-5";
  const client = new Anthropic({ apiKey: key });

  let msg;
  try {
    msg = await client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 8000,
      system: [{ type: "text", text: opts.systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.userPrompt }],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 401) throw new Error("Anthropic rejected the API key.");
    if (err.status === 429) throw new Error("Anthropic rate limit hit. Wait a minute.");
    if (err.status === 400 && /credit balance/i.test(err.message ?? "")) {
      throw new Error("Anthropic out of credits. Add at console.anthropic.com or set GEMINI_API_KEY for free.");
    }
    throw new Error(`Anthropic error: ${err.message ?? "unknown"}`);
  }
  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text response from Anthropic");
  return block.text.trim();
}

/** Strip leading ```json fences if a model added them despite asking for JSON. */
export function stripJsonFences(text: string): string {
  let raw = text.trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\s*/, "").replace(/```$/, "").trim();
  return raw;
}
