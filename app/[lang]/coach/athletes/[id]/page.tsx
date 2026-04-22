import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { hasAIKey } from "@/lib/ai-parse-program";
import { ACCEPTED_MIME_TYPES } from "@/lib/parse-document";
import { importAndCreateProgram } from "../../import/actions";

export default async function AthleteDetail({ params, searchParams }: PageProps<"/[lang]/coach/athletes/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const importError = typeof sp?.importError === "string" ? decodeURIComponent(sp.importError) : null;
  const session = await auth();
  const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: session!.user.id } });
  const aiReady = hasAIKey();

  const athlete = await prisma.athlete.findFirst({
    where: { id, coachProfileId: coachProfile!.id },
    include: {
      programs: { orderBy: { startDate: "desc" } },
      testResults: { orderBy: { date: "desc" }, take: 10, include: { movement: true } },
    },
  });
  if (!athlete) notFound();

  async function updateAthlete(formData: FormData) {
    "use server";
    const s = await auth();
    const cp = await prisma.coachProfile.findUnique({ where: { userId: s!.user.id } });
    const a = await prisma.athlete.findFirst({ where: { id, coachProfileId: cp!.id } });
    if (!a) return;

    const fullName = String(formData.get("fullName") ?? "").trim() || a.fullName;
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

    await prisma.athlete.update({
      where: { id: a.id },
      data: {
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
    redirect(`/${lang}/coach/athletes/${id}`);
  }

  async function importProgramForAthlete(formData: FormData) {
    "use server";
    // Force athleteId to this page's athlete — coach can't accidentally assign to another
    formData.set("athleteId", id);
    const result = await importAndCreateProgram(formData);
    if (result.error) {
      redirect(`/${lang}/coach/athletes/${id}?importError=${encodeURIComponent(result.error)}`);
    }
    if (result.previewId) {
      redirect(`/${lang}/coach/programs/${result.previewId}?imported=1`);
    }
  }

  const toDateStr = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

  return (
    <div className="space-y-8">
      <Link href={`/${lang}/coach/athletes`} className="text-sm text-zinc-500 hover:underline">← {dict.nav.athletes}</Link>

      <header className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl sm:text-3xl font-semibold">{athlete.fullName}</h1>
        <span className="text-sm text-zinc-500">{athlete.division ?? ""}</span>
      </header>

      <form action={updateAthlete} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
        <h2 className="text-lg font-medium sm:col-span-2">{dict.coach.editProfile}</h2>
        <Field label={dict.auth.name}><input name="fullName" defaultValue={athlete.fullName} className={inputCls} /></Field>
        <Field label={dict.auth.email}><input name="email" type="email" defaultValue={athlete.email ?? ""} className={inputCls} /></Field>
        <Field label={dict.coach.phone}><input name="phone" defaultValue={athlete.phone ?? ""} className={inputCls} /></Field>
        <Field label={dict.coach.sex}>
          <select name="sex" defaultValue={athlete.sex ?? ""} className={inputCls}>
            <option value="">—</option><option value="M">M</option><option value="F">F</option>
          </select>
        </Field>
        <Field label={dict.coach.age}><input name="age" type="number" defaultValue={athlete.age ?? ""} className={inputCls} /></Field>
        <Field label={dict.coach.birthDate}><input name="dob" type="date" defaultValue={toDateStr(athlete.dob)} className={inputCls} /></Field>
        <Field label={dict.coach.height}><input name="heightCm" type="number" defaultValue={athlete.heightCm ?? ""} className={inputCls} /></Field>
        <Field label={dict.coach.weight}><input name="weightKg" type="number" step="0.1" defaultValue={athlete.weightKg ?? ""} className={inputCls} /></Field>
        <Field label={dict.coach.division} full><input name="division" defaultValue={athlete.division ?? ""} className={inputCls} /></Field>
        <Field label={dict.coach.goals} full><textarea name="goals" rows={2} defaultValue={athlete.goals ?? ""} className={inputCls} /></Field>
        <Field label={dict.coach.notes} full><textarea name="notes" rows={3} defaultValue={athlete.notes ?? ""} className={inputCls} /></Field>
        <div className="sm:col-span-2">
          <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">{dict.coach.save}</button>
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{dict.nav.programs}</h2>
          <Link href={`/${lang}/coach/programs/new?athleteId=${id}`} className="text-sm text-[var(--primary)] hover:underline">
            + {dict.coach.newProgram}
          </Link>
        </div>

        {/* Import-from-document card */}
        <Card>
          <h3 className="font-semibold text-base mb-1">{dict.coach.importProgram ?? "Import program"}</h3>
          <p className="text-sm text-[var(--ink-muted)] mb-3">
            {dict.coach.importIntro ?? "Upload a Word, Excel, or PDF document — we'll turn it into a structured program for this athlete, with YouTube demo search attached to every movement."}
          </p>
          {!aiReady && (
            <div className="mb-3 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary)]/30 text-[var(--primary)] px-3 py-2 text-sm">
              ⚠️ {dict.coach.aiKeyNeeded ?? "AI import needs setup"} — add <code className="bg-white px-1 rounded">ANTHROPIC_API_KEY</code> to Railway variables.
            </div>
          )}
          {importError && (
            <div className="mb-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-[var(--danger)] px-3 py-2 text-sm">
              ✕ {importError}
            </div>
          )}
          <form action={importProgramForAthlete} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.coach.uploadFile ?? "Upload file"}</span>
              <input
                type="file"
                name="file"
                accept={ACCEPTED_MIME_TYPES}
                required
                className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--ink)] file:text-[var(--bg)] file:px-4 file:py-2 file:font-semibold hover:file:opacity-90 file:cursor-pointer"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.coach.startDate ?? "Start date"}</span>
              <input
                type="date"
                name="startDate"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </label>
            <Button type="submit">{dict.coach.importAndCreate ?? "Create"}</Button>
          </form>
        </Card>

        {athlete.programs.length === 0 ? (
          <Card><p className="text-sm text-[var(--ink-muted)]">No programs yet.</p></Card>
        ) : (
          <Card padded={false} className="divide-y divide-[var(--border)]">
            {athlete.programs.map((p) => (
              <Link key={p.id} href={`/${lang}/coach/programs/${p.id}`} className="block px-4 sm:px-5 py-4 hover:bg-[var(--surface-2)]">
                <div className="font-semibold">{p.title}</div>
                <div className="text-xs text-[var(--ink-muted)] mt-1">
                  {toDateStr(p.startDate)} → {toDateStr(p.endDate)} · {p.durationWeeks ?? "?"} weeks
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>

      {athlete.testResults.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-3">{dict.coach.recentTests}</h2>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
            {athlete.testResults.map((t) => (
              <li key={t.id} className="px-4 py-2 flex justify-between">
                <span>{toDateStr(t.date)} · {t.movement?.nameEn ?? t.customMovement} ({t.testType})</span>
                <span className="text-zinc-600 dark:text-zinc-400">{t.resultValue?.toString() ?? "—"} {t.resultUnit ?? ""}</span>
              </li>
            ))}
          </ul>
        </section>
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
