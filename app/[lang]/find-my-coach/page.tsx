import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";

export default async function FindMyCoach({ params }: PageProps<"/[lang]/find-my-coach">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

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
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href={`/${lang}`} className="font-semibold">{dict.brand}</Link>
          <Link href={`/${lang}/coaches`} className="ml-auto text-sm text-zinc-500 hover:underline">{dict.directory.browseCoaches}</Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-semibold">{dict.directory.findMyCoach}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{dict.directory.leadFormTagline}</p>
        </header>

        <form action={submitInquiry} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
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
          <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">{dict.leadForm.submit}</button>
        </form>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800";

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
