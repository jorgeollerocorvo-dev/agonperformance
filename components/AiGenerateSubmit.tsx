"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Submit button for the AI program-generation form. When the form is
 * pending, it shows:
 *   - a spinning icon
 *   - the elapsed seconds since submit (so the user sees it's actually
 *     working, not frozen)
 *   - an indeterminate progress bar underneath
 *
 * AI generation can take 15-60 seconds depending on program length, so a
 * bare "..." spinner was leaving coaches wondering if the thing had hung.
 *
 * The parent form stays a plain <form action={serverAction}> — no extra
 * client state plumbing; useFormStatus reads the native pending state.
 */
export default function AiGenerateSubmit({ label, pendingLabel }: { label: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!pending) {
      setElapsed(0);
      return;
    }
    setElapsed(1);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [pending]);

  const hint = !pending
    ? null
    : elapsed < 10
      ? "Enviando a la IA…"
      : elapsed < 25
        ? "La IA está pensando…"
        : elapsed < 45
          ? "Estructurando semanas y días…"
          : "Casi listo, puede tardar hasta 60s";

  return (
    <div className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[var(--ink)] text-[var(--bg)] px-6 py-3 font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {pending ? (
          <>
            <Spinner />
            <span>{pendingLabel ?? "Generando…"}</span>
            <span className="text-xs opacity-80 tabular-nums">{elapsed}s</span>
          </>
        ) : (
          <>⚡ {label}</>
        )}
      </button>
      {pending && (
        <>
          <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div className="h-full w-1/3 bg-[var(--primary)] rounded-full animate-indeterminate" />
          </div>
          <div className="text-xs text-[var(--ink-muted)] text-center">{hint}</div>
        </>
      )}
      {/* Local keyframe (styled-jsx) so we don't need a global CSS edit. */}
      <style jsx>{`
        @keyframes indeterminate {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-indeterminate {
          animation: indeterminate 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
