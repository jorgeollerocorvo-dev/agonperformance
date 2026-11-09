import { generateText, stripJsonFences, activeProvider } from "@/lib/ai-call";
import type { ParsedProgram } from "@/lib/ai-parse-program";

/**
 * Generate ONE new progression week for an existing program.
 *
 * Works in three layers of fallback so it never leaves the coach empty-
 * handed:
 *   1. AI with full context (prior week prescriptions + ACTUAL logged loads
 *      from SessionLog.actuals + athlete feedback + 1RMs + benchmarks +
 *      recent check-ins). Gemini → Groq → Anthropic chain. 60s budget.
 *   2. AI retry with a tighter prompt if the first response is malformed.
 *   3. Deterministic generator: clones the last prior week, bumps strength
 *      lifts +2.5%, adds +1 rep to hypertrophy work, inserts a deload every
 *      4th week if nothing else triggers one. Flagged as `fallback: true`
 *      so the coach knows to review.
 *
 * Returned shape matches the "week" piece of ParsedProgram — the caller
 * wraps it into ProgramWeek + ProgramSession + Blocks on save.
 */

export type ProgressionWeekInput = {
  programTitle: string;
  programGoal: string | null;
  athleteName: string;
  athleteContext: string;
  priorWeeks: PriorWeek[];
  newWeekNumber: number;
  coachHint?: string | null;
  libraryMovementNames?: string[];
  /** The athlete's own 1RMs as free-form JSON (e.g. {back_squat: 140}). */
  current1rms?: Record<string, unknown> | null;
  /** Benchmark best times/reps (e.g. {fran: "4:12"}). */
  currentBenchmarks?: Record<string, unknown> | null;
  /** Last 2-3 check-ins to inform auto-regulation (deload if stressed). */
  recentCheckIns?: Array<{
    weekOf: string; // YYYY-MM-DD
    energy: number | null;
    sleep: number | null;
    stress: number | null;
    motivation: number | null;
    weekSummary: string | null;
  }>;
};

export type PriorWeek = {
  weekNumber: number;
  weekLabel: string | null;
  days: Array<{
    dayOfWeek: string | null;
    focus: string | null;
    isRest: boolean;
    /** Athlete's rating of the session 1-5 if logged (via IntensityReview). */
    intensityFeedback?: number | null;
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
        /** What the athlete actually DID. Null if they didn't log. */
        actualLoad?: string | null;
        actualReps?: string | null;
        actualTime?: string | null;
      }>;
    }>;
  }>;
};

export type ProgressionWeek = ParsedProgram["weeks"][number] & { _fallback?: boolean };

const SYSTEM_PROMPT = `You are an elite strength & conditioning coach with 15+ years of experience programming for athletes from general-population to competitive CrossFitters. You are about to extend an existing training program by ONE week. Think like a coach, not a formula.

OUTPUT: ONE JSON object for a single week. No prose, no markdown fences.

Shape:
{
  "weekNumber": number,
  "weekLabel": string | null,       // short descriptor: "Week 7 — Intensify", "Deload", "Test week"
  "weekIntent": string,             // ONE sentence explaining this week's purpose — audit trail for the coach
  "days": Array<{
    "dayOfWeek": "Monday"|...|"Sunday",
    "focus": string | null,         // "Lower-body strength + Zone-2"
    "intensity": "Light"|"Moderate"|"Hard" | null,
    "isRest": boolean,              // true → blocks must be []
    "notes": string | null,
    "blocks": Array<{
      "blockCode": "W"|"A"|"B"|"C"|"D",   // alphabetical, W = warm-up
      "label": string | null,
      "format": string | null,       // "5x5", "EMOM 10", "AMRAP 12"
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

HOW A REAL COACH REASONS (apply this, don't just mirror):

1. READ THE ACTUAL DATA, not the prescription. When the athlete logged
   actualLoad=85 for a prescription of 80, they are stronger than you
   thought — progress from 85. When actualLoad=70 for a prescription of
   80, something went wrong (RPE too high, injury, bad day); don't
   escalate, hold or regress slightly.

2. AUTOREGULATE from feedback. intensityFeedback is 1-5 (1 easy, 5
   brutal). Across the last 2-3 weeks:
   - Mostly 1-2 → the program is too easy; add 5% load or a set.
   - Mostly 3 → the program is dialled in; progress normally (+2.5-5%
     strength, +1 rep hypertrophy).
   - Mostly 4-5 → the athlete is grinding; hold load this week, add
     mobility/recovery, or insert a deload.
   - Missing → progress normally but note that logs are incomplete.

3. LISTEN TO CHECK-INS. If the last check-in reports stress >= 4 or
   sleep <= 2 for two weeks running, this week is a DELOAD regardless
   of other signals. Label it clearly and explain in weekIntent.

4. RESPECT THE DELOAD CADENCE. In a well-run block, every 4th-5th week
   is a planned deload: -30-50% volume, -20% load, same movement
   pattern. If the prior 3+ weeks show progressive intensification and
   no deload has been inserted → make this week the deload.

5. PROGRESSION TEMPLATES (defaults; override for the person):
   - Compound lifts (BS/FS/OHS/DL/bench/press/snatch/clean/jerk):
     +2.5-5% OR add a set OR drop reps by 1-2 and bump load 5-7.5%.
     Alternate linear (+weight) and double-progression (+reps then
     +weight) across weeks to keep it fresh.
   - Hypertrophy (curls, extensions, accessory presses, rows, rep
     range 8-15): same load, +1-2 reps per set OR +1 set. Once the top
     of the rep range is hit, bump load 2.5-5% and reset reps.
   - Conditioning / metcon: trim cap time, add a round, add load, add
     a movement, or swap one for a harder variation.
   - Skill / gymnastics: progress to the next variation (band pull-up
     → strict → kipping → butterfly; HSPU with riser → strict →
     deficit) OR add unbroken reps.

6. MOVEMENT BALANCE. Across a week, maintain a sensible split:
   roughly equal push:pull volume, roughly equal bilateral:unilateral
   lower-body, posterior-chain work on every lower day. Mirror the
   prior week's intent — don't suddenly pivot to 5 squat days unless
   the hint says so.

7. ANCHOR TO BENCHMARKS + 1RMs if the athlete shared them in
   <athlete_prs>. e.g. if back_squat 1RM is 140 kg and the program
   prescribes "80 kg" (57% of 1RM), progressing to 85 kg is safe; to
   100 kg (71%) is aggressive — only do that if actuals support it.

8. COACH HINT WINS. Anything in <hint> overrides defaults ("deload",
   "test week", "shift to hypertrophy", "add pull-up volume").

9. SHAPE CONTRACTS:
   - weekNumber MUST equal <new_week_number>.
   - 7 days per week with at least ONE rest day (isRest=true, blocks=[]).
   - Use movement names that match prior weeks where applicable.
   - Prefer names from <movement_library> when given — those have
     curated video demos attached.
   - weekIntent is ONE sentence (max 180 chars). It's how the coach
     knows why you wrote this week.
`;

const RETRY_SYSTEM_PROMPT =
  SYSTEM_PROMPT +
  `\n\nYour previous response was not valid JSON. Return ONLY the JSON object. No commentary. No markdown.`;

export function hasGenKey(): boolean {
  return activeProvider() !== null;
}

/**
 * Main entry — try AI with retry, fall back to deterministic generator on
 * irrecoverable failure. Never throws; always returns a usable week.
 * Caller inspects `._fallback === true` to surface a "please review" banner.
 */
export async function generateProgressionWeek(
  input: ProgressionWeekInput,
): Promise<ProgressionWeek> {
  if (!hasGenKey()) {
    // No AI at all → go straight to deterministic fallback.
    return { ...buildDeterministicWeek(input), _fallback: true };
  }

  const userPrompt = buildUserPrompt(input);

  // First attempt — full context, roomy budget.
  try {
    const week = await callAiForWeek({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      newWeekNumber: input.newWeekNumber,
    });
    return week;
  } catch (first) {
    console.warn("[progression] first attempt failed:", (first as Error).message);
  }

  // Second attempt — tighter prompt reminding the model to return JSON only.
  try {
    const week = await callAiForWeek({
      system: RETRY_SYSTEM_PROMPT,
      user: userPrompt + `\n\nReminder: return ONLY the JSON, no text before or after.`,
      newWeekNumber: input.newWeekNumber,
    });
    return week;
  } catch (second) {
    console.warn("[progression] retry failed, using deterministic fallback:", (second as Error).message);
  }

  // Third layer — deterministic. Never throws.
  return { ...buildDeterministicWeek(input), _fallback: true };
}

/* ───────────────── helpers ───────────────── */

async function callAiForWeek({ system, user, newWeekNumber }: { system: string; user: string; newWeekNumber: number }): Promise<ProgressionWeek> {
  const text = await generateText({
    systemPrompt: system,
    userPrompt: user,
    expectJson: true,
    maxTokens: 6_000,
  });
  const raw = stripJsonFences(text);
  const parsed = JSON.parse(raw) as ProgressionWeek;
  if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error("AI returned an empty week.");
  }
  parsed.weekNumber = newWeekNumber;
  return parsed;
}

function buildUserPrompt(input: ProgressionWeekInput): string {
  const trimmed = input.priorWeeks.slice(-8);
  const historyJson = JSON.stringify(trimmed);
  const HISTORY_MAX = 80_000;
  const history =
    historyJson.length > HISTORY_MAX
      ? historyJson.slice(0, HISTORY_MAX) + `\n[…truncated: ${historyJson.length - HISTORY_MAX} chars elided…]`
      : historyJson;

  const lib = input.libraryMovementNames ?? [];
  const libHint = lib.length > 0
    ? `\n<movement_library>\n${lib.slice(0, 200).join(", ")}\n</movement_library>\n`
    : "";

  const prsLines: string[] = [];
  if (input.current1rms && typeof input.current1rms === "object") {
    const rms = Object.entries(input.current1rms).filter(([, v]) => v != null && v !== "");
    if (rms.length) prsLines.push("1RMs: " + rms.map(([k, v]) => `${k}=${v}`).join(", "));
  }
  if (input.currentBenchmarks && typeof input.currentBenchmarks === "object") {
    const bm = Object.entries(input.currentBenchmarks).filter(([, v]) => v != null && v !== "");
    if (bm.length) prsLines.push("Benchmarks: " + bm.map(([k, v]) => `${k}=${v}`).join(", "));
  }
  const prsBlock = prsLines.length ? `\n<athlete_prs>\n${prsLines.join("\n")}\n</athlete_prs>` : "";

  const checkInsBlock = (input.recentCheckIns ?? []).length
    ? `\n<recent_checkins>\n${(input.recentCheckIns ?? []).map((c) => `${c.weekOf} — energy ${c.energy ?? "?"}/5, sleep ${c.sleep ?? "?"}/5, stress ${c.stress ?? "?"}/5, motivation ${c.motivation ?? "?"}/5${c.weekSummary ? ` · "${c.weekSummary.slice(0, 160)}"` : ""}`).join("\n")}\n</recent_checkins>`
    : "";

  return `Extend the program below by ONE week.

<program>
Title: ${input.programTitle}
Goal: ${input.programGoal ?? "(not set)"}
</program>

<athlete>
Name: ${input.athleteName}
${input.athleteContext}
</athlete>${prsBlock}${checkInsBlock}

<new_week_number>${input.newWeekNumber}</new_week_number>
${input.coachHint ? `<hint>${input.coachHint}</hint>\n` : ""}${libHint}
<prior_weeks_json>
${history}
</prior_weeks_json>

Return ONLY the JSON for the new week.`;
}

/* ───────────────── deterministic fallback ─────────────────
 *
 * Mirrors the last prior week structurally and applies mechanical
 * progression rules per-movement. Safe default when AI is unavailable or
 * all fallbacks fail — the coach gets SOMETHING editable to work with
 * instead of "Error, try again".
 */
function buildDeterministicWeek(input: ProgressionWeekInput): ProgressionWeek {
  const last = input.priorWeeks.at(-1);
  if (!last) {
    // Nothing to mirror — one rest day with a note.
    return {
      weekNumber: input.newWeekNumber,
      weekLabel: `Week ${input.newWeekNumber} — Starter`,
      days: Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i],
        focus: null,
        intensity: null,
        isRest: true,
        notes: i === 0 ? "AI unavailable. Add your blocks here, or ask the coach bot again later." : null,
        blocks: [],
      })),
    } as unknown as ProgressionWeek;
  }

  // Deload heuristic: if the last 3 weeks exist and every one of them has
  // movements (not a prior deload), make THIS week a deload.
  const tail = input.priorWeeks.slice(-3);
  const isDueForDeload =
    tail.length === 3 &&
    tail.every((w) => w.days.some((d) => d.blocks.length > 0)) &&
    !/(deload|rest|unload|back off)/i.test(tail.at(-1)?.weekLabel ?? "");

  const days = last.days.map((d) => ({
    dayOfWeek: d.dayOfWeek,
    focus: isDueForDeload && d.focus ? `${d.focus} (deload)` : d.focus,
    intensity: isDueForDeload ? ("Light" as const) : null,
    isRest: d.isRest,
    notes: null,
    blocks: d.blocks.map((b) => ({
      blockCode: b.blockCode,
      label: b.label,
      format: b.format,
      restSec: null,
      notes: null,
      movements: b.movements.map((m) => progressMovement(m, isDueForDeload)),
    })),
  }));

  return {
    weekNumber: input.newWeekNumber,
    weekLabel: isDueForDeload ? "Deload" : `Week ${input.newWeekNumber}`,
    days,
  } as unknown as ProgressionWeek;
}

function progressMovement(m: PriorWeek["days"][number]["blocks"][number]["movements"][number], deload: boolean) {
  const baseLoad = m.actualLoad || m.load;
  let newLoad = baseLoad;
  if (baseLoad) {
    const kg = parseFloat(String(baseLoad).replace(/[^\d.]/g, ""));
    if (!isNaN(kg) && kg > 0) {
      const bumped = deload ? kg * 0.7 : kg * 1.025;
      // Round to 2.5kg plates.
      const rounded = Math.round(bumped / 2.5) * 2.5;
      const unit = /kg/i.test(String(baseLoad)) ? " kg" : /lb/i.test(String(baseLoad)) ? " lb" : "";
      newLoad = `${rounded}${unit}`;
    }
  }

  // Hypertrophy heuristic: if reps are 8-15 range, add +1 rep instead of
  // bumping load (bump load only when deload reduces it).
  const repStr = (m.reps ?? "").match(/\d+/)?.[0];
  const repsN = repStr ? parseInt(repStr, 10) : null;
  const isHyperRange = repsN !== null && repsN >= 8 && repsN <= 14;
  let newReps = m.reps;
  if (isHyperRange && !deload && m.load) {
    newReps = m.reps?.replace(/\d+/, String((repsN ?? 0) + 1)) ?? m.reps;
    newLoad = baseLoad; // hold load, reps go up
  } else if (deload && repsN) {
    newReps = m.reps?.replace(/\d+/, String(Math.max(1, Math.round((repsN ?? 0) * 0.6)))) ?? m.reps;
  }

  return {
    name: m.name,
    sets: m.sets,
    reps: newReps,
    load: newLoad,
    rest: m.rest,
    notes: null,
    isTest: false,
  };
}
