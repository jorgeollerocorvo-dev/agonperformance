"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Per-set rest timer. Pure client, zero backend. Coach sets `defaultSec`
 * (from the movement's `rest` field); athlete taps to start, taps again to
 * reset. Emits a short beep + vibration when it hits zero.
 */
export default function RestTimer({ defaultSec = 90, label = "Descanso" }: { defaultSec?: number; label?: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function start() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(defaultSec);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r == null) return null;
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          try { navigator.vibrate?.(300); } catch {}
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 880;
            gain.gain.value = 0.2;
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
          } catch {}
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(null);
  }

  if (remaining == null) {
    return (
      <button
        type="button"
        onClick={start}
        className="text-xs rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] px-3 py-1"
      >
        ⏱ {label} {defaultSec}s
      </button>
    );
  }

  const done = remaining === 0;
  return (
    <button
      type="button"
      onClick={stop}
      className={`text-xs rounded-full px-3 py-1 font-semibold ${done ? "bg-emerald-500 text-white" : "bg-[var(--primary)] text-white"}`}
    >
      {done ? "✓ Listo" : `${remaining}s`}
    </button>
  );
}
