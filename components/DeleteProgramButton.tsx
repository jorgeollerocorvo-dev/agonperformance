"use client";

export default function DeleteProgramButton({
  programId,
  programTitle,
  action,
}: {
  programId: string;
  programTitle: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const handleClick = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(`Delete "${programTitle}"? This cannot be undone.`)) {
      e.preventDefault();
    }
  };

  return (
    <form action={action} className="ml-3" onSubmit={handleClick}>
      <input type="hidden" name="programId" value={programId} />
      <button
        type="submit"
        className="text-xs text-[var(--ink-muted)] hover:text-[var(--danger)] px-2 py-1 rounded hover:bg-[var(--danger-soft)] transition"
        title="Delete program"
      >
        🗑️ Delete
      </button>
    </form>
  );
}
