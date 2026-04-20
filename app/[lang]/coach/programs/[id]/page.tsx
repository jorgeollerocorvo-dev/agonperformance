import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import WorkoutEditor from "./WorkoutEditor";

export default async function ProgramDetail({ params }: PageProps<"/[lang]/coach/programs/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();

  const coach = await prisma.coach.findUnique({ where: { userId: session!.user.id } });
  const program = await prisma.program.findFirst({
    where: { id, coachId: coach!.id },
    include: {
      workouts: {
        orderBy: { dayIndex: "asc" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { exercises: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!program) notFound();

  async function addWorkout() {
    "use server";
    const nextIdx = (program!.workouts.at(-1)?.dayIndex ?? 0) + 1;
    const w = await prisma.workout.create({
      data: { programId: program!.id, title: `Day ${nextIdx}`, dayIndex: nextIdx },
    });
    redirect(`/${lang}/coach/programs/${program!.id}#w-${w.id}`);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{program.name}</h1>
        <p className="text-sm text-zinc-500">{program.specialty}</p>
      </header>

      <form action={addWorkout}>
        <button className="rounded-md bg-zinc-900 text-white px-3 py-1.5 text-sm dark:bg-white dark:text-zinc-900">
          + Workout
        </button>
      </form>

      <div className="space-y-6">
        {program.workouts.map((w) => (
          <WorkoutEditor key={w.id} workout={w} dict={dict} />
        ))}
      </div>
    </div>
  );
}
