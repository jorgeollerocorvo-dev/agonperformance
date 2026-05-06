import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import MovementVideoPreview from "@/components/MovementVideoPreview";
import IntensityReview from "@/components/IntensityReview";
import { ensureMovementVideoUrl } from "@/lib/youtube-search";
import { isYoutubeSearch } from "@/lib/youtube";
import { getDayNameFromDate } from "@/lib/day-utils";
import Link from "next/link";
import { Card, Pill, Button } from "@/components/ui/Card";
import { saveSessionFeedback } from "./actions";

function SessionCard({
  session,
  lang,
  dict,
  resolvedVideoByMovement,
  isToday,
}: {
  session: any;
  lang: string;
  dict: any;
  resolvedVideoByMovement: Map<string, string | null>;
  isToday: boolean;
}) {
  const isCompleted = !!session.sessionLog;
  const dateStr = session.date.toISOString().slice(0, 10);
  const dayName = getDayNameFromDate(session.date);

  return (
    <form action={saveSessionFeedback} className="space-y-4">
      <input type="hidden" name="programSessionId" value={session.id} />
      <input type="hidden" name="lang" value={lang} />

      <Card className={`space-y-3 ${isToday ? "border-[var(--primary)] border-2" : ""}`}>
        {/* Header with date and status */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm text-[var(--ink-muted)]">{dayName}</div>
            <div className="text-lg font-bold">{dateStr}</div>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <div className="text-xl">✓</div>
            ) : (
              session.focus === "Rest" && <div className="text-xl">⚡</div>
            )}
            {session.sessionLog?.intensityFeedback && (
              <Pill color="primary" className="text-lg">
                {["😊", "😐", "😓", "💪", "😤"][session.sessionLog.intensityFeedback - 1]}
              </Pill>
            )}
          </div>
        </header>

        {/* Session Title and Focus */}
        <div>
          <h3 className="text-lg font-bold">{session.programWeek.program.title}</h3>
          {session.focus && (
            <p className="text-sm text-[var(--ink-muted)] mt-1">{session.focus}</p>
          )}
        </div>

        {/* Show blocks only if not just a rest day */}
        {session.blocks.length > 0 && (
          <>
            {session.blocks.map((b: any) => (
              <Card key={b.id} className="space-y-3 bg-[var(--surface-2)]">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="w-7 h-7 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center text-sm font-bold">
                    {b.blockCode}
                  </span>
                  <span className="font-semibold">{b.label}</span>
                  {b.format && <span className="text-xs text-[var(--ink-muted)]">{b.format}</span>}
                </div>
                <ul className="space-y-3">
                  {b.movements.map((m: any, idx: number) => {
                    const p = (m.prescription ?? {}) as Record<string, unknown>;
                    const localName =
                      lang === "es"
                        ? m.movement?.nameEs ?? m.movement?.nameEn ?? m.customName ?? "—"
                        : lang === "ar"
                          ? m.movement?.nameAr ?? m.movement?.nameEn ?? m.customName ?? "—"
                          : m.movement?.nameEn ?? m.customName ?? "—";
                    const bits = [
                      p.sets && `${p.sets}×`,
                      p.reps ?? p.reps_range,
                      p.load_kg && `${p.load_kg} kg`,
                      p.load,
                      p.duration_min && `${p.duration_min} min`,
                      p.rest && `rest ${p.rest}`,
                      p.rpe && `RPE ${p.rpe}`,
                    ].filter(Boolean).join(" · ");
                    const prescriptionUrl = typeof p.youtubeUrl === "string" ? p.youtubeUrl : null;
                    const coachPinned = prescriptionUrl && !isYoutubeSearch(prescriptionUrl) ? prescriptionUrl : null;
                    const sourceUrl = coachPinned ?? m.movement?.videoUrl ?? resolvedVideoByMovement.get(m.id) ?? prescriptionUrl ?? null;
                    return (
                      <li key={m.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-3)]/40 p-3">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-xs font-bold text-[var(--ink-subtle)]">
                            {b.blockCode}
                            {idx + 1}
                          </span>
                          <span className="font-semibold flex-1">{localName}</span>
                        </div>
                        {bits && <div className="text-sm text-[var(--ink-muted)] mb-2">{bits}</div>}
                        <MovementVideoPreview
                          url={sourceUrl}
                          name={localName}
                          ctaLabel={dict.athlete.findDemo ?? "Find demo"}
                        />
                        {typeof p.notes === "string" && p.notes && <div className="text-xs text-[var(--ink-subtle)] italic mt-2">{p.notes}</div>}
                      </li>
                    );
                  })}
                </ul>
                {b.restSec && <div className="text-xs text-[var(--ink-muted)]">Rest: {b.restSec}s</div>}
              </Card>
            ))}
          </>
        )}

        {/* Action Buttons */}
        {!isCompleted && session.blocks.length > 0 && (
          <>
            <IntensityReview
              sessionId={session.id}
              lang={lang}
              initialFeedback={null}
              initialReview={null}
              dict={dict}
            />
            <Button type="submit" size="lg" className="w-full bg-[#1A1A1A] text-white hover:bg-[#333333]">
              ✓ {dict.athlete.markDone || "Complete Workout"}
            </Button>
          </>
        )}

        {isCompleted && session.sessionLog && (
          <>
            <IntensityReview
              sessionId={session.id}
              lang={lang}
              initialFeedback={session.sessionLog.intensityFeedback}
              initialReview={session.sessionLog.intensityReview}
              dict={dict}
            />
            <Button type="button" disabled size="lg" className="w-full">
              ✓ {dict.athlete.completed || "Completed"}
            </Button>
          </>
        )}
      </Card>
    </form>
  );
}

export default async function AthleteToday({ params, searchParams }: PageProps<"/[lang]/athlete">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();

  const link = await prisma.athleteLink.findFirst({
    where: { userId: session!.user.id, active: true },
    include: { athlete: true },
  });
  if (!link) {
    return (
      <Card>
        <h1 className="text-2xl font-bold mb-2">{dict.athlete.todayHeader}</h1>
        <p className="text-sm text-[var(--ink-muted)]">{dict.athlete.notLinked}</p>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate date ranges
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const historyStart = new Date(today);
  historyStart.setDate(today.getDate() - 30);
  historyStart.setHours(0, 0, 0, 0);

  // Query future week and past sessions in parallel
  const [futureSessions, pastSessions] = await Promise.all([
    prisma.programSession.findMany({
      where: {
        date: { gte: today, lte: weekEnd },
        programWeek: { program: { athleteId: link.athleteId } },
      },
      include: {
        programWeek: { include: { program: true } },
        blocks: {
          orderBy: { order: "asc" },
          include: { movements: { orderBy: { order: "asc" }, include: { movement: true } } },
        },
        sessionLog: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.programSession.findMany({
      where: {
        date: { gte: historyStart, lt: today },
        programWeek: { program: { athleteId: link.athleteId } },
      },
      include: {
        programWeek: { include: { program: true } },
        blocks: {
          orderBy: { order: "asc" },
          include: { movements: { orderBy: { order: "asc" }, include: { movement: true } } },
        },
        sessionLog: true,
      },
      orderBy: { date: "desc" },
    }),
  ]);

  // Resolve video URLs for all sessions
  const allSessions = [...futureSessions, ...pastSessions];
  const resolvedVideoByMovement = new Map<string, string | null>();
  if (allSessions.length > 0) {
    type MovementContext = { id: string; movementId: string | null; name: string; userUrl: string | null };
    const targets: MovementContext[] = [];
    for (const ps of allSessions) {
      for (const b of ps.blocks) {
        for (const m of b.movements) {
          const p = (m.prescription ?? {}) as Record<string, unknown>;
          const userUrl = typeof p.youtubeUrl === "string" ? p.youtubeUrl : null;
          if (userUrl && !isYoutubeSearch(userUrl)) continue;
          const name = m.movement?.nameEn ?? m.customName ?? "exercise";
          targets.push({ id: m.id, movementId: m.movementId, name, userUrl });
        }
      }
    }
    const resolved = await Promise.allSettled(
      targets.map(async (t) => ({ id: t.id, url: await ensureMovementVideoUrl(t.movementId, t.name) })),
    );
    for (const r of resolved) {
      if (r.status === "fulfilled") resolvedVideoByMovement.set(r.value.id, r.value.url);
    }
  }

  if (futureSessions.length === 0) {
    return (
      <Card>
        <h1 className="text-2xl font-bold mb-2">{dict.athlete.todayHeader}</h1>
        <p className="text-sm text-[var(--ink-muted)] mb-4">{dict.athlete.noWorkout}</p>
        <Link
          href={`/${lang}/athlete/talk`}
          className="inline-flex rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          💬 {dict.athlete.talkToCoach}
        </Link>
      </Card>
    );
  }

  const sp = await searchParams;
  const tab = String(sp?.tab ?? "upcoming");

  return (
    <div className="space-y-6">
      {/* Header with Greeting */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#2E75B6] text-white grid place-items-center font-bold">
            {link.athlete.fullName?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div>
            <h1 className="text-2xl font-bold">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {link.athlete.fullName?.split(" ")[0] ?? "Athlete"}</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[#E5E5E5]">
          <Link
            href={`?tab=upcoming`}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === "upcoming"
                ? "border-[#2E75B6] text-[#2E75B6]"
                : "border-transparent text-[#666666] hover:text-[#1A1A1A]"
            }`}
          >
            Upcoming
          </Link>
          <Link
            href={`?tab=past`}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === "past"
                ? "border-[#2E75B6] text-[#2E75B6]"
                : "border-transparent text-[#666666] hover:text-[#1A1A1A]"
            }`}
          >
            Past
          </Link>
        </div>
      </div>

      {/* Content based on tab */}
      <div className="space-y-4">
        {tab === "upcoming" && (
          <>
            {futureSessions.length > 0 ? (
              futureSessions.map((ps) => {
                const isToday = ps.date.getTime() === today.getTime();
                return (
                  <SessionCard
                    key={ps.id}
                    session={ps}
                    lang={lang}
                    dict={dict}
                    resolvedVideoByMovement={resolvedVideoByMovement}
                    isToday={isToday}
                  />
                );
              })
            ) : (
              <Card>
                <p className="text-sm text-[var(--ink-muted)]">{dict.athlete.noWorkout}</p>
              </Card>
            )}
          </>
        )}

        {tab === "past" && (
          <>
            {pastSessions.length > 0 ? (
              pastSessions.map((ps) => (
                <SessionCard
                  key={ps.id}
                  session={ps}
                  lang={lang}
                  dict={dict}
                  resolvedVideoByMovement={resolvedVideoByMovement}
                  isToday={false}
                />
              ))
            ) : (
              <Card>
                <p className="text-sm text-[var(--ink-muted)]">No completed workouts yet.</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
