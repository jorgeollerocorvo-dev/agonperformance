import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import bcrypt from "bcryptjs";
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
        orderBy: { createdAt: "desc" },
      },
    },
  });

  async function createAthlete(formData: FormData) {
    "use server";
    const s = await auth();
    const c = await prisma.coach.findUnique({ where: { userId: s!.user.id } });
    if (!c) return;

    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim() || null;
    const specialty = (String(formData.get("specialty") ?? "OTHER") || "OTHER") as
      | "CROSSFIT" | "WOMEN" | "BODYBUILDING" | "OTHER";
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const birthDateRaw = String(formData.get("birthDate") ?? "").trim();
    const heightRaw = String(formData.get("heightCm") ?? "").trim();
    const weightRaw = String(formData.get("weightKg") ?? "").trim();
    const goals = String(formData.get("goals") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!email || password.length < 6) redirect(`/${lang}/coach/athletes?error=1`);
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) redirect(`/${lang}/coach/athletes?error=exists`);

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "ATHLETE",
        locale: lang,
        athleteProfile: {
          create: {
            coachId: c.id,
            specialty,
            phone,
            birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
            heightCm: heightRaw ? parseInt(heightRaw, 10) || null : null,
            weightKg: weightRaw ? parseFloat(weightRaw) || null : null,
            goals,
            notes,
          },
        },
      },
    });

    redirect(`/${lang}/coach/athletes`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{dict.nav.athletes}</h1>
        <p className="text-xs text-zinc-500">
          Invite code: <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{coach?.id}</code>
        </p>
      </div>

      <form action={createAthlete} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
        <h2 className="text-lg font-medium sm:col-span-2">{dict.coach.addAthlete}</h2>

        <Field label={dict.auth.name}>
          <input name="name" className={inputCls} />
        </Field>
        <Field label={dict.auth.email}>
          <input name="email" type="email" required className={inputCls} />
        </Field>
        <Field label={dict.coach.tempPassword}>
          <input name="password" type="text" minLength={6} required className={inputCls} placeholder="min 6 chars" />
        </Field>
        <Field label={dict.coach.specialty}>
          <select name="specialty" className={inputCls}>
            <option value="CROSSFIT">{dict.coach.crossfit}</option>
            <option value="WOMEN">{dict.coach.women}</option>
            <option value="BODYBUILDING">{dict.coach.bodybuilding}</option>
            <option value="OTHER">{dict.coach.other}</option>
          </select>
        </Field>
        <Field label={dict.coach.phone}>
          <input name="phone" className={inputCls} />
        </Field>
        <Field label={dict.coach.birthDate}>
          <input name="birthDate" type="date" className={inputCls} />
        </Field>
        <Field label={dict.coach.height}>
          <input name="heightCm" type="number" min={100} max={250} className={inputCls} />
        </Field>
        <Field label={dict.coach.weight}>
          <input name="weightKg" type="number" step="0.1" min={20} max={300} className={inputCls} />
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

      {coach?.athletes.length === 0 ? (
        <p className="text-sm text-zinc-500">{dict.coach.noAthletes}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {coach?.athletes.map((a) => (
            <li key={a.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.user.name ?? a.user.email}</div>
                <div className="text-xs text-zinc-500">{a.user.email} · {a.specialty}</div>
              </div>
              <Link
                href={`/${lang}/coach/athletes/${a.id}`}
                className="text-sm rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
              >
                {dict.coach.editProfile}
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
