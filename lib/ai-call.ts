/**
 * Provider-agnostic AI text-generation wrapper with tiered fallback.
 *
 * Tier 1 (free):   Google Gemini  — GEMINI_API_KEY   (15 req/min, 1500 req/day)
 * Tier 2 (free):   Groq           — GROQ_API_KEY     (free tier, very fast)
 * Tier 3 (paid):   Anthropic      — ANTHROPIC_API_KEY (only used if both free tiers fail)
 *
 * We only fall back to a PAID provider after every free provider is exhausted
 * or errored — Groq going in the middle turns almost all Gemini-rate-limit
 * events into free calls instead of Anthropic bills.
 *
 * Setup (on Railway):
 *   railway variables --set "GEMINI_API_KEY=AIza..."     # tier 1
 *   railway variables --set "GROQ_API_KEY=gsk_..."       # tier 2 — grab at console.groq.com
 *   railway variables --set "ANTHROPIC_API_KEY=sk-ant-..." # tier 3 last resort
 *
 * Optional model overrides:
 *   GEMINI_MODEL=gemini-2.5-flash        (pinned; latest alias has 30s timeouts)
 *   GROQ_MODEL=openai/gpt-oss-120b       (large fast model on Groq's free tier)
 *   ANTHROPIC_GEN_MODEL=claude-haiku-4-5 (cheapest Claude)
 */

import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type AiCallOptions = {
  systemPrompt: string;
  userPrompt: string;
  /** When true, ask the model for valid JSON. Both providers honor this. */
  expectJson?: boolean;
  /** Soft cap on output tokens (Gemini & Anthropic both respect it). */
  maxTokens?: number;
};

type Provider = "gemini" | "groq" | "anthropic";

function hasKey(name: string): boolean {
  return (process.env[name] ?? "").trim().length > 0;
}

/** Tiered chain: free providers first, paid only as last resort. */
function providerChain(): Provider[] {
  const chain: Provider[] = [];
  if (hasKey("GEMINI_API_KEY")) chain.push("gemini");
  if (hasKey("GROQ_API_KEY")) chain.push("groq");
  if (hasKey("ANTHROPIC_API_KEY")) chain.push("anthropic");
  return chain;
}

export function activeProvider(): Provider | null {
  return providerChain()[0] ?? null;
}

export function secondaryProvider(): Provider | null {
  return providerChain()[1] ?? null;
}

async function callProvider(p: Provider, opts: AiCallOptions): Promise<string> {
  if (p === "gemini") return callGemini(opts);
  if (p === "groq") return callGroq(opts);
  return callAnthropic(opts);
}

function isRecoverable(err: Error): boolean {
  const msg = err.message ?? "";
  return (
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("429") ||
    /\b5\d\d\b/.test(msg) ||
    /unavailable|overloaded|network error|timeout/i.test(msg)
  );
}

/** DB-backed response cache TTL. Keeps regenerations free when a coach hits
 * the same brief twice (page reload, minor toggle, retry). Coach only pays a
 * fresh AI call when their input actually changes. */
const AI_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function cacheKey(opts: AiCallOptions): string {
  const payload = JSON.stringify({
    s: opts.systemPrompt,
    u: opts.userPrompt,
    j: !!opts.expectJson,
    m: opts.maxTokens ?? null,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Generate text — walks the tiered provider chain until one succeeds or we
 * hit an unrecoverable error. Paid provider is only reached if EVERY free
 * provider errored on this call.
 *
 * Wrapped with a persistent response cache keyed by (system+user+opts) hash.
 * Cache hits are FREE — no provider call, no quota spent. Set opts.noCache
 * to bypass (currently unused; add if a caller ever needs fresh randomness).
 */
export async function generateText(opts: AiCallOptions & { noCache?: boolean }): Promise<string> {
  const chain = providerChain();
  if (chain.length === 0) {
    throw new Error(
      "No AI provider configured. Set GEMINI_API_KEY (free), GROQ_API_KEY (free), or ANTHROPIC_API_KEY on Railway.",
    );
  }

  const key = opts.noCache ? null : cacheKey(opts);
  if (key) {
    try {
      const hit = await prisma.aiCache.findUnique({ where: { promptHash: key } });
      if (hit && Date.now() - hit.createdAt.getTime() < AI_CACHE_TTL_MS) {
        return hit.response;
      }
    } catch {
      // Cache lookup failures are non-fatal — fall through to provider call.
    }
  }

  let lastErr: Error | null = null;
  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    try {
      const out = await callProvider(p, opts);
      if (key) {
        // Fire-and-forget upsert: don't block the response on cache write.
        prisma.aiCache
          .upsert({
            where: { promptHash: key },
            create: { promptHash: key, response: out, provider: p },
            update: { response: out, provider: p, createdAt: new Date() },
          })
          .catch(() => {});
      }
      return out;
    } catch (e) {
      const err = e as Error;
      lastErr = err;
      const nextP = chain[i + 1];
      if (!nextP || !isRecoverable(err)) throw err;
      console.warn(`AI ${p} failed (${err.message.slice(0, 120)}) — trying ${nextP}...`);
    }
  }
  throw lastErr ?? new Error("All AI providers failed");
}

/* ──────────────────────────────────────────────────────────────────────────
 * Google Gemini
 * ────────────────────────────────────────────────────────────────────────── */

async function callGemini(opts: AiCallOptions): Promise<string> {
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  // Use a pinned model id, not the `latest` alias — observed that
  // `gemini-flash-latest` started timing out at 30s with no response while
  // `gemini-2.5-flash` returns in ~1.4s. Override via GEMINI_MODEL if needed.
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
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
      throw new Error("Gemini rate limit hit (429: free tier 15 req/min, 1500 req/day). System will automatically try Anthropic if available.");
    }
    if (res.status === 503) {
      throw new Error("Gemini 503 unavailable/overloaded. System will automatically try Anthropic if available.");
    }
    if (res.status >= 500) {
      throw new Error(`Gemini ${res.status} server error (transient). System will automatically try Anthropic if available.`);
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
 * Groq (OpenAI-compatible; free tier — sits between Gemini and Anthropic)
 * ────────────────────────────────────────────────────────────────────────── */

async function callGroq(opts: AiCallOptions): Promise<string> {
  const key = (process.env.GROQ_API_KEY ?? "").trim();
  const model = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 8000,
    temperature: 0.4,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userPrompt },
    ],
    ...(opts.expectJson ? { response_format: { type: "json_object" } } : {}),
  };
  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    throw new Error(`Groq network error: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Groq rate limit hit (429).");
    if (res.status === 401) throw new Error("Groq rejected the API key.");
    if (res.status >= 500) throw new Error(`Groq ${res.status} server error (transient).`);
    throw new Error(`Groq error ${res.status}: ${errText.slice(0, 300)}`);
  }
  type GroqResponse = { choices?: Array<{ message?: { content?: string } }> };
  const json = (await res.json()) as GroqResponse;
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned an empty response.");
  return text.trim();
}

/* ──────────────────────────────────────────────────────────────────────────
 * Anthropic Claude (paid last resort)
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
