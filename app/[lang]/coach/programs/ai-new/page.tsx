import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { aiProgramGenEnabled } from "@/lib/features";
import { generateAndRedirect } from "./actions";
import { isJorge } from "@/lib/jorge";

export default async function AiNewProgramPage({ params, searchParams }: PageProps<"/[lang]/coach/programs/ai-new">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const session = await auth();

  // Only Jorge can use AI program generation
  if (!isJorge(session)) notFound();

  const coach = await prisma.coachProfile.findUnique({
    where: { userId: session!.user.id },
    include: { athletes: { orderBy: { fullName: "asc" } } },
  });
  if (!coach) notFound();

  const error = typeof sp?.error === "string" ? decodeURIComponent(sp.error) : null;
  const enabled = aiProgramGenEnabled();
  const preselectedAthleteId = typeof sp?.athleteId === "string" ? sp.athleteId : "";

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold">✨ {dict.coach.aiNewProgramTitle ?? "Create program with AI"}</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          {dict.coach.aiNewProgramHint ?? "Pick an athlete, describe what the program should target and how long, and Claude will draft the full week-by-week plan. You can edit anything afterwards."}
        </p>
      </header>

      {!enabled && (
        <Card className="bg-[var(--primary-soft)] border-[var(--primary)]/30">
          <div className="font-semibold text-[var(--primary)]">⚠️ {dict.coach.aiDisabled ?? "AI generation is disabled"}</div>
          <p className="text-sm mt-1">
            Set <code className="bg-white px-1.5 py-0.5 rounded text-xs">AI_PROGRAM_GEN_ENABLED=true</code> on Railway and ensure your Anthropic account has credits.
            <br />
            Cost is roughly <strong>$0.005 per program</strong> on Claude Haiku 4.5.
          </p>
        </Card>
      )}

      {error && (
        <Card className="bg-[var(--danger-soft)] border-[var(--danger)]/30 text-[var(--danger)] text-sm">
          ✕ {error}
        </Card>
      )}

      <Card>
        <form action={generateAndRedirect} className="space-y-4">
          <input type="hidden" name="lang" value={lang} />

          <Field label={dict.coach.assignToAthlete ?? "Assign to athlete"}>
            <select name="athleteId" required defaultValue={preselectedAthleteId} className={inputCls}>
              <option value="">—</option>
              {coach.athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.fullName}{a.division ? ` (${a.division})` : ""}</option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={dict.coach.startDate ?? "Start date"}>
              <input type="date" name="startDate" defaultValue={new Date().toISOString().slice(0, 10)} required className={inputCls} />
            </Field>
            <Field label={dict.coach.aiWeeks ?? "Length (weeks)"}>
              <input type="number" name="weeks" min={1} max={52} defaultValue={4} required className={inputCls} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={dict.coach.aiDaysPerWeek ?? "Days per week (blank = use athlete's frequency)"}>
              <input type="number" name="daysPerWeek" min={1} max={7} className={inputCls} placeholder="e.g. 4" />
            </Field>
            <Field label={dict.coach.aiStyle ?? "Style"}>
              <select name="style" className={inputCls} defaultValue="">
                <option value="">— infer from athlete —</option>
                <option value="crossfit">CrossFit</option>
                <option value="bodybuilding">Bodybuilding (hypertrophy)</option>
                <option value="women glutes/abs/legs">Women: glutes / abs / legs</option>
                <option value="strength">Pure strength</option>
                <option value="hybrid">Hybrid (strength + conditioning)</option>
                <option value="rehab">Rehab / return-to-sport</option>
                <option value="aerobic">Aerobic / engine</option>
              </select>
            </Field>
          </div>

          <Field label={dict.coach.aiGoalOverride ?? "Goal for THIS program (optional — overrides standing goals)"}>
            <input name="goalOverride" placeholder="e.g. Peak deadlift to 110 kg by end of block" className={inputCls} />
          </Field>

          <Field label={dict.coach.aiNeeds ?? "What should this program focus on? (required)"}>
            <textarea
              name="needs"
              rows={5}
              required
              minLength={5}
              placeholder="e.g. Bring up strict HSPU. Maintain Oly capacity. Two heavy lower-body sessions per week. Include Zone-2 conditioning. Test main lifts in the final week."
              className={inputCls}
            />
          </Field>

          <Field label={dict.coach.aiEquipment ?? "Equipment / constraints (optional)"}>
            <input name="equipment" placeholder="e.g. Home gym: barbell, plates to 100 kg, kettlebells, bands" className={inputCls} />
          </Field>

          <div className="pt-2">
            <Button type="submit" size="lg" disabled={!enabled}>
              ✨ {dict.coach.aiGenerate ?? "Generate program"}
            </Button>
            <p className="text-xs text-[var(--ink-subtle)] mt-2">
              {dict.coach.aiTimingNote ?? "Generation takes ~10–25s for short programs, up to ~60s for 12 weeks. Don't navigate away."}
            </p>
          </div>
        </form>
      </Card>

      <p className="text-xs text-[var(--ink-subtle)]">
        <Link href={`/${lang}/coach/programs`} className="hover:underline">← {dict.nav.programs}</Link>
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--ink-muted)]">{label}</span>
      {children}
    </label>
  );
}
