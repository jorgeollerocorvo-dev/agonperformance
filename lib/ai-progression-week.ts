import { generateText, stripJsonFences, activeProvider } from "@/lib/ai-call";
import type { ParsedProgram } from "@/lib/ai-parse-program";

/**
 * Generate ONE new progression week for an existing program.
 *
 * Given the prior weeks of a program (structure, movements, prescribed loads,
 * and optionally the athlete's logged actual loads), the AI produces a single
 * new week that:
 *   - Mirrors the structure of the most recent weeks (same block layout,
 *     same day split, similar movement selection).
 *   - Progresses loads/intensity sensibly per style:
 *       strength →  +2.5-5% on main lifts
 *       hypertrophy → same load, more reps OR an extra set
 *       conditioning → trim time / add round / add load
 *   - Inserts a deload week if the prior 3+ weeks were progressively heavier
 *     (1RM-test-style accumulation pattern).
 *
 * Returned shape is a single ParsedProgram-style "week" object — the caller
 * wraps it into a ProgramWeek + ProgramSession + Block tree on save.
 */

export type ProgressionWeekInput = {
  programTitle: string;
  programGoal: string | null;
  athleteName: string;
  athleteContext: string;        // formatted via formatAthleteContext()
  // Compact JSON-stringified history: array of weeks the AI should learn from.
  // Most recent week LAST.
  priorWeeks: PriorWeek[];
  // The week number we're generating (e.g. existing weeks 1-6, new week is 7).
  newWeekNumber: number;
  // Optional coach hint for THIS week ("deload", "test week", "harder squats").
  coachHint?: string | null;
  /**
   * Optional list of curated Movement library names. AI biases toward these so
   * matched names inherit their locked demo videos at persist time.
   */
  libraryMovementNames?: string[];
};

export type PriorWeek = {
  weekNumber: number;
  weekLabel: string | null;
  days: Array<{
    dayOfWeek: string | null;
    focus: string | null;
    isRest: boolean;
    blocks: Array<{
      blockCode: string;
      label: string | null;
      format: string | null;
      movements: Array<{
        name: string;
        sets: string | null;
        reps: string | null;
        load: string | null;
        rest: string | null;
        notes: string | null;
        // What the athlete actually did, if logged. AI should progress from
        // these rather than the prescription when they diverge.
        actualLoad?: string | null;
      }>;
    }>;
  }>;
};

const SYSTEM_PROMPT = `You are an elite strength & conditioning coach extending an existing training program by one week.

OUTPUT: ONE JSON object representing a single week. Return ONLY the JSON, no prose, no markdown fences.

Shape:
{
  "weekNumber": number,
  "weekLabel": string | null,           // e.g. "Week 7 — Intensify"
  "days": Array<{
    "dayOfWeek": "Monday" | "Tuesday" | ... | "Sunday",
    "focus": string | null,             // e.g. "Lower-body strength + Zone-2"
    "intensity": "Light" | "Moderate" | "Hard" | null,
    "isRest": boolean,                  // true → blocks must be []
    "notes": string | null,
    "blocks": Array<{
      "blockCode": "W" | "A" | "B" | "C" | "D",   // alphabetical, W = warm-up
      "label": string | null,
      "format": string | null,          // e.g. "5x5", "EMOM 10", "AMRAP 12"
      "restSec": number | null,
      "notes": string | null,
      "movements": Array<{
        "name": string,
        "sets": string | null,
        "reps": string | null,
        "load": string | null,
        "rest": string | null,
        "notes": string | null,
        "isTest": boolean
      }>
    }>
  }>
}

PROGRESSION RULES (this is the WHOLE point — read carefully):
- MIRROR the structure of the most recent prior weeks: same number of training days, same day split, same block layout (W + A + B…), similar movement selection. The athlete is mid-program, not starting over.
- PROGRESS loads/intensity intentionally based on prior weeks:
  * Strength lifts (back squat, deadlift, bench, press, snatch, clean, jerk):
    +2.5-5% on the prescribed load OR add a set OR drop reps by 1-2 and bump load by 5-7.5%.
  * Hypertrophy work (curls, extensions, presses with rep ranges 8-15):
    same load, +1-2 reps per set OR +1 set. If reps were already at top of range, bump load 2.5-5%.
  * Conditioning / metcon: trim cap time, add a round, add load, or add a movement.
  * Skill / gymnastics: progress to the next variation OR add reps.
- USE THE ATHLETE'S ACTUAL LOGGED LOADS when present (the "actualLoad" field). If the prescription said "80 kg" but they logged "85 kg × 5", program the next week from 85 kg, not 80 kg.
- INSERT A DELOAD if the prior 3+ weeks show progressive intensification: drop volume 30-50%, drop intensity 20%, keep movement pattern. Label the week "Deload" or similar.
- Honor the coach's <hint> if provided — it overrides default progression (e.g. "deload week", "test 1RM", "shift to hypertrophy block").
- 7 days per week, exactly one rest day minimum (isRest=true with empty blocks []), unless the prior pattern shows more rest days.
- Use the SAME movement names that appear in prior weeks where possible — the system matches them against the Movement library by name.
- weekNumber MUST equal the value the user provides in <new_week_number>.
- Use plain English movement names (no exotic abbreviations).
`;

export function hasGenKey(): boolean {
  return activeProvider() !== null;
}

export type ProgressionWeek = ParsedProgram["weeks"][number];

export async function generateProgressionWeek(
  input: ProgressionWeekInput,
): Promise<ProgressionWeek> {
  if (!hasGenKey()) {
    throw new Error(
      "No AI provider configured. Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY on Railway.",
    );
  }

  // Trim history to the most recent 8 weeks if the program is very long — the
  // AI needs to see the progression trend, not the whole history.
  const trimmed = input.priorWeeks.slice(-8);
  const historyJson = JSON.stringify(trimmed);

  // Conservative cap to keep prompt comfortable.
  const HISTORY_MAX = 80_000;
  const history =
    historyJson.length > HISTORY_MAX
      ? historyJson.slice(0, HISTORY_MAX) +
        `\n[…history truncated, showing first ${HISTORY_MAX} chars of ${historyJson.length}…]`
      : historyJson;

  const lib = input.libraryMovementNames ?? [];
  const libHint = lib.length > 0
    ? `
<movement_library>
The following ${lib.length} movement names exist in the coach's curated library
with hand-picked demo videos. PREFER these exact names when continuing the
program — match casing and spelling exactly. If a movement that's clearly in
the prior weeks isn't in the list, keep using the prior week's name.

${lib.join(", ")}
</movement_library>
`
    : "";

  const userPrompt = `Extend the following program by ONE week.

<program>
Title: ${input.programTitle}
Goal: ${input.programGoal ?? "(not set)"}
</program>

<athlete>
Name: ${input.athleteName}
${input.athleteContext}
</athlete>

<new_week_number>${input.newWeekNumber}</new_week_number>
${input.coachHint ? `<hint>${input.coachHint}</hint>\n` : ""}${libHint}
<prior_weeks_json>
${history}
</prior_weeks_json>

Return ONLY the JSON for the single new week.`;

  // A single week of structured JSON is ~3-6k tokens. 16k gives plenty of headroom.
  const text = await generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    expectJson: true,
    maxTokens: 16_000,
  });

  const raw = stripJsonFences(text);
  let parsed: ProgressionWeek;
  try {
    parsed = JSON.parse(raw) as ProgressionWeek;
  } catch (e) {
    throw new Error(
      `AI returned invalid JSON for the progression week: ${(e as Error).message}\n\nFirst 500 chars: ${raw.slice(0, 500)}`,
    );
  }

  // Light sanity check.
  if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error("AI returned an empty week. Try again or simplify the program history.");
  }

  // Force-correct the week number if the AI got it wrong.
  parsed.weekNumber = input.newWeekNumber;
  return parsed;
}
