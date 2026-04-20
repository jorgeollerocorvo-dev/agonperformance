import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";

export default async function AthletesPage({ params }: PageProps<"/[lang]/coach/athletes">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const coach = await prisma.coach.findUnique({
    where: { userId: session!.user.id },
    include: {
      athletes: {
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      },
      programs: { include: { workouts: { orderBy: { dayIndex: "asc" } } } },
    },
  });

  async function assignWorkout(formData: FormData) {
    "use server";
    const athleteId = String(formData.get("athleteId") ?? "");
    const workoutId = String(formData.get("workoutId") ?? "");
    const date = String(formData.get("date") ?? "");
    if (!athleteId || !workoutId || !date) return;
    await prisma.assignment.upsert({
      where: {
        athleteId_workoutId_date: { athleteId, workoutId, date: new Date(date) },
      },
      update: {},
      create: { athleteId, workoutId, date: new Date(date) },
    });
    redirect(`/${lang}/coach/athletes`);
  }

  const allWorkouts = coach?.programs.flatMap((p) =>
    p.workouts.map((w) => ({ id: w.id, label: `${p.name} — ${w.title}` })),
  ) ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{dict.nav.athletes}</h1>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Share this invite code with athletes so they can register:{" "}
        <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{coach?.id}</code>
      </p>

      {coach?.athletes.length === 0 ? (
        <p className="text-sm text-zinc-500">{dict.coach.noAthletes}</p>
      ) : (
        <ul className="space-y-4">
          {coach?.athletes.map((a) => (
            <li key={a.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="mb-3">
                <div className="font-medium">{a.user.name ?? a.user.email}</div>
                <div className="text-xs text-zinc-500">{a.user.email} · {a.specialty}</div>
              </div>
              <form action={assignWorkout} className="flex gap-2 items-end flex-wrap">
                <input type="hidden" name="athleteId" value={a.id} />
                <label className="text-sm flex-1 min-w-52">
                  <span className="block mb-1">Workout</span>
                  <select name="workoutId" required className="w-full rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
                    {allWorkouts.map((w) => (
                      <option key={w.id} value={w.id}>{w.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block mb-1">Date</span>
                  <input type="date" name="date" required className="rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800" />
                </label>
                <button className="rounded-md bg-zinc-900 text-white px-3 py-1.5 text-sm dark:bg-white dark:text-zinc-900">
                  {dict.coach.assign}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
