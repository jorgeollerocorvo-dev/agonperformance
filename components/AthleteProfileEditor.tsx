"use client";

import { useState } from "react";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">{label}</label>
      {children}
    </div>
  );
}

function toDateStr(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default function AthleteProfileEditor({
  athlete,
  dict,
  updateAthlete,
  inputCls,
  lang,
  athleteId,
}: {
  athlete: any;
  dict: any;
  updateAthlete: (formData: FormData) => Promise<void>;
  inputCls: string;
  lang: string;
  athleteId: string;
}) {
  const [isLocked, setIsLocked] = useState(true);

  return (
    <form
      action={updateAthlete}
      className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 grid gap-3 grid-cols-1 sm:grid-cols-2"
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="athleteId" value={athleteId} />
      <div className="sm:col-span-2 flex items-center justify-between">
        <h2 className="text-lg font-medium">{dict.coach.editProfile}</h2>
        <button
          type="button"
          onClick={() => setIsLocked(!isLocked)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
            isLocked
              ? "bg-[var(--surface-2)] text-[var(--ink-muted)] hover:bg-[var(--surface-3)]"
              : "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)]/20"
          }`}
        >
          {isLocked ? "🔒 Locked" : "🔓 Unlocked"}
        </button>
      </div>

      <Field label={dict.auth.name}>
        <input
          name="fullName"
          defaultValue={athlete.fullName}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>
      <Field label={dict.auth.email}>
        <input
          name="email"
          type="email"
          defaultValue={athlete.email ?? ""}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>
      <Field label={dict.coach.phone}>
        <input
          name="phone"
          defaultValue={athlete.phone ?? ""}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>
      <Field label={dict.coach.sex}>
        <select
          name="sex"
          defaultValue={athlete.sex ?? ""}
          className={inputCls}
          disabled={isLocked}
        >
          <option value="">—</option>
          <option value="M">M</option>
          <option value="F">F</option>
        </select>
      </Field>
      <Field label={dict.coach.age}>
        <input
          name="age"
          type="number"
          defaultValue={athlete.age ?? ""}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>
      <Field label={dict.coach.birthDate}>
        <input
          name="dob"
          type="date"
          defaultValue={toDateStr(athlete.dob)}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>
      <Field label={dict.coach.height}>
        <input
          name="heightCm"
          type="number"
          defaultValue={athlete.heightCm ?? ""}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>
      <Field label={dict.coach.weight}>
        <input
          name="weightKg"
          type="number"
          step="0.1"
          defaultValue={athlete.weightKg ?? ""}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>
      <Field label={dict.coach.division} full>
        <input
          name="division"
          defaultValue={athlete.division ?? ""}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>
      <Field label={dict.coach.goals} full>
        <textarea
          name="goals"
          rows={2}
          defaultValue={athlete.goals ?? ""}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>
      <Field label={dict.coach.notes} full>
        <textarea
          name="notes"
          rows={3}
          defaultValue={athlete.notes ?? ""}
          className={inputCls}
          disabled={isLocked}
        />
      </Field>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isLocked}
          className={`rounded-md px-4 py-2 font-medium transition ${
            isLocked
              ? "bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400"
              : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          }`}
        >
          {dict.coach.save}
        </button>
      </div>
    </form>
  );
}
