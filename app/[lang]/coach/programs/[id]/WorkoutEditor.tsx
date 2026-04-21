"use client";

import { useState, useTransition } from "react";
import { saveWorkout, deleteWorkout } from "./actions";
import type { Dict } from "../../../dictionaries";

type ExerciseState = {
  id?: string;
  name: string;
  sets?: string | null;
  reps?: string | null;
  load?: string | null;
  rest?: string | null;
  tempo?: string | null;
  youtubeUrl?: string | null;
  notes?: string | null;
};

type SectionState = {
  id?: string;
  label: string;
  protocol?: string | null;
  exercises: ExerciseState[];
};

type WorkoutState = {
  id: string;
  title: string;
  notes?: string | null;
  dayIndex?: number | null;
  sections: SectionState[];
};

export default function WorkoutEditor({
  workout,
  dict,
}: {
  workout: WorkoutState;
  dict: Dict;
}) {
  const [state, setState] = useState<WorkoutState>(workout);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = () => {
    start(async () => {
      await saveWorkout(state);
      setSavedAt(Date.now());
    });
  };

  const addSection = () =>
    setState((s) => ({
      ...s,
      sections: [
        ...s.sections,
        {
          label: String.fromCharCode(65 + s.sections.length),
          protocol: "",
          exercises: [],
        },
      ],
    }));

  const addExercise = (si: number) =>
    setState((s) => {
      const sections = [...s.sections];
      sections[si] = {
        ...sections[si],
        exercises: [...sections[si].exercises, { name: "" }],
      };
      return { ...s, sections };
    });

  const updateSection = (si: number, patch: Partial<SectionState>) =>
    setState((s) => {
      const sections = [...s.sections];
      sections[si] = { ...sections[si], ...patch };
      return { ...s, sections };
    });

  const updateExercise = (
    si: number,
    ei: number,
    patch: Partial<ExerciseState>,
  ) =>
    setState((s) => {
      const sections = [...s.sections];
      const exercises = [...sections[si].exercises];
      exercises[ei] = { ...exercises[ei], ...patch };
      sections[si] = { ...sections[si], exercises };
      return { ...s, sections };
    });

  const removeExercise = (si: number, ei: number) =>
    setState((s) => {
      const sections = [...s.sections];
      sections[si] = {
        ...sections[si],
        exercises: sections[si].exercises.filter((_, i) => i !== ei),
      };
      return { ...s, sections };
    });

  const removeSection = (si: number) =>
    setState((s) => ({ ...s, sections: s.sections.filter((_, i) => i !== si) }));

  return (
    <div id={`w-${state.id}`} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-500 outline-none flex-1"
        />
        <button
          onClick={save}
          disabled={pending}
          className="text-sm rounded-md bg-zinc-900 text-white px-3 py-1.5 dark:bg-white dark:text-zinc-900 disabled:opacity-50"
        >
          {pending ? "…" : dict.coach.save}
        </button>
        {savedAt && !pending && <span className="text-xs text-green-600">{dict.coach.saved}</span>}
        <button
          onClick={() => start(async () => { await deleteWorkout(state.id); })}
          className="text-sm text-red-600 hover:underline"
        >
          ✕
        </button>
      </div>

      {state.sections.map((sec, si) => (
        <div key={si} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <input
              value={sec.label}
              onChange={(e) => updateSection(si, { label: e.target.value })}
              className="w-14 rounded-md border border-zinc-300 px-2 py-1 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              placeholder="3 rounds / :30 on :30 off for 20 min"
              value={sec.protocol ?? ""}
              onChange={(e) => updateSection(si, { protocol: e.target.value })}
              className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button onClick={() => removeSection(si)} className="text-sm text-red-600">✕</button>
          </div>

          <div className="space-y-3">
            {sec.exercises.map((ex, ei) => (
              <div key={ei} className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3 md:p-0 md:border-0 md:grid md:grid-cols-12 md:gap-2 md:items-center flex flex-col gap-2">
                <input
                  placeholder={dict.exercise.name}
                  value={ex.name}
                  onChange={(e) => updateExercise(si, ei, { name: e.target.value })}
                  className="md:col-span-3 rounded-md border border-zinc-300 px-3 py-2 text-base md:text-sm md:py-1 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div className="grid grid-cols-4 gap-2 md:contents">
                  <input
                    placeholder={dict.exercise.sets}
                    value={ex.sets ?? ""}
                    onChange={(e) => updateExercise(si, ei, { sets: e.target.value })}
                    className="md:col-span-1 rounded-md border border-zinc-300 px-3 py-2 text-base md:text-sm md:py-1 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <input
                    placeholder={dict.exercise.reps}
                    value={ex.reps ?? ""}
                    onChange={(e) => updateExercise(si, ei, { reps: e.target.value })}
                    className="md:col-span-2 rounded-md border border-zinc-300 px-3 py-2 text-base md:text-sm md:py-1 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <input
                    placeholder={dict.exercise.load}
                    value={ex.load ?? ""}
                    onChange={(e) => updateExercise(si, ei, { load: e.target.value })}
                    className="md:col-span-1 rounded-md border border-zinc-300 px-3 py-2 text-base md:text-sm md:py-1 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <input
                    placeholder={dict.exercise.rest}
                    value={ex.rest ?? ""}
                    onChange={(e) => updateExercise(si, ei, { rest: e.target.value })}
                    className="md:col-span-1 rounded-md border border-zinc-300 px-3 py-2 text-base md:text-sm md:py-1 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <input
                  placeholder={dict.exercise.youtube}
                  value={ex.youtubeUrl ?? ""}
                  onChange={(e) => updateExercise(si, ei, { youtubeUrl: e.target.value })}
                  className="md:col-span-3 rounded-md border border-zinc-300 px-3 py-2 text-base md:text-sm md:py-1 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <button onClick={() => removeExercise(si, ei)} className="md:col-span-1 text-sm text-red-600 self-end md:self-center">✕ Remove</button>
              </div>
            ))}
            <button onClick={() => addExercise(si)} className="text-sm text-zinc-600 hover:underline">
              + {dict.coach.addExercise}
            </button>
          </div>
        </div>
      ))}

      <button onClick={addSection} className="text-sm text-zinc-600 hover:underline">
        + {dict.coach.addSection}
      </button>
    </div>
  );
}
