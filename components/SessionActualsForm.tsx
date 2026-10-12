"use client";

import { useState, useTransition, useEffect } from "react";
import confetti from "canvas-confetti";
import { saveActuals } from "@/app/[lang]/athlete/session/[id]/actions";
import { parseLoadKg } from "@/lib/crossfit-benchmarks";

type Movement = {
  id: string;
  name: string;
  blockCode: string;
  idx: number;
  prescribedLoad: string | null;
  prescribedReps: string | null;
  /** Athlete's previous best weight for this movement (kg). null if first time. */
  previousBestKg?: number | null;
};

type ActualsMap = Record<string, { load?: string; reps?: string; time?: string; notes?: string }>;

/**
 * Per-movement actuals form. Athlete fills in what they actually did:
 * weight used, reps completed, time (for timed movements), optional note.
 * Stored on SessionLog.actuals as a map keyed by programMovementId — the
 * evolution chart reads from exactly here.
 */
export default function SessionActualsForm({
  sessionId,
  lang,
  movements,
  initialActuals,
}: {
  sessionId: string;
  lang: string;
  movements: Movement[];
  initialActuals: ActualsMap;
}) {
  const [actuals, setActuals] = useState<ActualsMap>(initialActuals);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [newPRs, setNewPRs] = useState<{ name: string; from: number | null; to: number }[]>([]);

  const update = (id: string, field: keyof NonNullable<ActualsMap[string]>, val: string) => {
    setActuals((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: val } }));
    setSaved(false);
  };

  // PR detection: compare each movement's logged load against previousBestKg.
  // Fired right on submit so the celebration lands with the save.
  function detectPRs(): { name: string; from: number | null; to: number }[] {
    const prs: { name: string; from: number | null; to: number }[] = [];
    for (const m of movements) {
      const a = actuals[m.id];
      if (!a?.load) continue;
      const kg = parseLoadKg(a.load);
      if (kg == null) continue;
      const prev = m.previousBestKg ?? null;
      if (prev == null || kg > prev) {
        prs.push({ name: m.name, from: prev, to: kg });
      }
    }
    return prs;
  }

  function celebratePRs(prs: { name: string; from: number | null; to: number }[]) {
    if (prs.length === 0) return;
    // Dopamine burst: dense confetti from the bottom-center, two gentle bursts.
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.75 }, scalar: 0.95 });
    setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { y: 0.75 }, scalar: 0.85 }), 180);
  }

  function submit() {
    const prs = detectPRs();
    const fd = new FormData();
    fd.set("sessionId", sessionId);
    fd.set("lang", lang);
    for (const m of movements) {
      const a = actuals[m.id];
      if (!a) continue;
      if (a.load != null) fd.set(`actual.${m.id}.load`, a.load);
      if (a.reps != null) fd.set(`actual.${m.id}.reps`, a.reps);
      if (a.time != null) fd.set(`actual.${m.id}.time`, a.time);
      if (a.notes != null) fd.set(`actual.${m.id}.notes`, a.notes);
    }
    start(async () => {
      try {
        await saveActuals(fd);
        setSaved(true);
        setNewPRs(prs);
        celebratePRs(prs);
      } catch (err) {
        // Re-throw NEXT_REDIRECT so navigation works — Next's redirect from
        // the server action is the success path, not a failure (standard #1).
        const digest = (err as { digest?: string } | null)?.digest;
        if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")) {
          throw err;
        }
        /* actual error — the server action already redirected with ?saveErr */
      }
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">Lo que has hecho</h3>
        {saved && <span className="text-xs text-emerald-600">✓ Guardado</span>}
      </div>
      {newPRs.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200 p-3">
          <div className="text-sm font-bold text-amber-900 mb-1">🎉 ¡Nuevo PR!</div>
          <ul className="text-xs text-amber-900 space-y-0.5">
            {newPRs.map((p) => (
              <li key={p.name}>
                <span className="font-semibold">{p.name}</span>:{" "}
                {p.from != null ? `${p.from.toFixed(1)} → ` : ""}
                <AnimatedNumber from={p.from ?? p.to * 0.9} to={p.to} /> kg
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-[var(--ink-muted)]">Peso, reps o tiempo real de cada ejercicio. Opcional — se guarda a medida.</p>
      <ul className="space-y-3">
        {movements.map((m) => {
          const a = actuals[m.id] ?? {};
          return (
            <li key={m.id} className="rounded-lg bg-[var(--surface-2)]/60 p-3 space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[0.65rem] font-bold text-[var(--ink-subtle)]">{m.blockCode}{m.idx + 1}</span>
                <span className="text-sm font-medium flex-1">{m.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs">
                  <span className="block text-[var(--ink-muted)] mb-0.5">Peso</span>
                  <input
                    value={a.load ?? ""}
                    onChange={(e) => update(m.id, "load", e.target.value)}
                    placeholder={m.prescribedLoad ?? "kg"}
                    className={inputCls}
                  />
                </label>
                <label className="text-xs">
                  <span className="block text-[var(--ink-muted)] mb-0.5">Reps</span>
                  <input
                    value={a.reps ?? ""}
                    onChange={(e) => update(m.id, "reps", e.target.value)}
                    placeholder={m.prescribedReps ?? "x"}
                    className={inputCls}
                  />
                </label>
                <label className="text-xs">
                  <span className="block text-[var(--ink-muted)] mb-0.5">Tiempo</span>
                  <input
                    value={a.time ?? ""}
                    onChange={(e) => update(m.id, "time", e.target.value)}
                    placeholder="mm:ss"
                    className={inputCls}
                  />
                </label>
              </div>
              {(a.notes || a.load || a.reps || a.time) && (
                <input
                  value={a.notes ?? ""}
                  onChange={(e) => update(m.id, "notes", e.target.value)}
                  placeholder="Notas (opcional)"
                  className={`${inputCls} w-full`}
                />
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar lo hecho"}
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm outline-none focus:border-[var(--primary)]";

/**
 * Lightweight count-up: tweens a number for the duration without pulling in a
 * full animation library. Used on the PR celebration tile.
 */
function AnimatedNumber({ from, to, ms = 1200 }: { from: number; to: number; ms?: number }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, ms]);
  return <span className="font-bold">{value.toFixed(1)}</span>;
}
