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
  const [showSuccess, setShowSuccess] = useState(false);

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
      // The server action always ends with a redirect() to re-render the
      // page with the updated state — Next throws a NEXT_REDIRECT to signal
      // it, which propagates past the try/catch. If we reach here it means
      // the action resolved without a redirect, which is still a success.
      setShowSuccess(true);
      setIsEditing(false);
      setTimeout(() => { window.location.reload(); }, 2000);
    } catch (err) {
      // Standard #1: NEVER show "Failed to save" for Next's internal
      // redirect/notFound signals — they ARE the success path. We MUST
      // re-throw them so Next can handle the navigation.
      const digest = (err as { digest?: string } | null)?.digest;
      if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")) {
        throw err;
      }
      console.error("Failed to save feedback:", err);
      alert("Failed to save feedback. Please try again — your data was NOT lost.");
    } finally {
      setIsPending(false);
    }
  };

  if (showSuccess) {
    return (
      <>
        {/* Success Modal Overlay */}
        <div className="fixed inset-0 bg-black/50 z-40" />
        {/* Success Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[var(--success-soft)] border-[var(--success)]/30">
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h2 className="text-2xl font-bold text-[var(--ink)]">Great job!</h2>
              <p className="text-sm text-[var(--ink-muted)]">
                Thank you for completing your workout and sharing your feedback. Your coach will review it and get in touch with you shortly.
              </p>
              <div className="text-xs text-[var(--ink-muted)] pt-2">
                Redirecting in a moment...
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

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
