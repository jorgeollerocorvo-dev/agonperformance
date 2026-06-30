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
import { generateAIProgressionWeek, deleteProgramWeek, restoreProgramWeek, purgeDeletedWeek } from "./actions";
import { aiProgramGenEnabled } from "@/lib/features";
import DeleteWeekButton from "@/components/DeleteWeekButton";

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
  // AI progression-week button: available to ALL coaches whenever AI generation
  // is enabled. Works for fresh / manually-created / empty / partially-filled
  // weeks — the AI uses whatever history is available.
  const aiAvailable = aiProgramGenEnabled();
  const weekDeletedId = typeof sp?.weekDeleted === "string" ? sp.weekDeleted : null;
  const weekDeleteError = typeof sp?.weekDeleteError === "string" ? decodeURIComponent(sp.weekDeleteError) : null;
  const weekRestored = typeof sp?.weekRestored === "string" ? sp.weekRestored : null;
  const weekRestoreError = typeof sp?.weekRestoreError === "string" ? decodeURIComponent(sp.weekRestoreError) : null;
  const coJointLinked = typeof sp?.coJointLinked === "string" ? decodeURIComponent(sp.coJointLinked) : null;
  const coJointUnlinked = sp?.coJointUnlinked === "1";
  const coJointError = typeof sp?.coJointError === "string" ? decodeURIComponent(sp.coJointError) : null;

  // Recently-deleted weeks for the trash card.
  const deletedWeeks = await prisma.deletedProgramWeek.findMany({
    where: { programId: program.id },
    orderBy: { deletedAt: "desc" },
    take: 20,
  });

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

  // Resolve co-joint partners for any session that has a coJointKey set.
  // We look up other ProgramSessions sharing each key and grab the owning
  // athlete's name to display in a badge.
  const coJointKeys = Array.from(
    new Set(allSessions.map((s) => s.coJointKey).filter((k): k is string => !!k)),
  );
  const coJointPartnersByKey = new Map<string, { selfId: string; partnerName: string }[]>();
  if (coJointKeys.length > 0) {
    const linkedRows = await prisma.programSession.findMany({
      where: { coJointKey: { in: coJointKeys } },
      include: {
        programWeek: { include: { program: { include: { athlete: { select: { id: true, fullName: true } } } } } },
      },
    });
    for (const r of linkedRows) {
      const key = r.coJointKey!;
      const existing = coJointPartnersByKey.get(key) ?? [];
      existing.push({ selfId: r.id, partnerName: r.programWeek.program.athlete.fullName });
      coJointPartnersByKey.set(key, existing);
    }
  }
  /** For a given session, find another athlete's name on the same coJointKey (the "partner"). */
  const partnerNameFor = (sessionId: string, coJointKey: string | null): string | null => {
    if (!coJointKey) return null;
    const peers = coJointPartnersByKey.get(coJointKey) ?? [];
    const others = peers.filter((p) => p.selfId !== sessionId);
    if (others.length === 0) return null;
    if (others.length === 1) return others[0].partnerName;
    return `${others[0].partnerName} +${others.length - 1}`;
  };

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
            coJointKey: existing.coJointKey ?? null,
            coJointWithName: partnerNameFor(existing.id, existing.coJointKey ?? null),
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

      {/* Flash: week just deleted, with one-click undo */}
      {weekDeletedId && (
        <Card className="bg-[var(--warn)]/10 border-[var(--warn)]/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold">🗑 Week deleted.</span>{" "}
              <span className="text-[var(--ink-muted)]">You can restore it for as long as it stays in &quot;Recently deleted&quot; below.</span>
            </div>
            <form action={restoreProgramWeek}>
              <input type="hidden" name="deletedId" value={weekDeletedId} />
              <input type="hidden" name="programId" value={program.id} />
              <input type="hidden" name="lang" value={lang} />
              <button className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-1.5 text-sm font-semibold hover:opacity-90">
                ↶ Undo
              </button>
            </form>
          </div>
        </Card>
      )}
      {weekRestored && (
        <Card className="bg-[var(--success-soft)] border-[var(--success)]/30 text-sm">
          ✓ Week restored as Week {weekRestored}.
        </Card>
      )}
      {(weekDeleteError || weekRestoreError) && (
        <Card className="bg-[var(--danger-soft)] border-[var(--danger)]/30 text-sm text-[var(--danger)]">
          ✕ {weekDeleteError ?? weekRestoreError}
        </Card>
      )}

      {/* Flash: co-joint link / unlink */}
      {coJointLinked && (
        <Card className="bg-[var(--success-soft)] border-[var(--success)]/30 text-sm">
          🔗 ✓ Co-joint workout copied to {coJointLinked}. Adjust their loads as needed.
        </Card>
      )}
      {coJointUnlinked && (
        <Card className="bg-[var(--surface-2)] border-[var(--border)] text-sm">
          🔗 Unlinked.
        </Card>
      )}
      {coJointError && (
        <Card className="bg-[var(--danger-soft)] border-[var(--danger)]/30 text-sm text-[var(--danger)]">
          ✕ {coJointError}
        </Card>
      )}

      {/* Manage weeks: per-week delete buttons */}
      {program.weeks.length > 0 && (
        <Card>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h3 className="font-bold text-base">📋 Weeks</h3>
            <span className="text-xs text-[var(--ink-muted)]">{program.weeks.length} total</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {program.weeks.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm">Week {w.weekNumber}</div>
                  {w.weekLabel && (
                    <div className="text-xs text-[var(--ink-muted)] truncate">{w.weekLabel}</div>
                  )}
                  <div className="text-[0.65rem] text-[var(--ink-subtle)] mt-0.5">
                    {w.sessions.length} day{w.sessions.length === 1 ? "" : "s"}
                  </div>
                </div>
                <DeleteWeekButton
                  weekId={w.id}
                  programId={program.id}
                  lang={lang}
                  weekNumber={w.weekNumber}
                  weekLabel={w.weekLabel}
                  action={deleteProgramWeek}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trash: deleted weeks the coach can restore (or permanently purge) */}
      {deletedWeeks.length > 0 && (
        <Card className="bg-[var(--surface-2)]/40">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h3 className="font-bold text-base">♻️ Recently deleted</h3>
            <span className="text-xs text-[var(--ink-muted)]">{deletedWeeks.length} item{deletedWeeks.length === 1 ? "" : "s"}</span>
          </div>
          <div className="space-y-2">
            {deletedWeeks.map((dw) => (
              <div
                key={dw.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white border border-[var(--border)] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">
                    Week {dw.weekNumber}
                    {dw.weekLabel ? <span className="text-[var(--ink-muted)] font-normal"> — {dw.weekLabel}</span> : null}
                  </div>
                  <div className="text-[0.65rem] text-[var(--ink-subtle)]">
                    Deleted {dw.deletedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <form action={restoreProgramWeek}>
                    <input type="hidden" name="deletedId" value={dw.id} />
                    <input type="hidden" name="programId" value={program.id} />
                    <input type="hidden" name="lang" value={lang} />
                    <button
                      type="submit"
                      className="rounded-md bg-[var(--primary)] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[var(--primary-hover)] whitespace-nowrap"
                      title="Restore this week to the end of the program"
                    >
                      ↶ Restore
                    </button>
                  </form>
                  <DeleteWeekButton
                    weekId={dw.id}
                    programId={program.id}
                    lang={lang}
                    weekNumber={dw.weekNumber}
                    weekLabel={dw.weekLabel}
                    action={purgeDeletedWeek}
                    variant="compact"
                    permanent
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
