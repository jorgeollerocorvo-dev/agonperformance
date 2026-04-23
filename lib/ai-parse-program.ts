import Anthropic from "@anthropic-ai/sdk";

/**
 * Parsed program shape matching our EditorProgram / ProgramBuilder input.
 */
export type ParsedMovement = {
  name: string;
  sets?: string | null;
  reps?: string | null;
  load?: string | null;
  rest?: string | null;
  notes?: string | null;
  isTest?: boolean;
  /** 11-char YouTube video ID if you know a canonical demo video; otherwise omit. */
  youtubeVideoId?: string | null;
};
export type ParsedBlock = {
  blockCode: string;    // "A", "B", ...
  label?: string | null;
  format?: string | null;  // "5x5", "E2MOM 12 min"
  restSec?: number | null;
  notes?: string | null;
  movements: ParsedMovement[];
};
export type ParsedDay = {
  dayOfWeek?: string | null;    // Mon / Tue / ...
  date?: string | null;         // "YYYY-MM-DD" if the doc specifies
  focus?: string | null;        // e.g. "Upper body push"
  intensity?: string | null;    // Light / Moderate / Hard
  isRest?: boolean;
  notes?: string | null;
  blocks: ParsedBlock[];
};
export type ParsedWeek = {
  weekNumber: number;
  weekLabel?: string | null;
  days: ParsedDay[]; // 1-7 entries
};
export type ParsedProgram = {
  title: string;
  goal?: string | null;
  durationWeeks: number;
  weeks: ParsedWeek[];
  athleteName?: string | null; // if the doc mentions a specific client
};

const SYSTEM_PROMPT = `You are a fitness-coaching document parser. Given a coach's raw programming notes (from Word, Excel, PDF, or plain text), you extract a structured training program.

OUTPUT FORMAT: a single JSON object matching this TypeScript shape. Return ONLY the JSON, no prose, no markdown fences.

type ParsedProgram = {
  title: string;                   // Program name — infer if not explicit ("4-Week Strength Block")
  goal?: string | null;            // One sentence goal if stated
  durationWeeks: number;           // Count weeks in the doc; default 1 if unclear
  athleteName?: string | null;     // If doc is addressed to a specific client
  weeks: Array<{
    weekNumber: number;            // 1-indexed
    weekLabel?: string | null;     // e.g. "Week 1 — Build"
    days: Array<{
      dayOfWeek?: string | null;   // "Monday" | "Tuesday" | ... (full English names)
      date?: string | null;        // "YYYY-MM-DD" if specified
      focus?: string | null;       // e.g. "Strict press + HSPU"
      intensity?: string | null;   // "Light" | "Moderate" | "Hard"
      isRest?: boolean;            // true if it's a rest day
      notes?: string | null;
      blocks: Array<{
        blockCode: string;         // "A", "B", "C" — use alphabetical order within the day
        label?: string | null;     // Short description, e.g. "Back squat"
        format?: string | null;    // e.g. "5x5", "AMRAP 12", "EMOM 10"
        restSec?: number | null;
        notes?: string | null;
        movements: Array<{
          name: string;            // Human-readable exercise name, e.g. "Back squat", "Push press"
          sets?: string | null;    // "5", "3-4"
          reps?: string | null;    // "5", "8-10", "30 sec"
          load?: string | null;    // "70 kg", "bodyweight", "RPE 8"
          rest?: string | null;    // ":60", "2 min"
          notes?: string | null;
          isTest?: boolean;        // true if the doc marks it as a test / 1RM / max attempt
          youtubeVideoId?: string | null;  // 11-char YouTube ID of a canonical demo video, if you're confident. Otherwise omit.
        }>;
      }>;
    }>;
  }>;
};

RULES
- Parse whatever is in the document faithfully. Do NOT invent weeks, days, or movements that aren't there.
- If the document is unstructured prose, infer as best you can; stay conservative.
- Preserve coach-written language in \`notes\` and \`focus\`.
- Normalize exercise names to plain English (e.g. "DB Push Press", "Back Squat"). Keep Spanish if clearly in Spanish.
- Return AT LEAST one week with AT LEAST one day, even if the doc is sparse.
- \`youtubeVideoId\`: ONLY set this to a canonical 11-char YouTube ID if you are highly confident it is a correct CrossFit HQ / Squat University / similar authoritative demo for that exact exercise. If in doubt, omit the field (null). Do NOT guess. Better to leave it null and let the coach add a video than to return a broken or wrong video ID.

The document may be in any language (Spanish, English, Arabic). Parse it in its original language but normalize exercise names to standard English.
`;

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Strip any fields Claude returned that look invalid (e.g. hallucinated video IDs). */
function sanitize(p: ParsedProgram): ParsedProgram {
  return {
    ...p,
    weeks: (p.weeks ?? []).map((w) => ({
      ...w,
      days: (w.days ?? []).map((d) => ({
        ...d,
        blocks: (d.blocks ?? []).map((b) => ({
          ...b,
          movements: (b.movements ?? []).map((m) => ({
            ...m,
            youtubeVideoId: m.youtubeVideoId && YOUTUBE_ID_RE.test(m.youtubeVideoId) ? m.youtubeVideoId : null,
          })),
        })),
      })),
    })),
  };
}

export function hasAIKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function parseProgramWithAI(rawText: string): Promise<ParsedProgram> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to Railway environment variables to enable AI program import.",
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Parse this coach's program document:\n\n<document>\n${rawText.slice(0, 80_000)}\n</document>\n\nReturn only the JSON.`,
      },
    ],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let raw = textBlock.text.trim();
  // Strip accidental markdown fences
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/, "").replace(/```$/, "").trim();
  }

  try {
    return sanitize(JSON.parse(raw) as ParsedProgram);
  } catch (e) {
    throw new Error(`Claude returned invalid JSON: ${(e as Error).message}\n\nFirst 500 chars: ${raw.slice(0, 500)}`);
  }
}

/**
 * Attach a YouTube search URL to every movement (coach can override).
 */
export function attachYouTubeSearchUrls(program: ParsedProgram): ParsedProgram {
  return {
    ...program,
    weeks: program.weeks.map((w) => ({
      ...w,
      days: w.days.map((d) => ({
        ...d,
        blocks: d.blocks.map((b) => ({
          ...b,
          movements: b.movements.map((m) => ({
            ...m,
          })),
        })),
      })),
    })),
  };
}

export function movementYoutubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise demo")}`;
}

/** Given parsed movement info, build the best URL to attach. */
export function bestYoutubeUrl(m: { name: string; youtubeVideoId?: string | null }): string {
  if (m.youtubeVideoId && /^[A-Za-z0-9_-]{11}$/.test(m.youtubeVideoId)) {
    return `https://youtu.be/${m.youtubeVideoId}`;
  }
  return movementYoutubeSearchUrl(m.name);
}
