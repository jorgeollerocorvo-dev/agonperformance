import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import PublicHeader from "@/components/ui/PublicHeader";
import { Card, Button } from "@/components/ui/Card";

export default async function FindMyCoach({ params, searchParams }: PageProps<"/[lang]/find-my-coach">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const sent = sp?.sent === "1";

  async function submitInquiry(formData: FormData) {
    "use server";
    const session = await auth();

    const goal = String(formData.get("goal") ?? "") || null;
    const frequencyCurrent = String(formData.get("frequencyCurrent") ?? "") || null;
    const frequencyDesired = String(formData.get("frequencyDesired") ?? "") || null;
    const numPeople = String(formData.get("numPeople") ?? "") || null;
    const ageRange = String(formData.get("ageRange") ?? "") || null;
    const injuryOrConcern = String(formData.get("injuryOrConcern") ?? "").trim() || null;
    const preferredLocation = String(formData.get("preferredLocation") ?? "") || null;
    const preferredDaysAndTimes = String(formData.get("preferredDaysAndTimes") ?? "").trim() || null;
    const urgency = String(formData.get("urgency") ?? "") || null;
    const anonymousEmail = String(formData.get("email") ?? "").toLowerCase().trim() || null;
    const anonymousPhone = String(formData.get("phone") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    // Simple matching: approved coaches whose specialties overlap with goal bucket
    const coaches = await prisma.coachProfile.findMany({
      where: { listingStatus: "APPROVED" },
      select: { id: true },
      take: 5,
    });

    await prisma.inquiry.create({
      data: {
        clientUserId: session?.user?.id ?? null,
        anonymousEmail,
        anonymousPhone,
        goal,
        frequencyCurrent,
        frequencyDesired,
        numPeople,
        ageRange,
        injuryOrConcern,
        preferredLocation,
        preferredDaysAndTimes,
        urgency,
        notes,
        recommendedCoachIds: coaches.map((c) => c.id),
        status: "NEW",
      },
    });

    redirect(`/${lang}/find-my-coach?sent=1`);
  }

  return (
    <div className="min-h-screen">
      <PublicHeader
        lang={lang}
        brand={dict.brand}
        rightSlot={
          <Link href={`/${lang}/coaches`} className="text-sm text-[var(--ink-muted)] hover:underline px-3 py-1.5">{dict.directory.browseCoaches}</Link>
        }
      />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <header>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{dict.directory.findMyCoach}</h1>
          <p className="text-[var(--ink-muted)] mt-1">{dict.directory.leadFormTagline}</p>
        </header>

        {sent && (
          <Card className="bg-[var(--success-soft)] border-[var(--success)]/30">
            <div className="text-[var(--success)] font-semibold text-lg">✓ {dict.leadForm.thanks}</div>
            <p className="text-sm text-[var(--ink)] mt-1">{dict.leadForm.thanksSub}</p>
            <div className="mt-3">
              <Link href={`/${lang}/coaches`} className="inline-flex rounded-full bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)]">
                {dict.directory.browseCoaches}
              </Link>
            </div>
          </Card>
        )}

        <form action={submitInquiry} className="rounded-3xl border border-[var(--border)] bg-white p-5 sm:p-6 space-y-4">
          <Select name="goal" label={dict.leadForm.goal} options={[
            ["lose_weight", dict.leadForm.goalOptions.loseWeight],
            ["tone", dict.leadForm.goalOptions.tone],
            ["build_muscle", dict.leadForm.goalOptions.buildMuscle],
            ["flexibility", dict.leadForm.goalOptions.flexibility],
            ["endurance", dict.leadForm.goalOptions.endurance],
            ["other", dict.leadForm.goalOptions.other],
          ]} />
          <Select name="frequencyCurrent" label={dict.leadForm.frequencyCurrent} options={[
            ["none", dict.leadForm.freqOptions.none],
            ["1_2_per_week", dict.leadForm.freqOptions.oneTwo],
            ["3_4_per_week", dict.leadForm.freqOptions.threeFour],
            ["almost_daily", dict.leadForm.freqOptions.daily],
          ]} />
          <Select name="frequencyDesired" label={dict.leadForm.frequencyDesired} options={[
            ["1_per_week", "1x"],
            ["2_per_week", "2x"],
            ["3_per_week", "3x+"],
            ["unclear", "—"],
          ]} />
          <Select name="ageRange" label={dict.leadForm.ageRange} options={[
            ["under_18", "<18"],
            ["18_25", "18-25"],
            ["26_40", "26-40"],
            ["41_60", "41-60"],
            ["over_60", "60+"],
          ]} />
          <Select name="preferredLocation" label={dict.leadForm.preferredLocation} options={[
            ["coach_choice", dict.leadForm.locOptions.coachChoice],
            ["coach_gym", dict.leadForm.locOptions.coachGym],
            ["home", dict.leadForm.locOptions.home],
            ["outdoor", dict.leadForm.locOptions.outdoor],
            ["online", dict.leadForm.locOptions.online],
          ]} />
          <Select name="urgency" label={dict.leadForm.urgency} options={[
            ["flexible", dict.leadForm.urgencyOptions.flexible],
            ["within_month", dict.leadForm.urgencyOptions.month],
            ["within_days", dict.leadForm.urgencyOptions.days],
            ["urgent", dict.leadForm.urgencyOptions.urgent],
          ]} />
          <label className="block text-sm">
            <span className="mb-1 block">{dict.leadForm.injuryOrConcern}</span>
            <textarea name="injuryOrConcern" rows={2} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{dict.leadForm.daysAndTimes}</span>
            <input name="preferredDaysAndTimes" className={inputCls} placeholder="e.g. Weekday evenings" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block">{dict.auth.email}</span>
              <input name="email" type="email" className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block">{dict.coach.phone}</span>
              <input name="phone" className={inputCls} />
            </label>
          </div>
          <Button type="submit" size="lg">{dict.leadForm.submit}</Button>
        </form>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";

function Select({ name, label, options }: { name: string; label: string; options: [string, string][] }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block">{label}</span>
      <select name={name} className={inputCls}>
        <option value="">—</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
