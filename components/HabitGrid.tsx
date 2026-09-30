"use client";

import { useTransition } from "react";
import { toggleHabitLog } from "@/app/[lang]/athlete/engagement/actions";

type Habit = { id: string; name: string; icon: string | null; targetPerWeek: number };
type LogEntry = { habitId: string; date: string; completed: boolean };

/**
 * 7-day rolling habit grid: rows = habits, columns = last 7 days ending today.
 * Tap a cell to toggle. Streak of consecutive completed days shown on the left.
 */
export default function HabitGrid({ habits, logs }: { habits: Habit[]; logs: LogEntry[] }) {
  const [pending, start] = useTransition();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const logSet = new Set(logs.filter((l) => l.completed).map((l) => `${l.habitId}:${l.date}`));

  function streakOf(habitId: string): number {
    // Count consecutive completed days ending today (or yesterday if today
    // hasn't been ticked yet — so a partial day doesn't reset the streak).
    let streak = 0;
    const start = new Date(today);
    if (!logSet.has(`${habitId}:${today.toISOString().slice(0, 10)}`)) {
      start.setDate(start.getDate() - 1);
    }
    for (let i = 0; i < 60; i++) {
      const key = `${habitId}:${new Date(start).toISOString().slice(0, 10)}`;
      if (logSet.has(key)) {
        streak++;
        start.setDate(start.getDate() - 1);
      } else break;
    }
    return streak;
  }

  function toggle(habitId: string, date: string) {
    const fd = new FormData();
    fd.set("habitId", habitId);
    fd.set("date", date);
    start(() => toggleHabitLog(fd));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_repeat(7,1.75rem)] gap-1 items-center text-[0.65rem] text-[var(--ink-muted)] pl-1">
        <div />
        {days.map((d) => (
          <div key={d} className="text-center">{d.slice(8)}</div>
        ))}
      </div>
      {habits.map((h) => {
        const streak = streakOf(h.id);
        return (
          <div key={h.id} className="grid grid-cols-[1fr_repeat(7,1.75rem)] gap-1 items-center">
            <div className="text-sm truncate flex items-center gap-2 pr-2">
              {h.icon && <span className="text-base">{h.icon}</span>}
              <span className="truncate">{h.name}</span>
              {streak > 0 && (
                <span className="text-[0.65rem] font-semibold text-orange-600 shrink-0">🔥 {streak}</span>
              )}
            </div>
            {days.map((d) => {
              const done = logSet.has(`${h.id}:${d}`);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={pending}
                  onClick={() => toggle(h.id, d)}
                  className={`h-7 w-7 rounded-md text-xs transition ${done ? "bg-emerald-500 text-white" : "bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-transparent"}`}
                  aria-label={`${h.name} on ${d}`}
                >
                  ✓
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
