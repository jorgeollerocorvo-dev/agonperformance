import { prisma } from "@/lib/prisma";
import { parseLoadKg, parseTimeSec, parseReps, matchBenchmark, type BenchmarkMetric } from "@/lib/crossfit-benchmarks";

export type EvolutionPoint = {
  date: string;      // YYYY-MM-DD
  weightKg?: number; // for lifts
  timeSec?: number;  // for metcons / cardio
  reps?: number;     // for AMRAPs / max-reps
  raw: string;       // original string the athlete typed
};

export type EvolutionSeries = {
  /** Stable key — benchmark key when matched, else the normalized name */
  key: string;
  label: string;
  isBenchmark: boolean;
  category: "girls" | "heroes" | "lifts" | "cardio" | "gymnastics" | "custom";
  metric: BenchmarkMetric;
  points: EvolutionPoint[];
  /** Best value across all points — PR / fastest time / best AMRAP */
  best: EvolutionPoint | null;
};

/**
 * Build evolution series for an athlete.
 *
 * Sources:
 *   - SessionLog.actuals — the athlete's logged weight/reps/time per
 *     ProgramMovement (join to resolve the movement name)
 *   - TestResult — explicit test entries (if any)
 *
 * Grouping:
 *   - Any movement name matching one of the CrossFit benchmarks becomes a
 *     benchmark series (keyed by its benchmark.key).
 *   - Everything else is grouped by its lowercased canonical name.
 *   - Each series is sorted chronologically, best point computed.
 *
 * Standard #2: this is READ-ONLY aggregation — no AI, no YouTube, no
 * mutations. Runs on page load and must complete <1s on warm Neon.
 */
export async function loadAthleteEvolution(athleteId: string): Promise<EvolutionSeries[]> {
  const [logs, tests] = await Promise.all([
    prisma.sessionLog.findMany({
      where: { athleteId },
      select: {
        completedAt: true,
        actuals: true,
        programSession: {
          select: {
            date: true,
            blocks: {
              select: {
                movements: {
                  select: {
                    id: true,
                    customName: true,
                    movement: { select: { nameEn: true, code: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.testResult.findMany({
      where: { athleteId },
      include: { movement: { select: { nameEn: true, code: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const seriesByKey = new Map<string, EvolutionSeries>();

  function upsert(name: string, point: EvolutionPoint) {
    const bench = matchBenchmark(name);
    const key = bench?.key ?? name.toLowerCase().trim();
    if (!key) return;
    let s = seriesByKey.get(key);
    if (!s) {
      s = {
        key,
        label: bench?.label ?? titleCase(name),
        isBenchmark: !!bench,
        category: bench?.category ?? "custom",
        metric: bench?.metric ?? guessMetric(point),
        points: [],
        best: null,
      };
      seriesByKey.set(key, s);
    }
    s.points.push(point);
  }

  // Walk SessionLog.actuals: a map of programMovementId → {load, reps, time, notes}
  for (const log of logs) {
    if (!log.actuals || typeof log.actuals !== "object") continue;
    const actuals = log.actuals as Record<string, { load?: string; reps?: string; time?: string; notes?: string }>;
    if (!log.programSession) continue;
    const date = log.programSession.date.toISOString().slice(0, 10);
    const nameById = new Map<string, string>();
    for (const b of log.programSession.blocks) {
      for (const m of b.movements) {
        nameById.set(m.id, m.movement?.nameEn ?? m.customName ?? "");
      }
    }
    for (const [movementId, actual] of Object.entries(actuals)) {
      const name = nameById.get(movementId);
      if (!name) continue;
      const weightKg = parseLoadKg(actual.load) ?? undefined;
      const timeSec = parseTimeSec(actual.time) ?? undefined;
      const reps = parseReps(actual.reps) ?? undefined;
      if (weightKg == null && timeSec == null && reps == null) continue;
      upsert(name, {
        date,
        weightKg,
        timeSec,
        reps,
        raw: [actual.load, actual.reps, actual.time].filter(Boolean).join(" · "),
      });
    }
  }

  // TestResult (legacy explicit tests). Schema stores resultValue + resultUnit
  // (e.g. 100, "kg"); we route to weight/time/reps by the unit string.
  for (const t of tests) {
    const name = t.movement?.nameEn ?? t.customMovement ?? "";
    if (!name) continue;
    const value = t.resultValue != null ? Number(t.resultValue) : null;
    if (value == null) continue;
    const unit = (t.resultUnit ?? "").toLowerCase();
    const isTime = /s|sec|min|time/.test(unit);
    const isReps = /reps|rounds|count/.test(unit);
    upsert(name, {
      date: t.date.toISOString().slice(0, 10),
      weightKg: !isTime && !isReps ? value : undefined,
      timeSec: isTime ? value : undefined,
      reps: isReps ? value : undefined,
      raw: `${value}${unit ? ` ${unit}` : ""}`,
    });
  }

  // Sort each series chronologically + compute "best" point.
  const result = Array.from(seriesByKey.values());
  for (const s of result) {
    s.points.sort((a, b) => a.date.localeCompare(b.date));
    s.best = pickBest(s.points, s.metric);
  }

  // Benchmarks first (sorted by category then label), then customs (by label).
  result.sort((a, b) => {
    if (a.isBenchmark !== b.isBenchmark) return a.isBenchmark ? -1 : 1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.label.localeCompare(b.label);
  });
  return result;
}

function pickBest(points: EvolutionPoint[], metric: BenchmarkMetric): EvolutionPoint | null {
  if (points.length === 0) return null;
  if (metric === "weight") {
    return points.reduce((best, p) => ((p.weightKg ?? -Infinity) > (best.weightKg ?? -Infinity) ? p : best), points[0]);
  }
  if (metric === "time") {
    return points.reduce((best, p) => ((p.timeSec ?? Infinity) < (best.timeSec ?? Infinity) ? p : best), points[0]);
  }
  return points.reduce((best, p) => ((p.reps ?? -Infinity) > (best.reps ?? -Infinity) ? p : best), points[0]);
}

function guessMetric(p: EvolutionPoint): BenchmarkMetric {
  if (p.weightKg != null) return "weight";
  if (p.timeSec != null) return "time";
  return "reps";
}

function titleCase(s: string): string {
  return s.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

