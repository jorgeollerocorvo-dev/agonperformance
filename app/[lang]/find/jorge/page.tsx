import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Card, Button, Pill } from "@/components/ui/Card";
import { JORGE_EMAIL, JORGE_INQUIRY_SOURCE, findJorgeCoachProfileId } from "@/lib/jorge";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(hasLocale(lang) ? lang : "en");
  return {
    title: `Train with Jorge · ${dict.brand}`,
    description: "Tell Jorge a bit about you and your goals — he'll get back to you within 24h.",
    openGraph: {
      title: `Train with Jorge · ${dict.brand}`,
      description: "Tell Jorge a bit about you and your goals — he'll get back to you within 24h.",
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function JorgeIntake({ params, searchParams }: PageProps<"/[lang]/find/jorge">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const sent = sp?.sent === "1";
  const sourceParam = typeof sp?.source === "string" ? sp.source : JORGE_INQUIRY_SOURCE;

  // Pull the public coach name + specialties to render the hero and goal options
  const owner = await prisma.user.findUnique({
    where: { email: JORGE_EMAIL },
    select: {
      displayName: true,
      fullName: true,
      coachProfile: {
        select: {
          headline: true,
          specialties: { include: { specialty: true } },
        },
      },
    },
  });
  const coachName = owner?.displayName ?? owner?.fullName ?? "Jorge";
  const coachHeadline = owner?.coachProfile?.headline ?? null;

  // Goal dropdown is built from Jorge's own specialties so the survey
  // only offers what he actually trains. Fallback to a generic set if
  // none configured yet.
  const specialtyOptions: [string, string][] = (owner?.coachProfile?.specialties ?? []).map((cs) => {
    const s = cs.specialty;
    const label = lang === "es" ? s.labelEs : lang === "ar" ? (s.labelAr ?? s.labelEn) : s.labelEn;
    return [s.code, label];
  });
  const goalOptions: [string, string][] =
    specialtyOptions.length > 0
      ? [...specialtyOptions, ["other", dict.leadForm.goalOptions.other]]
      : [
          ["lose_weight", dict.leadForm.goalOptions.loseWeight],
          ["tone", dict.leadForm.goalOptions.tone],
          ["build_muscle", dict.leadForm.goalOptions.buildMuscle],
          ["flexibility", dict.leadForm.goalOptions.flexibility],
          ["endurance", dict.leadForm.goalOptions.endurance],
          ["other", dict.leadForm.goalOptions.other],
        ];

  async function submitInquiry(formData: FormData) {
    "use server";
    const session = await auth();

    const goal = String(formData.get("goal") ?? "") || null;
    const frequencyCurrent = String(formData.get("frequencyCurrent") ?? "") || null;
    const frequencyDesired = String(formData.get("frequencyDesired") ?? "") || null;
    const ageRange = String(formData.get("ageRange") ?? "") || null;
    const injuryOrConcern = String(formData.get("injuryOrConcern") ?? "").trim() || null;
    const preferredLocation = String(formData.get("preferredLocation") ?? "") || null;
    const preferredDaysAndTimes = String(formData.get("preferredDaysAndTimes") ?? "").trim() || null;
    const urgency = String(formData.get("urgency") ?? "") || null;
    const contactName = String(formData.get("contactName") ?? "").trim() || null;
    const anonymousEmail = String(formData.get("email") ?? "").toLowerCase().trim() || null;
    const anonymousPhone = String(formData.get("phone") ?? "").trim() || null;
    const contactInstagram = String(formData.get("instagram") ?? "").trim().replace(/^@/, "") || null;
    const marketingConsent = formData.get("marketingConsent") === "on";
    const notes = String(formData.get("notes") ?? "").trim() || null;
    const source = String(formData.get("source") ?? "").trim() || JORGE_INQUIRY_SOURCE;

    if (!contactName && !anonymousEmail && !anonymousPhone && !contactInstagram) {
      redirect(`/${lang}/find/jorge?error=contact${source ? `&source=${encodeURIComponent(source)}` : ""}`);
    }

    const jorgeCoachId = await findJorgeCoachProfileId();

    await prisma.inquiry.create({
      data: {
        clientUserId: session?.user?.id ?? null,
        anonymousEmail,
        anonymousPhone,
        contactName,
        contactInstagram,
        marketingConsent,
        source,
        goal,
        frequencyCurrent,
        frequencyDesired,
        ageRange,
        injuryOrConcern,
        preferredLocation,
        preferredDaysAndTimes,
        urgency,
        notes,
        recommendedCoachIds: jorgeCoachId ? [jorgeCoachId] : [],
        status: "NEW",
      },
    });

    redirect(`/${lang}/find/jorge?sent=1`);
  }

  return (
    <div className="min-h-screen">
      {/* Locked header — brand text only, no nav links so visitors stay on the survey */}
      <header className="px-4 sm:px-6 py-4 flex items-center gap-3">
        <span className="font-semibold tracking-tight">{dict.brand}</span>
        <div className="ml-auto"><LanguageSwitcher current={lang} compact /></div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <header className="text-center space-y-3">
          <Pill color="primary">{dict.directory.matchInMinutes ?? "Reply within 24h"}</Pill>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight display">
            {dict.directory.trainWith ?? "Train with"} {coachName}
          </h1>
          {coachHeadline && <p className="text-[var(--ink-muted)] sm:text-lg">{coachHeadline}</p>}
          <p className="text-sm text-[var(--ink-muted)]">{dict.directory.jorgeIntakeTagline ?? "Tell me a bit about you and your goals — I'll personally get back to you."}</p>
        </header>

        {sent ? (
          <Card className="text-center space-y-3 bg-[var(--success-soft)] border-[var(--success)]/30">
            <div className="text-3xl">✓</div>
            <h2 className="text-2xl font-bold">{dict.directory.thanksTitle ?? "Got it — I'll be in touch."}</h2>
            <p className="text-[var(--ink)]">
              {dict.directory.jorgeThanks ?? "Your answers reached me directly. I'll reply within 24h to schedule a first session."}
            </p>
          </Card>
        ) : (
          <>
            {sp?.error === "contact" && (
              <Card className="bg-[var(--danger-soft)] border-[var(--danger)]/30 text-[var(--danger)] text-sm">
                {dict.directory.needContact ?? "Add at least one way to reach you (email, phone, or Instagram)."}
              </Card>
            )}
            <form action={submitInquiry} className="space-y-5">
              <input type="hidden" name="source" value={sourceParam} />

              <Card>
                <h2 className="font-semibold mb-4">1. {dict.directory.aboutYourTraining ?? "Your training"}</h2>
                <div className="space-y-3">
                  <Select name="goal" label={dict.leadForm.goal} options={goalOptions} />
                  <Select name="frequencyCurrent" label={dict.leadForm.frequencyCurrent} options={[
                    ["none", dict.leadForm.freqOptions.none],
                    ["1_2_per_week", dict.leadForm.freqOptions.oneTwo],
                    ["3_4_per_week", dict.leadForm.freqOptions.threeFour],
                    ["almost_daily", dict.leadForm.freqOptions.daily],
                  ]} />
                  <Select name="frequencyDesired" label={dict.leadForm.frequencyDesired} options={[
                    ["1_per_week", "1×"],
                    ["2_per_week", "2×"],
                    ["3_per_week", "3×+"],
                    ["unclear", "—"],
                  ]} />
                  <Select name="ageRange" label={dict.leadForm.ageRange} options={[
                    ["under_18", "<18"],
                    ["18_25", "18-25"],
                    ["26_40", "26-40"],
                    ["41_60", "41-60"],
                    ["over_60", "60+"],
                  ]} />
                </div>
              </Card>

              <Card>
                <h2 className="font-semibold mb-4">2. {dict.directory.preferences ?? "Preferences"}</h2>
                <div className="space-y-3">
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
                    <span className="mb-1 block text-[var(--ink-muted)]">{dict.leadForm.daysAndTimes}</span>
                    <input name="preferredDaysAndTimes" placeholder="e.g. Weekday evenings" className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--ink-muted)]">{dict.leadForm.injuryOrConcern}</span>
                    <textarea name="injuryOrConcern" rows={2} className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--ink-muted)]">{dict.coach.notes}</span>
                    <textarea name="notes" rows={2} placeholder={dict.directory.anythingElse ?? "Anything else I should know?"} className={inputCls} />
                  </label>
                </div>
              </Card>

              <Card>
                <h2 className="font-semibold mb-1">3. {dict.directory.contactStep ?? "How do I reach you?"}</h2>
                <p className="text-xs text-[var(--ink-muted)] mb-4">{dict.directory.contactHintJorge ?? "At least one way is required."}</p>
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--ink-muted)]">{dict.auth.name}</span>
                    <input name="contactName" className={inputCls} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block text-[var(--ink-muted)]">{dict.auth.email}</span>
                      <input name="email" type="email" className={inputCls} />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[var(--ink-muted)]">{dict.coach.phone}</span>
                      <input name="phone" inputMode="tel" placeholder="+974 …" className={inputCls} />
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--ink-muted)]">{dict.directory.instagram ?? "Instagram (optional)"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--ink-muted)]">@</span>
                      <input name="instagram" placeholder="yourhandle" className={inputCls} />
                    </div>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-[var(--ink-muted)] mt-1">
                    <input type="checkbox" name="marketingConsent" className="mt-0.5" />
                    <span>{dict.directory.consent ?? "I agree to be contacted about coaching."}</span>
                  </label>
                </div>
              </Card>

              <Button type="submit" size="lg" className="w-full">
                {dict.leadForm.submit} →
              </Button>
              <p className="text-xs text-[var(--ink-subtle)] text-center">
                {dict.directory.privacyNote ?? "Your details only go to me."}
              </p>
            </form>
          </>
        )}
      </main>

      <footer className="px-4 sm:px-8 py-8 text-xs text-[var(--ink-subtle)] text-center">
        © {dict.brand}
      </footer>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";

function Select({ name, label, options }: { name: string; label: string; options: [string, string][] }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--ink-muted)]">{label}</span>
      <select name={name} className={inputCls}>
        <option value="">—</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
