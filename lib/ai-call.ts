/**
 * Provider-agnostic AI text-generation wrapper with tiered fallback.
 *
 * Tier 1 (free):   Google Gemini  — GEMINI_API_KEY   (15 req/min, 1500 req/day)
 * Tier 2 (free):   Groq           — GROQ_API_KEY     (free tier, very fast)
 * Tier 3 (paid):   OpenAI         — OPENAI_API_KEY   (prepaid credits; ~$0.003/req on gpt-4o-mini)
 * Tier 4 (paid):   Anthropic      — ANTHROPIC_API_KEY (last resort)
 *
 * We only fall back to a paid provider after every free provider is exhausted.
 * Groq in the middle turns almost all Gemini-rate-limit events into free
 * calls instead of paid bills.
 *
 * Note on ChatGPT Plus: your $20/mo ChatGPT consumer subscription does NOT
 * include API access. To use OpenAI here, create an API key at
 * platform.openai.com → prepay $5-10 in credits → paste as OPENAI_API_KEY.
 * It bills per-token, not monthly. gpt-4o-mini is ~$0.003 per average
 * program generation; GPT-5 would be ~$0.03.
 *
 * Setup (Vercel or Railway env vars):
 *   GEMINI_API_KEY=AIza...        (free — aistudio.google.com)
 *   GROQ_API_KEY=gsk_...          (free — console.groq.com)
 *   OPENAI_API_KEY=sk-...         (paid — platform.openai.com)
 *   ANTHROPIC_API_KEY=sk-ant-...  (paid — console.anthropic.com)
 *
 * Optional model overrides:
 *   GEMINI_MODEL=gemini-2.5-flash
 *   GROQ_MODEL=openai/gpt-oss-120b
 *   OPENAI_MODEL=gpt-4o-mini       (default; cheapest capable)
 *   ANTHROPIC_GEN_MODEL=claude-haiku-4-5
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

type Provider = "gemini" | "groq" | "openai" | "anthropic";

function hasKey(name: string): boolean {
  return (process.env[name] ?? "").trim().length > 0;
}

/** Tiered chain: free providers first, then paid in order of cost. */
function providerChain(): Provider[] {
  const chain: Provider[] = [];
  if (hasKey("GEMINI_API_KEY")) chain.push("gemini");
  if (hasKey("GROQ_API_KEY")) chain.push("groq");
  if (hasKey("OPENAI_API_KEY")) chain.push("openai");
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
  if (p === "openai") return callOpenAI(opts);
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
 * OpenAI (paid — ChatGPT's API, not the ChatGPT Plus subscription)
 * ────────────────────────────────────────────────────────────────────────── */

async function callOpenAI(opts: AiCallOptions): Promise<string> {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const body: Record<string, unknown> = {
    model,
    temperature: 0.4,
    max_tokens: opts.maxTokens ?? 8000,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userPrompt },
    ],
    ...(opts.expectJson ? { response_format: { type: "json_object" } } : {}),
  };
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    throw new Error(`OpenAI network error: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("OpenAI rejected the API key.");
    if (res.status === 429) throw new Error("OpenAI rate limit or out of credits (429).");
    if (res.status >= 500) throw new Error(`OpenAI ${res.status} server error (transient).`);
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 300)}`);
  }
  type OpenAIResponse = { choices?: Array<{ message?: { content?: string } }> };
  const json = (await res.json()) as OpenAIResponse;
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned an empty response.");
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

/* ──────────────────────────────────────────────────────────────────────────
 * Vision: extract structured text from images. Gemini's free tier accepts
 * images natively, so it's the primary. Groq's OSS models don't do vision,
 * so it's skipped here. Anthropic is the paid last resort.
 * ────────────────────────────────────────────────────────────────────────── */

export type AiVisionOptions = {
  systemPrompt: string;
  userPrompt: string;
  /** base64-encoded image bytes and MIME type (e.g. "image/jpeg"). */
  images: { base64: string; mimeType: string }[];
  expectJson?: boolean;
  maxTokens?: number;
};

function visionChain(): Provider[] {
  const chain: Provider[] = [];
  if (hasKey("GEMINI_API_KEY")) chain.push("gemini");
  if (hasKey("OPENAI_API_KEY")) chain.push("openai");
  if (hasKey("ANTHROPIC_API_KEY")) chain.push("anthropic");
  return chain;
}

/**
 * Multi-modal generation. Reuses the DB response cache: the hash includes the
 * image bytes, so re-uploading the same photo is free.
 */
export async function generateFromImages(opts: AiVisionOptions & { noCache?: boolean }): Promise<string> {
  const chain = visionChain();
  if (chain.length === 0) {
    throw new Error("No vision-capable AI provider configured. Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY.");
  }

  const key = opts.noCache
    ? null
    : crypto
        .createHash("sha256")
        .update(JSON.stringify({ s: opts.systemPrompt, u: opts.userPrompt, j: !!opts.expectJson, m: opts.maxTokens ?? null, imgs: opts.images.map((i) => `${i.mimeType}:${i.base64.length}:${i.base64.slice(0, 64)}${i.base64.slice(-64)}`) }))
        .digest("hex");

  if (key) {
    try {
      const hit = await prisma.aiCache.findUnique({ where: { promptHash: key } });
      if (hit && Date.now() - hit.createdAt.getTime() < AI_CACHE_TTL_MS) return hit.response;
    } catch {
      /* non-fatal */
    }
  }

  let lastErr: Error | null = null;
  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    try {
      const out =
        p === "gemini" ? await callGeminiVision(opts)
        : p === "openai" ? await callOpenAIVision(opts)
        : await callAnthropicVision(opts);
      if (key) {
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
      console.warn(`AI vision ${p} failed (${err.message.slice(0, 120)}) — trying ${nextP}...`);
    }
  }
  throw lastErr ?? new Error("All vision providers failed");
}

async function callGeminiVision(opts: AiVisionOptions): Promise<string> {
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  const model = process.env.GEMINI_VISION_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const parts: Array<Record<string, unknown>> = [{ text: opts.userPrompt }];
  for (const img of opts.images) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  }
  const body = {
    system_instruction: { parts: [{ text: opts.systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 8000,
      temperature: 0.2,
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
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    throw new Error(`Gemini vision network error: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Gemini rate limit hit (429). Falling back if configured.");
    if (res.status === 503) throw new Error("Gemini 503 unavailable (transient).");
    if (res.status >= 500) throw new Error(`Gemini ${res.status} server error (transient).`);
    throw new Error(`Gemini vision error ${res.status}: ${errText.slice(0, 300)}`);
  }
  type GResp = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; promptFeedback?: { blockReason?: string } };
  const json = (await res.json()) as GResp;
  if (json.promptFeedback?.blockReason) throw new Error(`Gemini blocked the image prompt: ${json.promptFeedback.blockReason}`);
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini vision returned an empty response.");
  return text.trim();
}

async function callOpenAIVision(opts: AiVisionOptions): Promise<string> {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  const model = process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  // OpenAI accepts images as data URLs inside a `content` array on a user
  // message. We build one text part + N image parts.
  const content: Array<Record<string, unknown>> = [{ type: "text", text: opts.userPrompt }];
  for (const img of opts.images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    });
  }
  const body: Record<string, unknown> = {
    model,
    temperature: 0.2,
    max_tokens: opts.maxTokens ?? 4000,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content },
    ],
    ...(opts.expectJson ? { response_format: { type: "json_object" } } : {}),
  };
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    throw new Error(`OpenAI vision network error: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("OpenAI rejected the API key.");
    if (res.status === 429) throw new Error("OpenAI vision rate limit / out of credits (429).");
    if (res.status >= 500) throw new Error(`OpenAI ${res.status} vision server error (transient).`);
    throw new Error(`OpenAI vision error ${res.status}: ${errText.slice(0, 300)}`);
  }
  type OpenAIVisionResp = { choices?: Array<{ message?: { content?: string } }> };
  const json = (await res.json()) as OpenAIVisionResp;
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI vision returned an empty response.");
  return text.trim();
}

async function callAnthropicVision(opts: AiVisionOptions): Promise<string> {
  const key = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  const model = process.env.ANTHROPIC_VISION_MODEL ?? process.env.ANTHROPIC_GEN_MODEL ?? "claude-haiku-4-5";
  const client = new Anthropic({ apiKey: key });
  const content: Array<Anthropic.ContentBlockParam> = [];
  for (const img of opts.images) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: img.base64 },
    });
  }
  content.push({ type: "text", text: opts.userPrompt });
  let msg;
  try {
    msg = await client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 4000,
      system: [{ type: "text", text: opts.systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 401) throw new Error("Anthropic rejected the API key.");
    if (err.status === 429) throw new Error("Anthropic rate limit hit.");
    throw new Error(`Anthropic vision error: ${err.message ?? "unknown"}`);
  }
  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text response from Anthropic vision");
  return block.text.trim();
}
