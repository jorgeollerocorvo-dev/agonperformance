"use client";

/**
 * Inline dropdown + Save button for reassigning an athlete to a different coach.
 * Jorge-only. Lives under each athlete card on the Coach Detail page.
 *
 * Confirms before submitting so a mis-click doesn't move an athlete's whole
 * program history to another coach's dashboard.
 */
export default function CoachAssignmentPicker({
  athleteId,
  athleteName,
  currentCoachProfileId,
  coachOptions,
  lang,
  action,
}: {
  athleteId: string;
  athleteName: string;
  currentCoachProfileId: string;
  coachOptions: Array<{ id: string; name: string }>;
  lang: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const select = form.querySelector<HTMLSelectElement>('select[name="targetCoachProfileId"]');
    const targetId = select?.value ?? "";
    if (!targetId || targetId === currentCoachProfileId) {
      e.preventDefault();
      return;
    }
    const targetName = select?.options[select.selectedIndex]?.text ?? "another coach";
    if (
      !confirm(
        `Reassign "${athleteName}" to ${targetName}? Their programs and history stay with them but move under the new coach's dashboard.`,
      )
    ) {
      e.preventDefault();
    }
  };

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-2)]/40 border border-[var(--border)] px-3 py-2"
    >
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="currentCoachId" value={currentCoachProfileId} />
      <input type="hidden" name="lang" value={lang} />
      <label className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
        Coach
      </label>
      <select
        name="targetCoachProfileId"
        defaultValue={currentCoachProfileId}
        className="text-sm rounded-md border border-[var(--border)] bg-white px-2 py-1 flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]"
      >
        {coachOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.id === currentCoachProfileId ? " (current)" : ""}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="text-xs font-semibold rounded-md bg-[var(--ink)] text-white px-3 py-1.5 hover:opacity-90"
      >
        Save
      </button>
    </form>
  );
}
