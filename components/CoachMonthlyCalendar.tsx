"use client";

import { useState } from "react";
import { deleteSession, createSession, updateSession } from "@/app/[lang]/coach/programs/[id]/actions";
import { Card } from "./ui/Card";

interface SessionInfo {
  id: string;
  date: Date;
  day: string | null;
  focus: string | null;
  intensity: string | null;
  blocks: Array<{ id: string }>;
  sessionLog: { intensityFeedback: number | null; intensityReview: string | null } | null;
}

interface DayCell {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  session: SessionInfo | null;
}

export default function CoachMonthlyCalendar({
  sessions,
  programId,
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
    sessionLog: { intensityFeedback: number | null; intensityReview: string | null } | null;
  }>;
  programId: string;
  lang: string;
  dict: any;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Get today's date in YYYY-MM-DD format (local time)
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);

  // Build session map
  const sessionMap = new Map(
    sessions.map((s) => [s.date.toISOString().slice(0, 10), s])
  );

  // Helper function to get day of week from YYYY-MM-DD string
  const getDayOfWeek = (dateStr: string): number => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).getDay();
  };

  // Get calendar grid for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays: DayCell[] = [];

  // Get the first day of the month
  const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const startingDayOfWeek = getDayOfWeek(firstDayStr); // 0 = Sunday

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month's days
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthLastDay = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const dateStr = `${prevMonthYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(dateStr);
    calendarDays.push({
      date,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      session: sessionMap.get(dateStr) ?? null,
    });
  }

  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(dateStr);
    calendarDays.push({
      date,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      session: sessionMap.get(dateStr) ?? null,
    });
  }

  // Next month's days
  const remainingDays = 42 - calendarDays.length; // 6 rows × 7 days
  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;

  for (let day = 1; day <= remainingDays; day++) {
    const dateStr = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(dateStr);
    calendarDays.push({
      date,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      session: sessionMap.get(dateStr) ?? null,
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

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

  const handleSaveSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDate) return;

    const formData = new FormData(e.currentTarget);
    formData.set("programId", programId);
    formData.set("lang", lang);

    try {
      if (isEditMode && selectedSessionInfo) {
        // Update existing session
        formData.set("sessionId", selectedSessionInfo.id);
        await updateSession(formData);
        setIsEditMode(false);
      } else {
        // Create new session
        formData.set("date", selectedDate);
        await createSession(formData);
        setShowCreateForm(false);
      }
      setSelectedDate(null);
    } catch (err) {
      alert("Failed to save: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedDateObj = selectedDate ? new Date(selectedDate + "T00:00:00") : null;
  const selectedSessionInfo = selectedDate ? sessionMap.get(selectedDate) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">📅 Coach Calendar</h2>
        <button
          onClick={handleToday}
          className="px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--surface-2)] transition"
        >
          Today
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="px-4 py-2 rounded border border-[var(--border)] hover:bg-[var(--surface-2)] transition"
        >
          ← Prev
        </button>
        <h3 className="text-xl font-semibold min-w-[200px] text-center">{monthYear}</h3>
        <button
          onClick={handleNextMonth}
          className="px-4 py-2 rounded border border-[var(--border)] hover:bg-[var(--surface-2)] transition"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-2 text-center font-semibold text-sm text-[var(--ink-muted)]"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((cell) => (
          <div
            key={cell.dateStr}
            onClick={() => {
              setSelectedDate(cell.dateStr);
              setShowCreateForm(false);
            }}
            className={`min-h-24 p-2 border rounded cursor-pointer transition ${
              !cell.isCurrentMonth
                ? "bg-[var(--surface-1)] border-[var(--border)] opacity-50"
                : cell.isToday
                  ? "border-2 border-[var(--primary)] bg-[var(--primary-soft)]"
                  : "border-[var(--border)] hover:bg-[var(--surface-2)]"
            } ${selectedDate === cell.dateStr ? "ring-2 ring-[var(--primary)]" : ""}`}
          >
            <div className="flex justify-between items-start gap-1">
              <p className={`text-sm font-semibold ${cell.isCurrentMonth ? "" : "text-[var(--ink-muted)]"}`}>
                {cell.date.getDate()}
              </p>
              <div className="flex gap-1 flex-wrap">
                {cell.session && (
                  <span className="text-xs bg-[var(--primary)] text-white px-1.5 py-0.5 rounded">
                    {cell.session.blocks.length} block{cell.session.blocks.length !== 1 ? "s" : ""}
                  </span>
                )}
                {cell.session?.sessionLog && (
                  <span className="text-xs bg-[var(--success)] text-white px-1.5 py-0.5 rounded" title="Completed">
                    ✓ Done
                  </span>
                )}
                {cell.session?.sessionLog?.intensityFeedback && (
                  <span className="text-sm" title={["Easy", "Moderate", "Challenging", "Hard", "Intense"][cell.session.sessionLog.intensityFeedback - 1]}>
                    {["😊", "😐", "😓", "💪", "😤"][cell.session.sessionLog.intensityFeedback - 1]}
                  </span>
                )}
              </div>
            </div>
            {cell.session && (
              <p className="text-xs font-medium text-[var(--ink)] mt-1 truncate">
                {cell.session.focus || "Workout"}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Day Detail Panel */}
      {selectedDate && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold">
              {selectedDateObj?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              ✕
            </button>
          </div>

          {selectedSessionInfo ? (
            <div className="space-y-4">
              {!isEditMode ? (
                <>
                  <div className="bg-[var(--surface-2)] p-3 rounded space-y-2">
                    {selectedSessionInfo.focus && (
                      <p className="font-semibold">{selectedSessionInfo.focus}</p>
                    )}
                    <p className="text-sm text-[var(--ink-muted)]">
                      {selectedSessionInfo.blocks.length} block{selectedSessionInfo.blocks.length !== 1 ? "s" : ""}
                    </p>
                    {selectedSessionInfo.intensity && (
                      <p className="text-sm">
                        <span className="font-semibold">Intensity:</span> {selectedSessionInfo.intensity}
                      </p>
                    )}
                    {selectedSessionInfo.sessionLog?.intensityFeedback && (
                      <div className="pt-2 border-t border-[var(--border)]">
                        <p className="text-xs font-semibold text-[var(--ink-muted)] mb-2">Athlete Feedback</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">
                            {["😊", "😐", "😓", "💪", "😤"][selectedSessionInfo.sessionLog.intensityFeedback - 1]}
                          </span>
                          <span className="text-sm text-[var(--ink)]">
                            {["Easy", "Moderate", "Challenging", "Hard", "Intense"][selectedSessionInfo.sessionLog.intensityFeedback - 1]}
                          </span>
                        </div>
                        {selectedSessionInfo.sessionLog.intensityReview && (
                          <p className="text-xs text-[var(--ink-muted)] italic">{selectedSessionInfo.sessionLog.intensityReview}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="flex-1 text-sm px-3 py-2 rounded bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)]/10 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedSessionInfo.id)}
                      disabled={isDeleting === selectedSessionInfo.id}
                      className="flex-1 text-sm px-3 py-2 rounded bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)]/20 transition disabled:opacity-50"
                    >
                      {isDeleting === selectedSessionInfo.id ? "..." : "🗑️ Delete"}
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSaveSession} className="space-y-3">
                  <input
                    type="hidden"
                    name="day"
                    value={selectedDateObj?.toLocaleDateString("en-US", { weekday: "short" }) || ""}
                  />
                  <input
                    type="text"
                    name="focus"
                    placeholder="Focus (e.g., Upper Body)"
                    defaultValue={selectedSessionInfo.focus || ""}
                    className="w-full px-2 py-1.5 rounded border border-[var(--border)] text-sm"
                    required
                  />
                  <input
                    type="text"
                    name="intensity"
                    placeholder="Intensity (e.g., Hard)"
                    defaultValue={selectedSessionInfo.intensity || ""}
                    className="w-full px-2 py-1.5 rounded border border-[var(--border)] text-sm"
                  />
                  <textarea
                    name="notes"
                    placeholder="Notes (optional)"
                    rows={2}
                    className="w-full px-2 py-1.5 rounded border border-[var(--border)] text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-3 py-1.5 rounded bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="flex-1 px-3 py-1.5 rounded border border-[var(--border)] text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--ink-muted)]">No workout scheduled</p>
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full text-sm px-3 py-2 rounded bg-[var(--primary)] text-white hover:opacity-90 transition"
                >
                  + Add Workout
                </button>
              ) : (
                <form onSubmit={handleSaveSession} className="space-y-3">
                  <input
                    type="hidden"
                    name="day"
                    value={selectedDateObj?.toLocaleDateString("en-US", { weekday: "short" }) || ""}
                  />
                  <input
                    type="text"
                    name="focus"
                    placeholder="Focus (e.g., Upper Body)"
                    className="w-full px-2 py-1.5 rounded border border-[var(--border)] text-sm"
                    required
                  />
                  <input
                    type="text"
                    name="intensity"
                    placeholder="Intensity (e.g., Hard)"
                    className="w-full px-2 py-1.5 rounded border border-[var(--border)] text-sm"
                  />
                  <textarea
                    name="notes"
                    placeholder="Notes (optional)"
                    rows={2}
                    className="w-full px-2 py-1.5 rounded border border-[var(--border)] text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-3 py-1.5 rounded bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-3 py-1.5 rounded border border-[var(--border)] text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
