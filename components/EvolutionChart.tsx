"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

type Point = {
  date: string;
  weightKg?: number;
  timeSec?: number;
  reps?: number;
};

type Series = {
  key: string;
  label: string;
  isBenchmark: boolean;
  category: string;
  metric: "time" | "weight" | "reps";
  points: Point[];
  best: Point | null;
};

/**
 * Per-athlete evolution dashboard. Groups series by category tabs
 * (Benchmarks / Lifts / Cardio / Gymnastics / Custom) and renders one
 * compact chart per movement, with the PR / best time highlighted.
 */
export default function EvolutionChart({ series }: { series: Series[] }) {
  const categories = Array.from(new Set(series.map((s) => (s.isBenchmark ? s.category : "custom"))));
  const [tab, setTab] = useState<string>(categories[0] ?? "custom");
  const visible = series.filter((s) => (s.isBenchmark ? s.category === tab : tab === "custom"));

  if (series.length === 0) {
    return (
      <div className="text-sm text-[var(--ink-muted)] p-4 rounded-xl bg-[var(--surface-2)]/60 text-center">
        Aún no hay registros. Cuando el atleta anote pesos o tiempos en sus sesiones aparecerán aquí.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setTab(c)}
            className={`text-xs px-3 py-1.5 rounded-full border ${tab === c ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "bg-white border-[var(--border)]"}`}
          >
            {catLabel(c)} ({series.filter((s) => (s.isBenchmark ? s.category === c : c === "custom")).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((s) => (
          <SeriesCard key={s.key} series={s} />
        ))}
      </div>
    </div>
  );
}

function SeriesCard({ series }: { series: Series }) {
  // Pointer-tracked spotlight — subtle, no third-party JS, matches the
  // Aceternity-style effect from the audit report. Only re-renders inline
  // CSS variables, so cheap.
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };
  const data = series.points.map((p) => ({
    date: p.date,
    value: series.metric === "weight" ? p.weightKg : series.metric === "time" ? p.timeSec : p.reps,
  }));

  const bestFormatted =
    series.best
      ? series.metric === "weight"
        ? `${series.best.weightKg?.toFixed(1)} kg`
        : series.metric === "time"
        ? formatTime(series.best.timeSec)
        : `${series.best.reps}`
      : "—";

  return (
    <div
      onMouseMove={onMove}
      className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2 overflow-hidden transition-shadow hover:shadow-md"
      style={{ ["--mx" as string]: "50%", ["--my" as string]: "50%" }}
    >
      {/* Spotlight overlay — appears on hover, follows the pointer. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(400px circle at var(--mx) var(--my), ${series.isBenchmark ? "rgba(79, 70, 229, 0.14)" : "rgba(5, 150, 105, 0.14)"}, transparent 70%)`,
        }}
      />
      <div className="relative flex items-baseline justify-between gap-2">
        <div className="font-semibold text-sm truncate">{series.label}</div>
        <div className="text-xs">
          <span className="text-[var(--ink-muted)]">{series.metric === "time" ? "Best:" : "PR:"}</span>{" "}
          <span className="font-bold text-[var(--primary)]">{bestFormatted}</span>
        </div>
      </div>
      {data.length > 1 ? (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis
                tick={{ fontSize: 9 }}
                tickFormatter={series.metric === "time" ? (v: number) => formatTime(v) : undefined}
                reversed={series.metric === "time"}
              />
              <Tooltip
                formatter={(value) => [series.metric === "time" ? formatTime(Number(value)) : String(value), series.label] as [string, string]}
              />
              <Line type="monotone" dataKey="value" stroke={series.isBenchmark ? "#4f46e5" : "#059669"} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="relative text-xs text-[var(--ink-muted)]">
          Solo 1 entrada ({series.points[0]?.date}). Añade más para ver evolución.
        </div>
      )}
      <div className="relative text-[0.65rem] text-[var(--ink-subtle)]">
        {series.points.length} {series.points.length === 1 ? "entrada" : "entradas"} · desde {series.points[0]?.date}
      </div>
    </div>
  );
}

function formatTime(sec: number | null | undefined): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function catLabel(c: string): string {
  return {
    girls: "The Girls",
    heroes: "Heroes",
    lifts: "Lifts (PR)",
    cardio: "Cardio",
    gymnastics: "Gimnasia",
    custom: "Otros",
  }[c] ?? c;
}
