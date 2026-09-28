"use client";

import { useState, useTransition, useEffect } from "react";
import {
  listCoJointCandidates,
  copyDayToAthlete,
} from "@/app/[lang]/coach/programs/[id]/actions";

type Candidate = {
  athleteId: string;
  athleteName: string;
  targetSessionId: string | null;
  isLinked: boolean;
};

/**
 * "Copy this day → another athlete" per-day button.
 *
 * Different from CoJointLinkButton (the chain icon): this is a one-shot copy,
 * not a persistent link. Used when a coach wants to reuse programming without
 * pairing the two athletes' sessions.
 *
 * UX: click → popover with a scrollable list of the coach's other athletes
 * → click one → wipe target's existing blocks and copy this day's blocks over.
 * Confirms before writing.
 *
 * Hidden until the day has been persisted (needs a sessionId to copy from).
 */
export default function CopyDayToAthleteButton({
  sessionId,
  date,
  programId,
  lang,
}: {
  sessionId: string | null;
  date: string; // YYYY-MM-DD — used as fallback when sessionId is stale
  programId: string;
  lang: string;
}) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  // Send date as the source identifier: it's stable across saves, whereas
  // sessionId can be stale after saveProgram (which delete+recreates rows).
  const sourceKey = date;

  useEffect(() => {
    if (!open || candidates !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await listCoJointCandidates(sourceKey, programId);
        if (!cancelled) setCandidates(r);
      } catch (e) {
        if (!cancelled) setLoadErr((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, candidates, sourceKey, programId]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition"
        title="Copy this day's workout to another athlete"
        aria-label="Copy day to another athlete"
      >
        📤
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl bg-white border border-[var(--border)] shadow-[var(--shadow-lg)] p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Copy this day to…</h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--ink-muted)] hover:text-[var(--ink)] text-base leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-[var(--ink-muted)] mb-3">
              Copies the whole workout (blocks + movements + notes) to the athlete&apos;s
              same-date session. Overwrites what&apos;s there. No link is created — the two
              days are independent afterwards.
            </p>

            {candidates === null && !loadErr && (
              <div className="text-xs text-[var(--ink-muted)] py-2">Loading…</div>
            )}
            {loadErr && <div className="text-xs text-[var(--danger)] py-2">✕ {loadErr}</div>}
            {candidates !== null && candidates.length === 0 && (
              <div className="text-xs text-[var(--ink-muted)] py-2">
                No other athletes to copy to. Add a second athlete first.
              </div>
            )}

            {candidates !== null && candidates.length > 0 && (
              <ul className="space-y-1 max-h-64 overflow-y-auto">
                {candidates.map((c) => {
                  const canCopy = !busy;
                  return (
                    <li key={c.athleteId}>
                      <form
                        action={async (fd) => {
                          if (!canCopy) return;
                          const ok = window.confirm(
                            `Copy this day to ${c.athleteName}? This will OVERWRITE their existing workout on the same date. Cannot be undone.`,
                          );
                          if (!ok) return;
                          startBusy(async () => {
                            try {
                              await copyDayToAthlete(fd);
                            } catch {
                              // redirect throws; ignore
                            }
                          });
                        }}
                        className="flex items-center justify-between gap-2 rounded-lg hover:bg-[var(--surface-2)] px-2 py-1.5"
                      >
                        <input type="hidden" name="sourceSessionId" value={sourceKey} />
                        <input type="hidden" name="sourceDate" value={date} />
                        <input type="hidden" name="targetAthleteId" value={c.athleteId} />
                        <input type="hidden" name="programId" value={programId} />
                        <input type="hidden" name="lang" value={lang} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{c.athleteName}</div>
                          <div className="text-[0.65rem] text-[var(--ink-muted)]">
                            {c.targetSessionId
                              ? c.isLinked
                                ? "Has a session (already co-joint linked)"
                                : "Overwrites existing session"
                              : "Will create a session on this date"}
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={!canCopy}
                          className="text-xs text-[var(--primary)] font-semibold hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            !c.targetSessionId
                              ? "Create a session on this date and copy the workout to it"
                              : "Overwrite their workout with this one"
                          }
                        >
                          Copy
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
