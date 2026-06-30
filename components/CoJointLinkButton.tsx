"use client";

import { useState, useTransition, useEffect } from "react";
import {
  listCoJointCandidates,
  linkCoJointSession,
  unlinkCoJointSession,
} from "@/app/[lang]/coach/programs/[id]/actions";

type Candidate = {
  athleteId: string;
  athleteName: string;
  targetSessionId: string | null;
  isLinked: boolean;
};

/**
 * Chain button shown on each day card. Click → fetches the coach's other
 * athletes that have a session on this date, shows a popover, lets the coach
 * pick one to link. Linked athletes show a "Linked" pill and an unlink option.
 *
 * Hidden when sessionId is null (the day hasn't been persisted yet — the
 * coach must save first).
 */
export default function CoJointLinkButton({
  sessionId,
  programId,
  lang,
  linkedWithName,
}: {
  sessionId: string | null;
  programId: string;
  lang: string;
  /** If this session is already linked, the (first) linked athlete's name to render as a badge. */
  linkedWithName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  useEffect(() => {
    if (!open || candidates !== null || !sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await listCoJointCandidates(sessionId, programId);
        if (!cancelled) setCandidates(r);
      } catch (e) {
        if (!cancelled) setLoadErr((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, candidates, sessionId, programId]);

  if (!sessionId) {
    return (
      <span
        title="Save this day first to link it"
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[var(--ink-subtle)] cursor-not-allowed"
      >
        🔗
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm transition ${
          linkedWithName
            ? "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
            : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        }`}
        title={linkedWithName ? `Linked with ${linkedWithName}` : "Link this workout to another athlete"}
        aria-label="Co-joint workout link"
      >
        🔗
      </button>

      {open && (
        <>
          {/* Click-away overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Popover */}
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl bg-white border border-[var(--border)] shadow-[var(--shadow-lg)] p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Co-joint workout</h4>
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
              Copy this workout to another athlete&apos;s same-date session. Loads stay as
              prescribed — adjust per athlete after.
            </p>

            {candidates === null && !loadErr && (
              <div className="text-xs text-[var(--ink-muted)] py-2">Loading…</div>
            )}
            {loadErr && (
              <div className="text-xs text-[var(--danger)] py-2">✕ {loadErr}</div>
            )}
            {candidates !== null && candidates.length === 0 && (
              <div className="text-xs text-[var(--ink-muted)] py-2">
                No other athletes available. Add a second athlete to your roster first.
              </div>
            )}

            {candidates !== null && candidates.length > 0 && (
              <ul className="space-y-1 max-h-64 overflow-y-auto">
                {candidates.map((c) => {
                  const disabled = !c.targetSessionId || busy;
                  return (
                    <li key={c.athleteId}>
                      {c.isLinked ? (
                        <form
                          action={async (fd) => {
                            startBusy(async () => {
                              try {
                                await unlinkCoJointSession(fd);
                              } catch {
                                // redirect throws; ignore
                              }
                            });
                          }}
                          className="flex items-center justify-between gap-2 rounded-lg bg-[var(--primary-soft)] px-2 py-1.5"
                        >
                          <input type="hidden" name="sessionId" value={sessionId} />
                          <input type="hidden" name="programId" value={programId} />
                          <input type="hidden" name="lang" value={lang} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">
                              🔗 {c.athleteName}
                            </div>
                            <div className="text-[0.65rem] text-[var(--ink-muted)]">Linked</div>
                          </div>
                          <button
                            type="submit"
                            disabled={busy}
                            className="text-xs text-[var(--danger)] hover:underline disabled:opacity-50"
                          >
                            Unlink
                          </button>
                        </form>
                      ) : (
                        <form
                          action={async (fd) => {
                            startBusy(async () => {
                              try {
                                await linkCoJointSession(fd);
                              } catch {
                                // redirect throws; ignore
                              }
                            });
                          }}
                          className="flex items-center justify-between gap-2 rounded-lg hover:bg-[var(--surface-2)] px-2 py-1.5"
                        >
                          <input type="hidden" name="sourceSessionId" value={sessionId} />
                          <input type="hidden" name="targetAthleteId" value={c.athleteId} />
                          <input type="hidden" name="programId" value={programId} />
                          <input type="hidden" name="lang" value={lang} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{c.athleteName}</div>
                            <div className="text-[0.65rem] text-[var(--ink-muted)]">
                              {c.targetSessionId ? "Has a session on this date" : "No session this date"}
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={disabled}
                            className="text-xs text-[var(--primary)] font-semibold hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              !c.targetSessionId
                                ? "This athlete has no session on this date — create their program covering it first."
                                : "Copy this workout to them"
                            }
                          >
                            Link
                          </button>
                        </form>
                      )}
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
