import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";

export default async function AthletesPage({ params }: PageProps<"/[lang]/coach/athletes">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: session!.user.id },
    include: { athletes: { orderBy: { createdAt: "desc" } } },
  });

  async function createAthlete(formData: FormData) {
    "use server";
    const s = await auth();
    const cp = await prisma.coachProfile.findUnique({ where: { userId: s!.user.id } });
    if (!cp) return;

    const fullName = String(formData.get("fullName") ?? "").trim();
    if (!fullName) redirect(`/${lang}/coach/athletes?error=name`);

    const email = String(formData.get("email") ?? "").toLowerCase().trim() || null;
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const sex = (String(formData.get("sex") ?? "").trim() || null) as "M" | "F" | null;
    const ageRaw = String(formData.get("age") ?? "").trim();
    const heightRaw = String(formData.get("heightCm") ?? "").trim();
    const weightRaw = String(formData.get("weightKg") ?? "").trim();
    const dobRaw = String(formData.get("dob") ?? "").trim();
    const division = String(formData.get("division") ?? "").trim() || null;
    const goals = String(formData.get("goals") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    // Generate a unique athleteKey slug
    const base = fullName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "athlete";
    let athleteKey = base;
    let suffix = 0;
    while (await prisma.athlete.findUnique({ where: { athleteKey } })) {
      suffix += 1;
      athleteKey = `${base}_${suffix}`;
    }

    await prisma.athlete.create({
      data: {
        athleteKey,
        coachProfileId: cp.id,
        fullName,
        email,
        phone,
        sex,
        age: ageRaw ? parseInt(ageRaw, 10) || null : null,
        dob: dobRaw ? new Date(dobRaw) : null,
        heightCm: heightRaw ? parseInt(heightRaw, 10) || null : null,
        weightKg: weightRaw ? parseFloat(weightRaw) || null : null,
        division,
        goals,
        notes,
      },
    });

    redirect(`/${lang}/coach/athletes`);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{dict.nav.athletes}</h1>

      <form action={createAthlete} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
        <h2 className="text-lg font-medium sm:col-span-2">{dict.coach.addAthlete}</h2>

        <Field label={dict.auth.name}>
          <input name="fullName" required className={inputCls} />
        </Field>
        <Field label={dict.auth.email}>
          <input name="email" type="email" className={inputCls} />
        </Field>
        <Field label={dict.coach.phone}>
          <input name="phone" className={inputCls} />
        </Field>
        <Field label={dict.coach.sex}>
          <select name="sex" className={inputCls}>
            <option value="">—</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </Field>
        <Field label={dict.coach.age}>
          <input name="age" type="number" min={0} max={120} className={inputCls} />
        </Field>
        <Field label={dict.coach.birthDate}>
          <input name="dob" type="date" className={inputCls} />
        </Field>
        <Field label={dict.coach.height}>
          <input name="heightCm" type="number" min={100} max={250} className={inputCls} />
        </Field>
        <Field label={dict.coach.weight}>
          <input name="weightKg" type="number" step="0.1" min={20} max={300} className={inputCls} />
        </Field>
        <Field label={dict.coach.division} full>
          <input name="division" placeholder="e.g. Masters 55-59" className={inputCls} />
        </Field>
        <Field label={dict.coach.goals} full>
          <textarea name="goals" rows={2} className={inputCls} />
        </Field>
        <Field label={dict.coach.notes} full>
          <textarea name="notes" rows={2} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">
            {dict.coach.create}
          </button>
        </div>
      </form>

      {coachProfile?.athletes.length === 0 ? (
        <p className="text-sm text-zinc-500">{dict.coach.noAthletes}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {coachProfile?.athletes.map((a) => (
            <li key={a.id}>
              <Link href={`/${lang}/coach/athletes/${a.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <div>
                  <div className="font-medium">{a.fullName}</div>
                  <div className="text-xs text-zinc-500">
                    {[a.sex, a.age ? `${a.age} y/o` : null, a.division, a.email].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="text-sm text-zinc-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
