import { generateText, stripJsonFences, activeProvider } from "@/lib/ai-call";
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
  /**
   * Optional reference materials: text extracted from coach-uploaded PDFs/Word/Excel/text
   * plus any pasted text. Used by the AI to mirror structure, movement selection, and
   * load progressions from a prior program when designing the new one.
   */
  referenceMaterials?: string | null;
  /**
   * Optional list of Movement library names to bias the AI toward. When provided,
   * the model is told to prefer these exact names so each generated movement
   * resolves to the curated library row (and inherits its locked videoUrl).
   */
  libraryMovementNames?: string[];
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
        blockCode: string;                // "W" = warm-up, "A" = main block, "B" = accessory/finisher (alphabetical)
        label?: string | null;            // e.g. "Back squat strength" or "Arm + core accessories"
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
- Block structure on EVERY training day:
  * "W" block (warm-up): 5-15 min general + sport-specific prep. 2-4 movements (mobility, activation, light cardio).
  * "A" / "B" / "C" blocks (main work): strength, skill, conditioning, hypertrophy. 1-3 blocks depending on complexity.
  * Final block (accessories): targeted weak points, core, prehab, or conditioning finisher. 2-4 movements.
- Movement names: use plain English the Movement library can match (e.g. "Back squat", "Hip thrust", "Bar muscle-up", "Pigeon pose"). Avoid exotic abbreviations.
- Sets/reps: be specific. Use ranges only when intentional (e.g. "8-10").
- Loads: prefer percentages (% 1RM) or RPE for strength work; specific weights only when given by the athlete's current 1RMs.
- Exactly ONE rest day = isRest:true and an empty blocks array. Always include 7 days per week.
- Avoid week 1 testing — schedule benchmark tests in the final week if program is ≥ 3 weeks.
- Keep block count realistic: 3-5 blocks per training day (W + main + accessories). 5-12 movements total per day.
- weekNumber is 1-indexed and sequential.

WHEN <reference> MATERIALS ARE PROVIDED
- Treat them as coach-supplied guidance: prior programs the athlete completed, sample templates, exercise libraries, or load-progression notes.
- MIRROR the structure where it makes sense: block layout, session split, day count, weekly cadence.
- REUSE specific movements that appear in the reference (unless the brief explicitly says to avoid them).
- CARRY FORWARD the most recent recorded loads when programming the same lift again — bump them per the standard progression for the chosen style (strength: ~2.5-5% per week; hypertrophy: same load, more reps; etc.). If a 1RM is given in the athlete profile, prefer % of 1RM over absolute kilos.
- The reference is GUIDANCE, not a literal copy. The new program must still satisfy the coach's <brief>; if the two conflict, the <brief> wins.
`;

export function hasGenKey(): boolean {
  return activeProvider() !== null;
}

export async function generateProgramFromBrief(brief: ProgramBrief): Promise<ParsedProgram> {
  if (!hasGenKey()) {
    throw new Error("No AI provider configured. Set GEMINI_API_KEY (free) at https://aistudio.google.com/app/apikey or ANTHROPIC_API_KEY on Railway.");
  }

  // Cap reference materials at ~60k chars (~15k tokens) so the prompt stays well
  // under model limits even when the coach uploads several long documents.
  const refRaw = (brief.referenceMaterials ?? "").trim();
  const REF_MAX = 60_000;
  const reference = refRaw.length > REF_MAX
    ? refRaw.slice(0, REF_MAX) + `\n\n[…truncated ${refRaw.length - REF_MAX} chars…]`
    : refRaw;

  // Optional library-name hint so the AI biases toward names that will resolve
  // against the Movement library (and inherit their curated, possibly locked
  // demo videos at persist time).
  const lib = brief.libraryMovementNames ?? [];
  const libHint = lib.length > 0
    ? `
<movement_library>
The following ${lib.length} movement names exist in the coach's curated library
with hand-picked demo videos. PREFER these exact names whenever possible — match
casing and spelling exactly. If the perfect movement isn't in the list, use any
plain-English name; the system will handle it.

${lib.join(", ")}
</movement_library>
`
    : "";

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
${libHint}${reference ? `
<reference>
${reference}
</reference>
` : ""}
Return ONLY the JSON.`;

  // Scale token budget with program length. A typical training day produces
  // ~600-900 tokens of JSON (block layout + movements + cues). With 5-6 training
  // days/week, that's ~3.5-5k tokens per week. We add a safety multiplier of
  // ~1.5x and round up so 12-week programs comfortably fit.
  //   1-2 wk →  12k  |  3-4 wk → 20k  |  5-8 wk → 32k  |  9-12 wk → 48k  |  13+ → 64k
  const weeks = brief.durationWeeks;
  const maxTokens =
    weeks <= 2 ? 12_000 :
    weeks <= 4 ? 20_000 :
    weeks <= 8 ? 32_000 :
    weeks <= 12 ? 48_000 :
    64_000;

  const text = await generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: userMessage,
    expectJson: true,
    maxTokens,
  });
  const raw = stripJsonFences(text);

  // Detect truncation: a complete program always ends with "}" (after the closing
  // ] of weeks). If the model ran out of token budget, the JSON ends mid-string
  // or mid-object, which produces an unterminated-string parse error. Give the
  // coach an actionable message instead of the raw parser error.
  try {
    return JSON.parse(raw) as ParsedProgram;
  } catch (e) {
    const trimmed = raw.trimEnd();
    const looksTruncated = !trimmed.endsWith("}") || /Unterminated|Unexpected end/i.test((e as Error).message);
    if (looksTruncated) {
      throw new Error(
        `The AI ran out of output budget for a ${weeks}-week program (used ${maxTokens.toLocaleString()} tokens). ` +
        `Try shortening the program (fewer weeks or fewer days/week), or break it into two halves.`,
      );
    }
    throw new Error(`AI returned invalid JSON: ${(e as Error).message}\n\nFirst 500 chars: ${raw.slice(0, 500)}`);
  }
}
