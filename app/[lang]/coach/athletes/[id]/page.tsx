import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";

export default async function AthleteEdit({ params }: PageProps<"/[lang]/coach/athletes/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const coach = await prisma.coach.findUnique({ where: { userId: session!.user.id } });
  const athlete = await prisma.athlete.findFirst({
    where: { id, coachId: coach!.id },
    include: {
      user: true,
      coach: {
        include: { programs: { include: { workouts: { orderBy: { dayIndex: "asc" } } } } },
      },
      assignments: {
        orderBy: { date: "desc" },
        include: { workout: true, log: true },
        take: 20,
      },
    },
  });
  if (!athlete) notFound();

  async function updateAthlete(formData: FormData) {
    "use server";
    const s = await auth();
    const c = await prisma.coach.findUnique({ where: { userId: s!.user.id } });
    const a = await prisma.athlete.findFirst({ where: { id, coachId: c!.id } });
    if (!a) return;

    const name = String(formData.get("name") ?? "").trim() || null;
    const specialty = (String(formData.get("specialty") ?? "OTHER") || "OTHER") as
      | "CROSSFIT" | "WOMEN" | "BODYBUILDING" | "OTHER";
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const birthDateRaw = String(formData.get("birthDate") ?? "").trim();
    const heightRaw = String(formData.get("heightCm") ?? "").trim();
    const weightRaw = String(formData.get("weightKg") ?? "").trim();
    const goals = String(formData.get("goals") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    await prisma.athlete.update({
      where: { id: a.id },
      data: {
        specialty,
        phone,
        birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
        heightCm: heightRaw ? parseInt(heightRaw, 10) || null : null,
        weightKg: weightRaw ? parseFloat(weightRaw) || null : null,
        goals,
        notes,
        user: { update: { name } },
      },
    });

    redirect(`/${lang}/coach/athletes/${id}`);
  }

  async function assignWorkout(formData: FormData) {
    "use server";
    const workoutId = String(formData.get("workoutId") ?? "");
    const date = String(formData.get("date") ?? "");
    if (!workoutId || !date) return;
    await prisma.assignment.upsert({
      where: { athleteId_workoutId_date: { athleteId: athlete!.id, workoutId, date: new Date(date) } },
      update: {},
      create: { athleteId: athlete!.id, workoutId, date: new Date(date) },
    });
    redirect(`/${lang}/coach/athletes/${id}`);
  }

  const allWorkouts = athlete.coach.programs.flatMap((p) =>
    p.workouts.map((w) => ({ id: w.id, label: `${p.name} — ${w.title}` })),
  );

  const toDateStr = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

  return (
    <div className="space-y-8">
      <Link href={`/${lang}/coach/athletes`} className="text-sm text-zinc-500 hover:underline">← {dict.nav.athletes}</Link>

      <h1 className="text-2xl font-semibold">{athlete.user.name ?? athlete.user.email}</h1>

      <form action={updateAthlete} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
        <h2 className="text-lg font-medium sm:col-span-2">{dict.coach.editProfile}</h2>

        <Field label={dict.auth.name}>
          <input name="name" defaultValue={athlete.user.name ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.auth.email}>
          <input value={athlete.user.email} disabled className={`${inputCls} opacity-60`} />
        </Field>
        <Field label={dict.coach.specialty}>
          <select name="specialty" defaultValue={athlete.specialty} className={inputCls}>
            <option value="CROSSFIT">{dict.coach.crossfit}</option>
            <option value="WOMEN">{dict.coach.women}</option>
            <option value="BODYBUILDING">{dict.coach.bodybuilding}</option>
            <option value="OTHER">{dict.coach.other}</option>
          </select>
        </Field>
        <Field label={dict.coach.phone}>
          <input name="phone" defaultValue={athlete.phone ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.birthDate}>
          <input name="birthDate" type="date" defaultValue={toDateStr(athlete.birthDate)} className={inputCls} />
        </Field>
        <Field label={dict.coach.height}>
          <input name="heightCm" type="number" defaultValue={athlete.heightCm ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.weight}>
          <input name="weightKg" type="number" step="0.1" defaultValue={athlete.weightKg ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.goals} full>
          <textarea name="goals" rows={2} defaultValue={athlete.goals ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.notes} full>
          <textarea name="notes" rows={3} defaultValue={athlete.notes ?? ""} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">
            {dict.coach.save}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{dict.coach.assign}</h2>
        <form action={assignWorkout} className="flex gap-2 items-end flex-wrap rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <label className="text-sm flex-1 min-w-52">
            <span className="block mb-1">Workout</span>
            <select name="workoutId" required className={inputCls}>
              {allWorkouts.map((w) => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1">Date</span>
            <input type="date" name="date" required className={inputCls} />
          </label>
          <button className="rounded-md bg-zinc-900 text-white px-3 py-2 text-sm dark:bg-white dark:text-zinc-900">
            {dict.coach.assign}
          </button>
        </form>

        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {athlete.assignments.map((a) => (
            <li key={a.id} className="px-4 py-2 text-sm flex justify-between">
              <span>{a.date.toISOString().slice(0, 10)} · {a.workout.title}</span>
              <span className={a.log ? "text-green-600" : "text-zinc-500"}>{a.log ? dict.athlete.completed : "—"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-sm ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
