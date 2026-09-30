/**
 * Extract a structured workout log from a single photo (a page of a training
 * notebook, a whiteboard, a phone screenshot of an app, etc.).
 *
 * The AI vision call is intentionally scoped tight: one photo → one session.
 * That keeps latency + token spend predictable and lets the coach upload a
 * whole notebook by dropping N photos at once; each is processed in parallel.
 *
 * Output contract: JSON with the shape below. No prose, no markdown.
 */

import { generateFromImages, stripJsonFences } from "@/lib/ai-call";

export type ParsedWorkoutExercise = {
  /** Exercise name as written in the photo (or normalized). Kept verbatim so
   * the library resolver can match it and inherit the curated video. */
  name: string;
  /** Optional prescription fields — coach may edit later. */
  sets: string | null;
  reps: string | null;
  /** Load actually USED (per the photo), e.g. "80kg", "60/70/75kg", "BW". */
  load: string | null;
  rest: string | null;
  /** Anything else visible next to the exercise (RPE, tempo, RM, form cues). */
  notes: string | null;
};

export type ParsedWorkoutPhoto = {
  /** YYYY-MM-DD when the workout was performed. Extracted from the photo if
   * visible; null if no date is legible (caller decides what to do). */
  date: string | null;
  /** Free-text top-level notes for the whole session (mood, warm-up, etc.). */
  sessionNotes: string | null;
  /** Optional session focus / theme, e.g. "Push day", "Legs & core". */
  focus: string | null;
  /** Ordered list of exercises as they appeared in the photo. */
  exercises: ParsedWorkoutExercise[];
};

const SYSTEM_PROMPT = `You are a personal trainer reading a client's training log photo.
Your job: extract every exercise, weight, and note VERBATIM from the image.
Do NOT invent, expand, or interpret — if a field is not visible, leave it null.
Return STRICT JSON matching the schema. No prose, no markdown fences.

Schema:
{
  "date": "YYYY-MM-DD" or null,
  "sessionNotes": string or null,
  "focus": string or null,
  "exercises": [
    { "name": string, "sets": string|null, "reps": string|null, "load": string|null, "rest": string|null, "notes": string|null }
  ]
}

Rules:
- date: parse any date format shown (dd/mm, mm/dd, "Monday 3 Oct", etc.). If year missing, use the current year.
- name: keep original language and spelling (e.g. "sentadilla búlgara"). Don't translate.
- load: include units ("80kg", "45lb", "BW" for bodyweight, "2×20kg" for dumbbell pairs).
- sets/reps: keep original format ("3", "3x5", "5,4,3" for descending).
- notes: capture RPE, tempo, RM notation, form cues written beside the exercise.
- sessionNotes: header-level notes (mood, warm-up, injuries, next-time reminders).
- If the photo is not a workout log at all, return { "date": null, "sessionNotes": "not a workout log", "focus": null, "exercises": [] }.
`;

const USER_PROMPT = `Extract the workout log from this photo into JSON.`;

export async function parseWorkoutPhoto(image: {
  base64: string;
  mimeType: string;
}): Promise<ParsedWorkoutPhoto> {
  const text = await generateFromImages({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: USER_PROMPT,
    images: [image],
    expectJson: true,
    // A dense notebook page fits comfortably in 2-3k output tokens; 4k gives
    // headroom without paying for unused budget on the paid fallback.
    maxTokens: 4000,
  });
  const raw = stripJsonFences(text);
  let parsed: ParsedWorkoutPhoto;
  try {
    parsed = JSON.parse(raw) as ParsedWorkoutPhoto;
  } catch (e) {
    throw new Error(`Photo parser returned invalid JSON: ${(e as Error).message}\nFirst 500 chars: ${raw.slice(0, 500)}`);
  }
  // Normalize the date: accept a bare year missing (e.g. "10-05" → assume current year)
  if (parsed.date && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    const currentYear = new Date().getFullYear();
    const m = parsed.date.match(/(\d{1,2})[/-](\d{1,2})/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      // Ambiguous — trust the AI's ordering (day-month vs month-day is
      // culture-specific). If either is > 12 the other is the month.
      const month = a > 12 ? b : a;
      const day = a > 12 ? a : b;
      parsed.date = `${currentYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    } else {
      parsed.date = null;
    }
  }
  return parsed;
}
