import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { getDayNameFromDate, getDayNameFromDateString } from "@/lib/day-utils";
import ProgramBuilder from "./ProgramBuilder";
import CoachMonthlyCalendar from "@/components/CoachMonthlyCalendar";
import type { EditorProgram } from "./actions";
import { Card } from "@/components/ui/Card";
import { regenerateProgramFromDocument } from "../../import/actions";
import { generateAIProgressionWeek } from "./actions";
import { isJorge } from "@/lib/jorge";
import { aiProgramGenEnabled } from "@/lib/features";

export default async function ProgramDetail({ params, searchParams }: PageProps<"/[lang]/coach/programs/[id]">) {
  // Coach program detail with calendar for managing workouts
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login?next=${encodeURIComponent(`/${lang}/coach/programs/${id}`)}`);
  const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coachProfile) notFound();

  const program = await prisma.program.findFirst({
    where: {
      OR: [{ id }, { programKey: id }],
      athlete: { coachProfileId: coachProfile.id },
    },
    include: {
      athlete: true,
      documents: { orderBy: { createdAt: "desc" }, take: 1 },
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          sessions: {
            orderBy: { date: "asc" },
            include: {
              blocks: {
                orderBy: { order: "asc" },
                include: { movements: { orderBy: { order: "asc" }, include: { movement: true } } },
              },
              sessionLog: true,
            },
          },
        },
      },
    },
  });
  if (!program) notFound();

  const sp = await searchParams;
  const regenError = typeof sp?.regenError === "string" ? decodeURIComponent(sp.regenError) : null;
  const regenerated = sp?.regen === "1";
  const aiWeekError = typeof sp?.aiWeekError === "string" ? decodeURIComponent(sp.aiWeekError) : null;
  const aiWeekAdded = typeof sp?.aiWeekAdded === "string" ? sp.aiWeekAdded : null;
  const aiAvailable = isJorge(session) && aiProgramGenEnabled();

  async function regenerate() {
    "use server";
    const r = await regenerateProgramFromDocument(id);
    if (r.error) redirect(`/${lang}/coach/programs/${id}?regenError=${encodeURIComponent(r.error)}`);
    redirect(`/${lang}/coach/programs/${id}?regen=1`);
  }

  const sourceDoc = program.documents[0] ?? null;
  const docHref = sourceDoc ? `/api/programs/${program.id}/document` : null;

  // Flatten sessions for calendar view
  const allSessions = program.weeks.flatMap((w) => w.sessions);

  // Find the last completed session date
  const lastCompletedDate = allSessions
    .filter((s) => s.sessionLog) // Only sessions with logs (completed)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .at(0)
    ?.date.toISOString()
    .slice(0, 10) ?? null;

  // Convert to editor shape. If a week has no sessions yet, synthesize 7 empty days from its start dates.
  const startDate = program.startDate;

  const initial: EditorProgram = {
    id: program.id,
    title: program.title,
    goal: program.goal,
    startDate: program.startDate.toISOString().slice(0, 10),
    endDate: program.endDate?.toISOString().slice(0, 10) ?? null,
    durationWeeks: program.durationWeeks ?? program.weeks.length,
    weeks: program.weeks.map((w, wi) => {
      // Build a map of existing sessions by date within this week
      const byDate = new Map(w.sessions.map((s) => [s.date.toISOString().slice(0, 10), s]));

      // Determine the 7 dates this week should cover
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + wi * 7);
      const days = Array.from({ length: 7 }, (_, di) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + di);
        const ds = d.toISOString().slice(0, 10);
        const existing = byDate.get(ds);
        if (existing) {
          return {
            id: existing.id,
            date: ds,
            day: getDayNameFromDate(d),
            focus: existing.focus,
            intensity: existing.intensity,
            notes: existing.notes,
            blocks: existing.blocks.map((b) => ({
              id: b.id,
              blockCode: b.blockCode,
              label: b.label,
              format: b.format,
              restSec: b.restSec,
              notes: b.notes,
              movements: b.movements.map((m) => {
                const p = (m.prescription ?? {}) as Record<string, unknown>;
                return {
                  id: m.id,
                  name: m.customName ?? m.movement?.nameEn ?? "",
                  sets: (p.sets as string | undefined) ?? (p.sets != null ? String(p.sets) : null),
                  reps: (p.reps as string | undefined) ?? (p.reps_range as string | undefined) ?? null,
                  load: (p.load as string | undefined) ?? (p.load_kg != null ? `${p.load_kg} kg` : null),
                  rest: (p.rest as string | undefined) ?? (p.rest_sec != null ? `${p.rest_sec}s` : null),
                  notes: (p.notes as string | undefined) ?? null,
                  youtubeUrl: m.movement?.videoUrl ?? null, // Always fetch from movement library
                  isTest: m.isTest,
                  movementId: m.movement?.id ?? null,  // Reference to Movement library
                };
              }),
            })),
          };
        }
        // Synthesized empty day
        return {
          id: null,
          date: ds,
          day: getDayNameFromDateString(ds),
          focus: null,
          intensity: null,
          notes: null,
          blocks: [],
        };
      });

      return {
        id: w.id,
        weekNumber: w.weekNumber,
        weekLabel: w.weekLabel,
        days,
      };
    }),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <Link href={`/${lang}/coach/athletes/${program.athleteId}`} className="text-sm text-[var(--ink-muted)] hover:underline">← {program.athlete.fullName}</Link>
      </div>

      {regenerated && (
        <Card className="bg-[var(--success-soft)] border-[var(--success)]/30 text-sm">
          ✓ {dict.coach.regenSuccess ?? "Program rebuilt from your source document."}
        </Card>
      )}
      {regenError && (
        <Card className="bg-[var(--danger-soft)] border-[var(--danger)]/30 text-sm text-[var(--danger)]">
          ✕ {regenError}
        </Card>
      )}

      {sourceDoc && (
        <Card className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">{dict.coach.sourceDocument ?? "Source document"}</div>
            <div className="text-sm font-medium truncate">
              {sourceDoc.filename ?? (sourceDoc.source === "paste" ? (dict.coach.pastedText ?? "Pasted text") : "Imported document")}
            </div>
            <div className="text-xs text-[var(--ink-subtle)]">
              {dict.coach.savedOn ?? "Saved"} {sourceDoc.createdAt.toISOString().slice(0, 16).replace("T", " ")}
            </div>
          </div>
          {docHref && (
            <a
              href={docHref}
              download
              className="rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
            >
              ⬇ {dict.coach.downloadDocument ?? "Download"}
            </a>
          )}
          <form action={regenerate}>
            <button className="rounded-full bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)]">
              ⚡ {dict.coach.regenerateProgram ?? "Regenerate program from this document"}
            </button>
          </form>
        </Card>
      )}

      <CoachMonthlyCalendar
        sessions={allSessions}
        programId={program.id}
        lang={lang}
        dict={dict}
      />

      {/* AI: append a new progression week */}
      {aiAvailable && (
        <Card className="bg-gradient-to-br from-[var(--primary-soft)] to-white border-[var(--primary)]/30">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[260px]">
              <h3 className="font-bold text-base">✨ Add progression week with AI</h3>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Generates Week {(program.weeks.at(-1)?.weekNumber ?? 0) + 1} by analyzing the prior {program.weeks.length} week{program.weeks.length === 1 ? "" : "s"} — same structure, same movements, sensibly progressed loads. Add an optional hint (e.g. &quot;deload&quot;, &quot;test 1RM&quot;, &quot;harder squats&quot;) to steer the AI.
              </p>
            </div>
            <form action={generateAIProgressionWeek} className="flex flex-wrap items-end gap-2 w-full sm:w-auto">
              <input type="hidden" name="programId" value={program.id} />
              <input type="hidden" name="lang" value={lang} />
              <label className="text-sm flex-1 min-w-[180px]">
                <span className="block text-xs text-[var(--ink-muted)] mb-1">Hint (optional)</span>
                <input
                  name="coachHint"
                  placeholder="e.g. deload, test week, more hypertrophy"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-[var(--primary)] text-white px-5 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)] whitespace-nowrap"
              >
                ✨ Generate Week {(program.weeks.at(-1)?.weekNumber ?? 0) + 1}
              </button>
            </form>
          </div>
          {aiWeekAdded && (
            <div className="mt-3 rounded-lg bg-[var(--success-soft)] border border-[var(--success)]/30 text-[var(--success)] px-3 py-2 text-sm">
              ✓ Week {aiWeekAdded} added — scroll to the week tabs below.
            </div>
          )}
          {aiWeekError && (
            <div className="mt-3 rounded-lg bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-[var(--danger)] px-3 py-2 text-sm">
              ✕ {aiWeekError}
            </div>
          )}
        </Card>
      )}

      <ProgramBuilder
        initial={initial}
        lang={lang}
        lastCompletedDate={lastCompletedDate}
        dict={{
          save: dict.coach.save,
          saved: dict.coach.saved,
          addBlock: dict.coach.addBlock ?? "Add block",
          addMovement: dict.coach.addMovement ?? "Add movement",
          addWeek: dict.coach.addWeek ?? "Add week",
          duplicateDay: dict.coach.duplicateDay ?? "Duplicate day",
          clear: dict.coach.clear ?? "Clear",
          findVideo: dict.coach.findVideo ?? "Find video on YouTube",
          notes: dict.coach.notes,
          reps: dict.exercise?.reps ?? "Reps",
          sets: dict.exercise?.sets ?? "Sets",
          load: dict.exercise?.load ?? "Load",
          rest: dict.exercise?.rest ?? "Rest",
          movementName: dict.exercise?.name ?? "Exercise",
          blockLabel: dict.coach.blockLabel ?? "Block label",
          blockFormat: dict.coach.blockFormat ?? "Format (e.g. 3×5 @ RPE 8)",
          dayFocus: dict.coach.dayFocus ?? "Focus",
          dayIntensity: dict.coach.dayIntensity ?? "Intensity",
          week: dict.coach.week ?? "Week",
          day: dict.coach.day ?? "Day",
          rest_day: dict.coach.restDay ?? "Rest day",
          copy: dict.coach.copy ?? "Copy",
          paste: dict.coach.paste ?? "Paste",
          pasteBlock: dict.coach.pasteBlock ?? "Paste block here",
          pasteMovement: dict.coach.pasteMovement ?? "Paste movement here",
          clipboardEmpty: "",
          markRest: dict.coach.markRest ?? "Mark as rest day",
        }}
      />
    </div>
  );
}
