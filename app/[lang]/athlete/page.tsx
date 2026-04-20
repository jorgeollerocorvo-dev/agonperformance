import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import { ytEmbed } from "@/lib/youtube";

export default async function AthleteToday({ params }: PageProps<"/[lang]/athlete">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();

  const athlete = await prisma.athlete.findUnique({ where: { userId: session!.user.id } });
  if (!athlete) redirect(`/${lang}/login`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const assignment = await prisma.assignment.findFirst({
    where: { athleteId: athlete.id, date: today },
    include: {
      workout: {
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { exercises: { orderBy: { order: "asc" } } },
          },
        },
      },
      log: true,
    },
  });

  async function markDone() {
    "use server";
    if (!assignment) return;
    await prisma.workoutLog.upsert({
      where: { assignmentId: assignment.id },
      update: { completedAt: new Date() },
      create: {
        assignmentId: assignment.id,
        athleteId: athlete!.id,
      },
    });
    redirect(`/${lang}/athlete`);
  }

  if (!assignment) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-2">{dict.athlete.todayHeader}</h1>
        <p className="text-sm text-zinc-500">{dict.athlete.noWorkout}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{assignment.workout.title}</h1>
        <p className="text-sm text-zinc-500">{dict.athlete.todayHeader}</p>
      </header>

      {assignment.workout.sections.map((sec) => (
        <section key={sec.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-semibold">{sec.label}</span>
            {sec.protocol && <span className="text-sm text-zinc-500">{sec.protocol}</span>}
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sec.exercises.map((ex, i) => {
              const embed = ytEmbed(ex.youtubeUrl);
              return (
                <li key={ex.id} className="py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">
                      {sec.exercises.length > 1 ? `${sec.label}${i + 1}) ` : ""}
                      {ex.name}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {[ex.sets && `${ex.sets}×`, ex.reps, ex.load, ex.rest && `rest ${ex.rest}`]
                        .filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {embed && (
                    <div className="mt-2 aspect-video max-w-md">
                      <iframe
                        src={embed}
                        className="w-full h-full rounded-md"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <form action={markDone}>
        <button
          disabled={!!assignment.log}
          className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900 disabled:opacity-50"
        >
          {assignment.log ? dict.athlete.completed : dict.athlete.markDone}
        </button>
      </form>
    </div>
  );
}
