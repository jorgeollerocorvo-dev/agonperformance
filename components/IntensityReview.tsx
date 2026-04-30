"use client";

import { useState } from "react";

const EMOJI_LEVELS = [
  { level: 1, emoji: "😊", label: "Easy" },
  { level: 2, emoji: "😐", label: "Moderate" },
  { level: 3, emoji: "😓", label: "Challenging" },
  { level: 4, emoji: "💪", label: "Hard" },
  { level: 5, emoji: "😤", label: "Intense" },
];

export default function IntensityReview({
  currentFeedback,
  currentReview,
  isCompleted,
  dict,
}: {
  currentFeedback: number | null;
  currentReview: string | null;
  isCompleted: boolean;
  dict: any;
}) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(currentFeedback);
  const [review, setReview] = useState(currentReview || "");

  // If already completed, show in read-only mode
  if (isCompleted && currentFeedback !== null) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 mt-4">
        <p className="text-sm font-semibold text-[var(--ink-muted)] mb-3">Workout Intensity Review</p>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">
            {EMOJI_LEVELS.find((e) => e.level === currentFeedback)?.emoji || "—"}
          </span>
          <span className="text-sm text-[var(--ink)]">
            {EMOJI_LEVELS.find((e) => e.level === currentFeedback)?.label}
          </span>
        </div>
        {currentReview && <p className="text-sm text-[var(--ink-muted)] italic">{currentReview}</p>}
      </div>
    );
  }

  // Edit mode (before completion or not yet submitted)
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 mt-4">
      <p className="text-sm font-semibold text-[var(--ink-muted)] mb-4">
        {dict?.athlete?.intensityLabel ?? "How did this workout feel?"}
      </p>

      {/* Emoji Selection */}
      <div className="flex gap-3 mb-4 justify-between sm:justify-start">
        {EMOJI_LEVELS.map((item) => (
          <button
            key={item.level}
            type="button"
            onClick={() => setSelectedLevel(item.level)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
              selectedLevel === item.level
                ? "bg-[var(--primary)] text-white scale-110"
                : "hover:bg-[var(--surface-3)] text-[var(--ink-muted)]"
            }`}
            title={item.label}
          >
            <span className="text-3xl">{item.emoji}</span>
            <span className="text-xs hidden sm:block">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Hidden input to submit with form */}
      <input type="hidden" name="intensityFeedback" value={selectedLevel || ""} />

      {/* Review Text Area */}
      <textarea
        name="intensityReview"
        placeholder={dict?.athlete?.intensityPlaceholder ?? "Share any thoughts about this workout (optional)..."}
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />

      {/* Helper text */}
      <p className="text-xs text-[var(--ink-muted)] mt-2">
        {selectedLevel ? `Selected: ${EMOJI_LEVELS.find((e) => e.level === selectedLevel)?.label}` : "Click an emoji to rate intensity"}
      </p>
    </div>
  );
}
