"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, ArrowCounterClockwise } from "@phosphor-icons/react";

type Mode = "forTime" | "emom" | "amrap" | "tabata";

/**
 * In-session workout timer. Pure client, zero backend. Supports the four
 * most-used CrossFit formats:
 *  - For Time: counts up until stopped
 *  - EMOM: beeps at the top of every minute, totals set
 *  - AMRAP: counts down from X minutes, athlete taps + for rounds
 *  - Tabata: 20s work / 10s rest × 8 rounds
 *
 * No autoplay beyond the beep the user explicitly started.
 */
export default function WorkoutTimer({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [mode, setMode] = useState<Mode>("forTime");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [amrapMinutes, setAmrapMinutes] = useState(10);
  const [emomMinutes, setEmomMinutes] = useState(10);
  const [rounds, setRounds] = useState(0);
  const prevSecondRef = useRef<number>(-1);

  // Core tick loop.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Beep on key boundaries (user-initiated → allowed).
  useEffect(() => {
    if (!running) return;
    if (prevSecondRef.current === elapsed) return;
    prevSecondRef.current = elapsed;
    if (mode === "emom" && elapsed > 0 && elapsed % 60 === 0) {
      beep();
      if (elapsed >= emomMinutes * 60) stop();
    } else if (mode === "amrap" && elapsed >= amrapMinutes * 60) {
      beep(880, 0.6);
      stop();
    } else if (mode === "tabata") {
      const total = 30; // 20s on + 10s off
      const cycle = Math.floor(elapsed / total);
      const phase = elapsed % total;
      if (cycle >= 8) { beep(880, 0.6); stop(); return; }
      if (phase === 0 || phase === 20) beep();
    }
  }, [elapsed, mode, running, amrapMinutes, emomMinutes]);

  function start() {
    setElapsed(0);
    setRounds(0);
    prevSecondRef.current = -1;
    setRunning(true);
  }
  function stop() { setRunning(false); }
  function reset() { setRunning(false); setElapsed(0); setRounds(0); }

  const displayMMSS = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  // Count-down for AMRAP, count-up otherwise.
  const displayValue =
    mode === "amrap" ? displayMMSS(Math.max(0, amrapMinutes * 60 - elapsed))
    : mode === "tabata" ? (() => {
        const cycle = Math.floor(elapsed / 30);
        const phase = elapsed % 30;
        if (cycle >= 8) return "✓";
        const inWork = phase < 20;
        const remaining = inWork ? 20 - phase : 30 - phase;
        return `${inWork ? "💪" : "😴"} ${remaining}s`;
      })()
    : displayMMSS(elapsed);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-xs rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
        <Timer size={14} weight="duotone" /> Timer
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Timer size={16} weight="duotone" className="text-[var(--primary)]" />
          Workout timer
        </div>
        {compact && <button onClick={() => setOpen(false)} className="text-xs text-[var(--ink-muted)]">✕</button>}
      </div>
      <div className="flex gap-1 flex-wrap">
        {(["forTime", "emom", "amrap", "tabata"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); reset(); }}
            disabled={running}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${mode === m ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]" : "bg-[var(--surface-2)] border-transparent"}`}
          >
            {m === "forTime" ? "For Time" : m.toUpperCase()}
          </button>
        ))}
      </div>
      {(mode === "amrap" || mode === "emom") && !running && (
        <label className="text-xs flex items-center gap-2">
          <span className="text-[var(--ink-muted)]">Duración (min)</span>
          <input
            type="number"
            min="1"
            max="60"
            value={mode === "amrap" ? amrapMinutes : emomMinutes}
            onChange={(e) => (mode === "amrap" ? setAmrapMinutes : setEmomMinutes)(parseInt(e.target.value) || 10)}
            className="w-16 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5"
          />
        </label>
      )}
      <div className="text-5xl font-mono text-center font-bold py-2 tabular-nums">{displayValue}</div>
      {mode === "amrap" && running && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setRounds((r) => Math.max(0, r - 1))} className="w-10 h-10 rounded-full bg-[var(--surface-2)] text-xl">−</button>
          <div className="text-sm">Rounds: <span className="font-bold text-lg">{rounds}</span></div>
          <button onClick={() => setRounds((r) => r + 1)} className="w-10 h-10 rounded-full bg-[var(--primary)] text-white text-xl font-bold">+</button>
        </div>
      )}
      <div className="flex gap-2 justify-center">
        {!running ? (
          <button onClick={start} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 text-white px-4 py-2 font-semibold">
            <Play size={14} weight="fill" /> Start
          </button>
        ) : (
          <button onClick={stop} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-2 font-semibold">
            <Pause size={14} weight="fill" /> Pausa
          </button>
        )}
        <button onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-4 py-2">
          <ArrowCounterClockwise size={14} /> Reset
        </button>
      </div>
    </div>
  );
}

function beep(freq = 660, dur = 0.2) {
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.25;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    try { navigator.vibrate?.(120); } catch {}
  } catch {}
}
