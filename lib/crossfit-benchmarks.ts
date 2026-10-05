/**
 * Common CrossFit benchmarks (The Girls, The Heroes, Olympic lifts, cardio
 * standards) used by the per-athlete evolution dashboard. The chart matches
 * ProgramMovement names against these so Fran / Grace / Helen etc. always
 * show up in the "Benchmarks" tab even if the coach never typed the name
 * exactly the same way twice.
 *
 * Each entry includes synonyms (case-insensitive substring match) and a
 * metric type:
 *   - "time"   → lower is better (metcons, running, rowing)
 *   - "weight" → higher is better (lifts, PRs)
 *   - "reps"   → higher is better (AMRAPs, max reps)
 */

export type BenchmarkMetric = "time" | "weight" | "reps";

export type CrossfitBenchmark = {
  key: string;         // stable id, used by chart series
  label: string;       // display name
  category: "girls" | "heroes" | "lifts" | "cardio" | "gymnastics";
  metric: BenchmarkMetric;
  /** Case-insensitive substring matchers against movement name. */
  matchers: string[];
  /** Optional short description shown as tooltip. */
  description?: string;
};

export const CROSSFIT_BENCHMARKS: CrossfitBenchmark[] = [
  // The Girls — time-based metcons
  { key: "fran", label: "Fran", category: "girls", metric: "time",
    matchers: ["fran"],
    description: "21-15-9 Thrusters (43/30 kg) + Pull-ups" },
  { key: "grace", label: "Grace", category: "girls", metric: "time",
    matchers: ["grace"],
    description: "30 Clean & Jerks for time (61/43 kg)" },
  { key: "helen", label: "Helen", category: "girls", metric: "time",
    matchers: ["helen"],
    description: "3 rounds: 400m run, 21 KB swings (24/16 kg), 12 pull-ups" },
  { key: "diane", label: "Diane", category: "girls", metric: "time",
    matchers: ["diane"],
    description: "21-15-9 Deadlifts (102/70 kg) + HSPU" },
  { key: "elizabeth", label: "Elizabeth", category: "girls", metric: "time",
    matchers: ["elizabeth"],
    description: "21-15-9 Cleans (61/43 kg) + Ring dips" },
  { key: "angie", label: "Angie", category: "girls", metric: "time",
    matchers: ["angie"],
    description: "100 Pull-ups, Push-ups, Sit-ups, Squats for time" },
  { key: "barbara", label: "Barbara", category: "girls", metric: "time",
    matchers: ["barbara"],
    description: "5 rounds of 20 pull-ups, 30 push-ups, 40 sit-ups, 50 squats" },
  { key: "cindy", label: "Cindy", category: "girls", metric: "reps",
    matchers: ["cindy"],
    description: "AMRAP 20min: 5 pull-ups, 10 push-ups, 15 squats" },
  { key: "chelsea", label: "Chelsea", category: "girls", metric: "reps",
    matchers: ["chelsea"],
    description: "EMOM 30: 5 pull-ups, 10 push-ups, 15 squats" },
  { key: "jackie", label: "Jackie", category: "girls", metric: "time",
    matchers: ["jackie"],
    description: "1000m row + 50 thrusters (20 kg) + 30 pull-ups" },
  { key: "karen", label: "Karen", category: "girls", metric: "time",
    matchers: ["karen"],
    description: "150 wall balls (9/6 kg) for time" },
  { key: "annie", label: "Annie", category: "girls", metric: "time",
    matchers: ["annie"],
    description: "50-40-30-20-10 Double-unders + Sit-ups" },
  { key: "nancy", label: "Nancy", category: "girls", metric: "time",
    matchers: ["nancy"],
    description: "5 rounds: 400m run + 15 OHS (43/30 kg)" },
  { key: "mary", label: "Mary", category: "girls", metric: "reps",
    matchers: ["mary"],
    description: "AMRAP 20min: 5 HSPU, 10 pistols, 15 pull-ups" },
  { key: "isabel", label: "Isabel", category: "girls", metric: "time",
    matchers: ["isabel"],
    description: "30 Snatches for time (61/43 kg)" },
  { key: "linda", label: "Linda", category: "girls", metric: "time",
    matchers: ["linda", "three bars of death"],
    description: "10-9-8…1 Deadlift (1.5 BW) + Bench (BW) + Clean (0.75 BW)" },

  // Heroes
  { key: "murph", label: "Murph", category: "heroes", metric: "time",
    matchers: ["murph"],
    description: "1 mile run + 100 pull-ups + 200 push-ups + 300 squats + 1 mile run" },
  { key: "dt", label: "DT", category: "heroes", metric: "time",
    matchers: ["^dt$", "\\bdt\\b"],
    description: "5 rounds: 12 DL + 9 HPC + 6 PJ (70/47 kg)" },
  { key: "jt", label: "JT", category: "heroes", metric: "time",
    matchers: ["^jt$", "\\bjt\\b"],
    description: "21-15-9 HSPU + Ring dips + Push-ups" },
  { key: "kelly", label: "Kelly", category: "heroes", metric: "time",
    matchers: ["kelly"],
    description: "5 rounds: 400m run + 30 box jumps + 30 wall balls" },

  // Olympic lifts & strength PRs
  { key: "back_squat", label: "Back Squat", category: "lifts", metric: "weight",
    matchers: ["back squat", "sentadilla trasera", "sentadilla con barra"] },
  { key: "front_squat", label: "Front Squat", category: "lifts", metric: "weight",
    matchers: ["front squat", "sentadilla frontal"] },
  { key: "overhead_squat", label: "Overhead Squat", category: "lifts", metric: "weight",
    matchers: ["overhead squat", "ohs", "sentadilla sobre cabeza"] },
  { key: "deadlift", label: "Deadlift", category: "lifts", metric: "weight",
    matchers: ["deadlift", "peso muerto"] },
  { key: "bench_press", label: "Bench Press", category: "lifts", metric: "weight",
    matchers: ["bench press", "press banca", "press de banca"] },
  { key: "strict_press", label: "Strict Press", category: "lifts", metric: "weight",
    matchers: ["strict press", "shoulder press", "press militar"] },
  { key: "push_press", label: "Push Press", category: "lifts", metric: "weight",
    matchers: ["push press"] },
  { key: "push_jerk", label: "Push Jerk", category: "lifts", metric: "weight",
    matchers: ["push jerk", "split jerk"] },
  { key: "snatch", label: "Snatch", category: "lifts", metric: "weight",
    matchers: ["^snatch$", "arranque", "power snatch", "squat snatch"] },
  { key: "clean", label: "Clean", category: "lifts", metric: "weight",
    matchers: ["^clean$", "cargada", "power clean", "squat clean"] },
  { key: "clean_and_jerk", label: "Clean & Jerk", category: "lifts", metric: "weight",
    matchers: ["clean and jerk", "clean & jerk", "c&j", "clean+jerk"] },
  { key: "thruster", label: "Thruster", category: "lifts", metric: "weight",
    matchers: ["thruster"] },

  // Cardio standards
  { key: "run_400m", label: "400m Run", category: "cardio", metric: "time",
    matchers: ["400m run", "400 m run", "400m carrera", "carrera 400"] },
  { key: "run_1mile", label: "1 Mile Run", category: "cardio", metric: "time",
    matchers: ["1 mile", "mile run", "1-mile", "1600m", "milla"] },
  { key: "run_5k", label: "5K Run", category: "cardio", metric: "time",
    matchers: ["5k", "5 km", "5000m", "5 k run"] },
  { key: "row_500m", label: "500m Row", category: "cardio", metric: "time",
    matchers: ["500m row", "500 m row", "remo 500"] },
  { key: "row_2k", label: "2K Row", category: "cardio", metric: "time",
    matchers: ["2k row", "2000m row", "remo 2k", "remo 2000"] },
  { key: "assault_bike", label: "Assault Bike (cal)", category: "cardio", metric: "reps",
    matchers: ["assault bike", "echo bike", "air bike"] },

  // Gymnastics
  { key: "max_pullups", label: "Max Pull-ups (unbroken)", category: "gymnastics", metric: "reps",
    matchers: ["pull up", "pull-up", "dominada"] },
  { key: "max_hspu", label: "Max HSPU", category: "gymnastics", metric: "reps",
    matchers: ["hspu", "handstand push"] },
  { key: "max_mu", label: "Max Muscle-ups", category: "gymnastics", metric: "reps",
    matchers: ["muscle up", "muscle-up"] },
  { key: "max_du", label: "Max Double-unders", category: "gymnastics", metric: "reps",
    matchers: ["double under", "double-under", "du"] },
];

export function matchBenchmark(name: string): CrossfitBenchmark | null {
  const n = name.toLowerCase().trim();
  for (const b of CROSSFIT_BENCHMARKS) {
    for (const m of b.matchers) {
      if (m.startsWith("^") || m.includes("\\b")) {
        try {
          if (new RegExp(m, "i").test(n)) return b;
        } catch {
          /* skip bad regex */
        }
      } else if (n.includes(m.toLowerCase())) {
        return b;
      }
    }
  }
  return null;
}

/** Parse a free-text load into a numeric kg value, or null if un-parseable. */
export function parseLoadKg(input: string | null | undefined): number | null {
  if (!input) return null;
  const str = String(input).toLowerCase().trim();
  // "80kg", "80 kg", "80"
  const kgMatch = str.match(/(\d+(?:\.\d+)?)\s*k(?:g|ilos?)?/);
  if (kgMatch) return parseFloat(kgMatch[1]);
  // "180lb", "180 lbs"
  const lbMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/);
  if (lbMatch) return parseFloat(lbMatch[1]) * 0.453592;
  // Pure number: assume kg (metric users)
  const bareNum = str.match(/^(\d+(?:\.\d+)?)$/);
  if (bareNum) return parseFloat(bareNum[1]);
  // Multi-set notation "60/70/75" — take max
  const multi = str.match(/\d+(?:\.\d+)?/g);
  if (multi && multi.length > 1) {
    const nums = multi.map(parseFloat);
    return Math.max(...nums);
  }
  return null;
}

/** Parse "mm:ss", "m:ss", "90s", "1:23" to total seconds. */
export function parseTimeSec(input: string | null | undefined): number | null {
  if (!input) return null;
  const str = String(input).toLowerCase().trim();
  // mm:ss or hh:mm:ss
  const colon = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    if (colon[3]) return parseInt(colon[1]) * 3600 + parseInt(colon[2]) * 60 + parseInt(colon[3]);
    return parseInt(colon[1]) * 60 + parseInt(colon[2]);
  }
  // "90s"
  const sec = str.match(/^(\d+(?:\.\d+)?)\s*s(?:ec(?:onds?)?)?$/);
  if (sec) return parseFloat(sec[1]);
  // "2m"
  const min = str.match(/^(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?$/);
  if (min) return parseFloat(min[1]) * 60;
  // Pure number: assume seconds under 120, minutes otherwise? Risky — accept seconds.
  const bareNum = str.match(/^(\d+(?:\.\d+)?)$/);
  if (bareNum) return parseFloat(bareNum[1]);
  return null;
}

/** Parse reps / rounds counter. "15", "15 reps", "4 rounds + 3". */
export function parseReps(input: string | null | undefined): number | null {
  if (!input) return null;
  const str = String(input).toLowerCase().trim();
  // "4 rounds + 3" / "4+3" → 4*? no, just take the main number plus overflow
  const rounds = str.match(/(\d+)\s*(?:rounds?|r)?\s*\+\s*(\d+)/);
  if (rounds) return parseInt(rounds[1]) * 1 + parseInt(rounds[2]) / 100; // encode overflow as decimal
  const first = str.match(/\d+(?:\.\d+)?/);
  return first ? parseFloat(first[0]) : null;
}
