"use client";

import { useState } from "react";
import { saveSessionFeedback } from "@/app/[lang]/athlete/session/[id]/actions";
import { Card } from "./ui/Card";

interface IntensityReviewProps {
  sessionId: string;
  lang: string;
  initialFeedback?: number | null;
  initialReview?: string | null;
  dict: {
    intensityTitle?: string;
    intensityDescription?: string;
    easy?: string;
    moderate?: string;
    challenging?: string;
    hard?: string;
    intense?: string;
    reviewPlaceholder?: string;
    submit?: string;
    change?: string;
    cancel?: string;
  };
}

export default function IntensityReview({
  sessionId,
  lang,
  initialFeedback,
  initialReview,
  dict,
}: IntensityReviewProps) {
  const [feedback, setFeedback] = useState<number | null>(initialFeedback ?? null);
  const [review, setReview] = useState(initialReview ?? "");
  const [isEditing, setIsEditing] = useState(!initialFeedback);
  const [isPending, setIsPending] = useState(false);

  const emojis = ["😊", "😐", "😓", "💪", "😤"];
  const labels = [
    dict.easy ?? "Easy",
    dict.moderate ?? "Moderate",
    dict.challenging ?? "Challenging",
    dict.hard ?? "Hard",
    dict.intense ?? "Intense",
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!feedback) return;

    setIsPending(true);
    try {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("lang", lang);
      formData.set("intensityFeedback", String(feedback));
      formData.set("intensityReview", review);
      await saveSessionFeedback(formData);
    } catch (err) {
      console.error("Failed to save feedback:", err);
      alert("Failed to save feedback");
    } finally {
      setIsPending(false);
    }
  };

  if (!isEditing && initialFeedback && feedback) {
    return (
      <Card className="p-4 bg-[var(--success-soft)] border-[var(--success)]/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-[var(--ink-muted)] mb-2">
              {dict.intensityTitle ?? "How did the workout feel?"}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{emojis[feedback - 1]}</span>
              <span className="font-medium text-[var(--ink)]">{labels[feedback - 1]}</span>
            </div>
            {review && <p className="text-sm text-[var(--ink-muted)] italic">"{review}"</p>}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm px-3 py-1.5 rounded-full bg-[var(--success)] text-white hover:bg-[var(--success)]/90 transition shrink-0"
          >
            {dict.change ?? "Change"}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <p className="text-sm font-semibold mb-2">
            {dict.intensityTitle ?? "How did the workout feel?"}
          </p>
          <p className="text-xs text-[var(--ink-muted)] mb-3">
            {dict.intensityDescription ?? "Rate the intensity of this workout"}
          </p>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setFeedback(rating)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition ${
                  feedback === rating
                    ? "bg-[var(--primary-soft)] border-[var(--primary)]"
                    : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span className="text-2xl">{emojis[rating - 1]}</span>
                <span className="text-xs text-[var(--ink-muted)]">{labels[rating - 1]}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            {dict.reviewPlaceholder ?? "Optional: Tell me more"}
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="How did your body feel? Any pain, energy levels, or general thoughts?"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!feedback || isPending}
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition"
          >
            {isPending ? "..." : dict.submit ?? "Submit feedback"}
          </button>
          {initialFeedback && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--surface-2)] transition"
            >
              {dict.cancel ?? "Cancel"}
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
