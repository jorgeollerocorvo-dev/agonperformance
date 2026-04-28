import Anthropic from "@anthropic-ai/sdk";
import type { ParsedProgram } from "@/lib/ai-parse-program";

/**
 * Generate a complete training program from a coach's brief + the athlete's profile.
 *
 * Input is a structured brief; output is the same `ParsedProgram` shape we already
 * use for the document-import pipeline, so the rest of the create-program code
 * (tree write, YouTube auto-attach, redirect) is shared.
 *
 * Model: Claude Haiku 4.5 by default (cheap, fast, structured-extraction-grade).
 *   Override via env: ANTHROPIC_GEN_MODEL=claude-sonnet-4-5
 *
 * Free alternatives we could swap to later (single function change):
 *   - Google Gemini Flash (free tier ~15 req/min)
 *   - Groq Llama 3.3 70B (free tier, fast)
 */

export type ProgramBrief = {
  athleteName: string;
  athleteContext: string;       // Pre-formatted athlete summary (sex/age/division/goals/notes/current_1rms…)
  goalOverride: string | null;  // Coach's free-text goal for THIS program
  needs: string;                // What this program should target
  durationWeeks: number;
  daysPerWeek: number | null;   // null = infer from athlete's training frequency
  style: string | null;         // "crossfit", "bodybuilding", "rehab", "women glutes/abs/legs", "hybrid", etc.
  equipment: string | null;     // free-text constraints e.g. "home gym only, dumbbells + bands"
};

const SYSTEM_PROMPT = `You are an elite strength & conditioning coach designing a training program.

OUTPUT: a single JSON object matching this TypeScript shape. Return ONLY the JSON, no prose, no markdown fences.

type ParsedProgram = {
  title: string;
  goal?: string | null;
  durationWeeks: number;
  athleteName?: string | null;
  weeks: Array<{
    weekNumber: number;
    weekLabel?: string | null;            // e.g. "Week 1 — Build"
    days: Array<{
      dayOfWeek?: string | null;          // "Monday" .. "Sunday" (English)
      date?: string | null;               // null — the importer fills dates
      focus?: string | null;              // e.g. "Lower-body strength + short metcon"
      intensity?: string | null;          // "Light" | "Moderate" | "Hard"
      isRest?: boolean;
      notes?: string | null;
      blocks: Array<{
        blockCode: string;                // "A", "B", "C" (alphabetical within day)
        label?: string | null;            // e.g. "Back squat strength"
        format?: string | null;           // e.g. "5x5", "AMRAP 12 min", "EMOM 10"
        restSec?: number | null;
        notes?: string | null;
        movements: Array<{
          name: string;                   // Plain English exercise name
          sets?: string | null;
          reps?: string | null;
          load?: string | null;           // "80% 1RM", "20 kg DB", "RPE 7"
          rest?: string | null;
          notes?: string | null;
          isTest?: boolean;               // true if this is a benchmark / max test day
        }>;
      }>;
    }>;
  }>;
};

DESIGN RULES
- Honor the athlete's training frequency. If the brief says 4 days/week, schedule 4 training days + 3 rest days; place rest days sensibly.
- Periodize across weeks: build → intensify → deload (or build → peak → test depending on length).
- Match the requested style. CrossFit: include strength + skill + conditioning. Bodybuilding: hypertrophy splits with rep ranges 6-15. Rehab: low-load, high-quality, mobility-heavy. Women glutes/abs/legs: hip-hinge + glute isolation + core, moderate volume.
- Respect equipment constraints. If the athlete has only DBs + bands, do not program a back squat under a barbell.
- Movement names: use plain English the Movement library can match (e.g. "Back squat", "Hip thrust", "Bar muscle-up", "Pigeon pose"). Avoid exotic abbreviations.
- Sets/reps: be specific. Use ranges only when intentional (e.g. "8-10").
- Loads: prefer percentages (% 1RM) or RPE for strength work; specific weights only when given by the athlete's current 1RMs.
- Exactly ONE rest day = isRest:true and an empty blocks array. Always include 7 days per week.
- Avoid week 1 testing — schedule benchmark tests in the final week if program is ≥ 3 weeks.
- Keep block count realistic: 2-5 blocks per training day. 4-12 movements total per day.
- weekNumber is 1-indexed and sequential.
`;

export function hasGenKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function generateProgramFromBrief(brief: ProgramBrief): Promise<ParsedProgram> {
  const key = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on Railway.");
  if (!key.startsWith("sk-ant-")) throw new Error("ANTHROPIC_API_KEY looks malformed (should start with sk-ant-).");

  const client = new Anthropic({ apiKey: key });
  const userMessage = `Build a training program for the following athlete and brief.

<athlete>
Name: ${brief.athleteName}
${brief.athleteContext}
</athlete>

<brief>
Length: ${brief.durationWeeks} week${brief.durationWeeks === 1 ? "" : "s"}
Days per week: ${brief.daysPerWeek ?? "follow the athlete's normal frequency"}
Style: ${brief.style ?? "match the athlete's discipline / goals"}
Equipment: ${brief.equipment ?? "full gym assumed unless the athlete profile says otherwise"}
Coach's goal for THIS program: ${brief.goalOverride ?? "use the athlete's standing goals"}
Specific needs / focus: ${brief.needs || "general progressive training"}
</brief>

Return ONLY the JSON.`;

  let msg;
  try {
    msg = await client.messages.create({
      model: process.env.ANTHROPIC_GEN_MODEL ?? "claude-haiku-4-5",
      max_tokens: 8000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 401) throw new Error("Anthropic rejected the API key. Refresh it at console.anthropic.com.");
    if (err.status === 429) throw new Error("Anthropic rate limit hit. Wait a minute and try again.");
    if (err.status === 400 && /credit balance/i.test(err.message ?? "")) {
      throw new Error("Anthropic account out of credits. Add at least $5 at console.anthropic.com/settings/billing.");
    }
    throw new Error(`AI generation failed: ${err.message ?? "unknown error"}`);
  }

  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text response from Claude");

  let raw = block.text.trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\s*/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(raw) as ParsedProgram;
  } catch (e) {
    throw new Error(`Claude returned invalid JSON: ${(e as Error).message}\n\nFirst 500 chars: ${raw.slice(0, 500)}`);
  }
}
