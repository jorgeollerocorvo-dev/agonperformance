"use client";

import { useState } from "react";
import { deleteSession, createSession } from "@/app/[lang]/coach/programs/[id]/actions";
import { Card } from "./ui/Card";

interface SessionInfo {
  id: string;
  date: Date;
  day: string | null;
  focus: string | null;
  intensity: string | null;
  blockCount: number;
}

interface Day {
  date: Date;
  dateStr: string;
  dayName: string;
  session: SessionInfo | null;
  isToday: boolean;
  isPast: boolean;
}

export default function CoachProgramCalendar({
  sessions,
  programId,
  startDate,
  durationWeeks,
  lang,
  dict,
}: {
  sessions: Array<{
    id: string;
    date: Date;
    day: string | null;
    focus: string | null;
    intensity: string | null;
    blocks: Array<{ id: string }>;
  }>;
  programId: string;
  startDate: Date;
  durationWeeks: number;
  lang: string;
  dict: any;
}) {
  const [showCreateForm, setShowCreateForm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Build calendar grid
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionMap = new Map(
    sessions.map((s) => [s.date.toISOString().slice(0, 10), s])
  );

  const weeks: Day[][] = [];
  const programStart = new Date(startDate);
  programStart.setHours(0, 0, 0, 0);

  for (let w = 0; w < durationWeeks; w++) {
    const week: Day[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(programStart);
      date.setDate(date.getDate() + w * 7 + d);
      const dateStr = date.toISOString().slice(0, 10);
      const session = sessionMap.get(dateStr);

      week.push({
        date,
        dateStr,
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        session: session
          ? {
              id: session.id,
              date: session.date,
              day: session.day,
              focus: session.focus,
              intensity: session.intensity,
              blockCount: session.blocks.length,
            }
          : null,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
      });
    }
    weeks.push(week);
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Delete this workout?")) return;
    setIsDeleting(sessionId);
    try {
      await deleteSession(sessionId, programId, lang);
    } catch (err) {
      alert("Failed to delete: " + (err instanceof Error ? err.message : "Unknown error"));
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Workout Calendar</h2>

      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="space-y-3">
          <h3 className="font-semibold text-[var(--ink-muted)]">
            Week {weekIdx + 1}
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {week.map((day) => (
              <Card
                key={day.dateStr}
                className={`p-3 text-sm transition ${
                  day.isToday
                    ? "border-[var(--primary)] border-2 bg-[var(--primary-soft)]"
                    : day.isPast
                      ? "opacity-75"
                      : ""
                }`}
              >
                <div className="mb-2">
                  <p className="font-semibold text-xs">{day.dayName}</p>
                  <p className="text-xs text-[var(--ink-muted)]">{day.dateStr}</p>
                </div>

                {day.session ? (
                  <div className="space-y-2">
                    <div className="rounded bg-[var(--surface-2)] p-2 space-y-1">
                      {day.session.focus && (
                        <p className="text-xs font-semibold">{day.session.focus}</p>
                      )}
                      <p className="text-xs text-[var(--ink-muted)]">
                        {day.session.blockCount} block{day.session.blockCount !== 1 ? "s" : ""}
                      </p>
                      {day.session.intensity && (
                        <p className="text-xs">
                          <span className="font-semibold">Intensity:</span> {day.session.intensity}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(day.session!.id)}
                      disabled={isDeleting === day.session!.id}
                      className="w-full text-xs px-2 py-1 rounded bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)]/20 transition disabled:opacity-50"
                    >
                      {isDeleting === day.session!.id ? "..." : "🗑️ Delete"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateForm(day.dateStr)}
                    className="w-full text-xs px-2 py-1 rounded border border-dashed border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--surface-2)] transition"
                  >
                    + Add
                  </button>
                )}

                {showCreateForm === day.dateStr && (
                  <form
                    action={createSession}
                    className="mt-2 space-y-2 bg-[var(--surface-2)] p-2 rounded text-xs"
                    onSubmit={() => setShowCreateForm(null)}
                  >
                    <input type="hidden" name="programId" value={programId} />
                    <input type="hidden" name="date" value={day.dateStr} />
                    <input type="hidden" name="day" value={day.dayName} />
                    <input type="hidden" name="lang" value={lang} />

                    <input
                      type="text"
                      name="focus"
                      placeholder="Focus (e.g., Upper Body)"
                      className="w-full px-2 py-1 rounded border border-[var(--border)] text-xs"
                    />
                    <input
                      type="text"
                      name="intensity"
                      placeholder="Intensity (e.g., Hard)"
                      className="w-full px-2 py-1 rounded border border-[var(--border)] text-xs"
                    />
                    <textarea
                      name="notes"
                      placeholder="Notes (optional)"
                      rows={2}
                      className="w-full px-2 py-1 rounded border border-[var(--border)] text-xs"
                    />

                    <div className="flex gap-1">
                      <button
                        type="submit"
                        className="flex-1 px-2 py-1 rounded bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(null)}
                        className="flex-1 px-2 py-1 rounded border border-[var(--border)] text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
