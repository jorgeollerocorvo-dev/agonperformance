"use client";

/**
 * Confirms before submitting a week-delete (or week-purge) form.
 *
 * Why a separate client component:
 *   onSubmit handlers require client interactivity, but the parent program
 *   page is a server component. This wrapper carries just the prompt.
 */
export default function DeleteWeekButton({
  weekId,
  programId,
  lang,
  weekNumber,
  weekLabel,
  action,
  variant = "icon",
  permanent = false,
}: {
  weekId: string;
  programId: string;
  lang: string;
  weekNumber: number;
  weekLabel: string | null;
  action: (formData: FormData) => Promise<void>;
  /** "icon" = just 🗑 ; "compact" = small text button */
  variant?: "icon" | "compact";
  /** When true, the prompt warns the deletion cannot be undone. */
  permanent?: boolean;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const label = weekLabel ? `Week ${weekNumber} — ${weekLabel}` : `Week ${weekNumber}`;
    const msg = permanent
      ? `Permanently delete "${label}"? This CANNOT be undone — the week will be removed from the recovery trash.`
      : `Delete "${label}"? You'll be able to restore it from "Recently deleted" if it was a mistake.`;
    if (!confirm(msg)) e.preventDefault();
  };

  // The field name depends on what kind of delete this is.
  // - Active week delete  → weekId
  // - Trash purge         → deletedId (reuses this component for the ✕ on the trash row)
  // We branch on `permanent` to set the right hidden field.
  const idField = permanent ? "deletedId" : "weekId";

  if (variant === "compact") {
    return (
      <form action={action} onSubmit={handleSubmit}>
        <input type="hidden" name={idField} value={weekId} />
        <input type="hidden" name="programId" value={programId} />
        <input type="hidden" name="lang" value={lang} />
        <button
          type="submit"
          className="text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded-md p-1.5"
          title={permanent ? "Permanently delete (not restorable)" : "Delete this week"}
          aria-label={permanent ? "Purge permanently" : `Delete Week ${weekNumber}`}
        >
          {permanent ? "✕" : "🗑"}
        </button>
      </form>
    );
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name={idField} value={weekId} />
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="lang" value={lang} />
      <button
        type="submit"
        title={permanent ? "Permanently delete (not restorable)" : "Delete this week (can be restored)"}
        className="text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded-md p-1.5"
        aria-label={permanent ? "Purge permanently" : `Delete Week ${weekNumber}`}
      >
        {permanent ? "✕" : "🗑"}
      </button>
    </form>
  );
}
