"use client";

import { useMemo, useState } from "react";
import { Calculator } from "@phosphor-icons/react";

/**
 * Classic 1RM estimators side-by-side. Zero deps, pure math — the three
 * most-cited formulas in strength coaching. Shown in a collapsed <details>
 * so it doesn't crowd the program builder.
 *
 * Epley:   1RM = weight * (1 + reps/30)
 * Brzycki: 1RM = weight * (36 / (37 - reps))
 * Lombardi:1RM = weight * reps^0.10
 */
export default function OneRmCalculator() {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const results = useMemo(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (!w || !r || r < 1 || r > 20) return null;
    const epley = w * (1 + r / 30);
    const brzycki = r >= 37 ? 0 : w * (36 / (37 - r));
    const lombardi = w * Math.pow(r, 0.1);
    const avg = (epley + brzycki + lombardi) / 3;
    return { epley, brzycki, lombardi, avg };
  }, [weight, reps]);

  return (
    <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm group">
      <summary className="cursor-pointer flex items-center gap-2 font-semibold list-none">
        <Calculator size={18} weight="duotone" className="text-[var(--primary)]" />
        Calculadora 1RM
        <span className="ml-auto text-xs text-[var(--ink-muted)] group-open:rotate-180 transition">▾</span>
      </summary>
      <div className="pt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="block text-xs text-[var(--ink-muted)]">Peso (kg)</span>
            <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.5" placeholder="80" className={inputCls} />
          </label>
          <label>
            <span className="block text-xs text-[var(--ink-muted)]">Reps hechas</span>
            <input value={reps} onChange={(e) => setReps(e.target.value)} type="number" min="1" max="20" placeholder="5" className={inputCls} />
          </label>
        </div>
        {results ? (
          <div className="grid grid-cols-4 gap-2 pt-2">
            <Tile label="Epley" value={results.epley} />
            <Tile label="Brzycki" value={results.brzycki} />
            <Tile label="Lombardi" value={results.lombardi} />
            <Tile label="Promedio" value={results.avg} primary />
          </div>
        ) : (
          <p className="text-xs text-[var(--ink-muted)]">Introduce peso y reps (1-20) para estimar tu 1RM.</p>
        )}
      </div>
    </details>
  );
}

function Tile({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${primary ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)]"}`}>
      <div className="font-bold text-base">{value.toFixed(1)}</div>
      <div className="text-[0.6rem] uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm outline-none focus:border-[var(--primary)]";
