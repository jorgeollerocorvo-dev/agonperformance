"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type ExerciseInput = {
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

type SectionInput = {
  id?: string;
  label: string;
  protocol?: string | null;
  exercises: ExerciseInput[];
};

type WorkoutInput = {
  id: string;
  title: string;
  notes?: string | null;
  sections: SectionInput[];
};

async function assertOwnsWorkout(workoutId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("unauthorized");
  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id } });
  if (!coach) throw new Error("no coach");
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { program: true },
  });
  if (!workout || workout.program?.coachId !== coach.id) throw new Error("forbidden");
  return { workout, coach };
}

export async function saveWorkout(input: WorkoutInput) {
  const { workout } = await assertOwnsWorkout(input.id);

  await prisma.$transaction(async (tx) => {
    await tx.workout.update({
      where: { id: workout.id },
      data: { title: input.title, notes: input.notes ?? null },
    });
    await tx.section.deleteMany({ where: { workoutId: workout.id } });
    for (let si = 0; si < input.sections.length; si++) {
      const s = input.sections[si];
      await tx.section.create({
        data: {
          workoutId: workout.id,
          label: s.label,
          protocol: s.protocol ?? null,
          order: si,
          exercises: {
            create: s.exercises.map((e, ei) => ({
              name: e.name,
              sets: e.sets || null,
              reps: e.reps || null,
              load: e.load || null,
              rest: e.rest || null,
              tempo: e.tempo || null,
              youtubeUrl: e.youtubeUrl || null,
              notes: e.notes || null,
              order: ei,
            })),
          },
        },
      });
    }
  });

  revalidatePath(`/`, "layout");
}

export async function deleteWorkout(id: string) {
  const { workout } = await assertOwnsWorkout(id);
  await prisma.workout.delete({ where: { id: workout.id } });
  revalidatePath(`/`, "layout");
}
