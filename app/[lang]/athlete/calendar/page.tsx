import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Pill } from "@/components/ui/Card";

/**
 * Athlete calendar — month grid view of all program sessions.
 *
 * - Highlights every day with a scheduled session
 * - Color-codes by completion: future (blue), today (ring), past completed (green), past missed (grey)
 * - Click any day with a session → /athlete/session/[id]
 * - Prev / Today / Next buttons via ?month=YYYY-MM
 */
export default async function AthleteCalendar({ params, searchParams }: PageProps<"/[lang]/athlete/calendar">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const session = await auth();

  const link = await prisma.athleteLink.findFirst({
    where: { userId: session!.user.id, active: true },
  });
  if (!link) {
    return (
      <Card>
        <h1 className="text-2xl font-bold mb-2">{dict.athlete.calendarTitle ?? "Calendar"}</h1>
        <p className="text-sm text-[var(--ink-muted)]">{dict.athlete.notLinked}</p>
      </Card>
    );
  }

  // Parse ?month=YYYY-MM, default to current month
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthParam = typeof sp?.month === "string" ? sp.month : null;
  const [yyyy, mm] = (monthParam ?? "").match(/^(\d{4})-(\d{2})$/)?.slice(1).map(Number) ?? [
    today.getFullYear(),
    today.getMonth() + 1,
  ];
  const viewYear = yyyy as number;
  const viewMonth = mm as number; // 1-12

  const monthStart = new Date(viewYear, viewMonth - 1, 1);
  const monthEnd = new Date(viewYear, viewMonth, 0); // last day
  const daysInMonth = monthEnd.getDate();

  // Pull every session in this month for this athlete
  const sessions = await prisma.programSession.findMany({
    where: {
      programWeek: { program: { athleteId: link.athleteId } },
      date: {
        gte: monthStart,
        lte: new Date(viewYear, viewMonth - 1, daysInMonth, 23, 59, 59),
      },
    },
    include: {
      programWeek: { include: { program: true } },
      sessionLog: true,
    },
    orderBy: { date: "asc" },
  });

  // Build a date-keyed map (YYYY-MM-DD → session). We pick the first session per date if multiple.
  const byDate = new Map<string, (typeof sessions)[number]>();
  for (const s of sessions) {
    const key = s.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, s);
  }

  // Year-totals (for the small overview pills)
  const yearStart = new Date(viewYear, 0, 1);
  const yearEnd = new Date(viewYear, 11, 31, 23, 59, 59);
  const yearAgg = await prisma.programSession.findMany({
    where: {
      programWeek: { program: { athleteId: link.athleteId } },
      date: { gte: yearStart, lte: yearEnd },
    },
    include: { sessionLog: true },
    select: { date: true, focus: true, sessionLog: true },
  });
  const totalScheduled = yearAgg.length;
  const totalCompleted = yearAgg.filter((s) => s.sessionLog).length;

  // Pad before the 1st: figure out which weekday it falls on (0 = Sunday) — show Mon-first grid
  const firstWeekdayMonFirst = (monthStart.getDay() + 6) % 7; // 0 = Mon
  const totalCells = firstWeekdayMonFirst + daysInMonth;
  const trailingPad = (7 - (totalCells % 7)) % 7;
  const cells: ({ kind: "pad" } | { kind: "day"; date: Date; key: string })[] = [];
  for (let i = 0; i < firstWeekdayMonFirst; i++) cells.push({ kind: "pad" });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth - 1, d);
    cells.push({ kind: "day", date, key: date.toISOString().slice(0, 10) });
  }
  for (let i = 0; i < trailingPad; i++) cells.push({ kind: "pad" });

  // Prev / next month
  const prev = new Date(viewYear, viewMonth - 2, 1);
  const next = new Date(viewYear, viewMonth, 1);
  const fmtMonth = (d: Date) =>
    d.toLocaleDateString(lang === "es" ? "es-ES" : lang === "ar" ? "ar" : "en-US", {
      month: "long",
      year: "numeric",
    });
  const monthStr = fmtMonth(monthStart);
  const prevHref = `/${lang}/athlete/calendar?month=${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const nextHref = `/${lang}/athlete/calendar?month=${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  const todayHref = `/${lang}/athlete/calendar`;

  // Localized weekday header (Mon-first)
  const weekdayLocale = lang === "es" ? "es-ES" : lang === "ar" ? "ar" : "en-US";
  const weekdayLabels = (() => {
    // Pick Monday Apr 5 2026 as anchor; locale-format short weekdays
    const ref = new Date(2026, 3, 6); // Mon Apr 6 2026
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString(weekdayLocale, { weekday: "short" });
    });
  })();

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-[var(--ink-muted)]">{dict.athlete.calendarTitle ?? "Calendar"}</p>
          <h1 className="text-3xl font-bold capitalize">{monthStr}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={prevHref} className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">←</Link>
          <Link href={todayHref} className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-3 py-1.5 text-sm font-semibold hover:opacity-90">
            {dict.athlete.todayBtn ?? "Today"}
          </Link>
          <Link href={nextHref} className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">→</Link>
        </div>
      </header>

      <Card padded={false} className="p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdayLabels.map((w) => (
            <div key={w} className="text-center text-[10px] uppercase tracking-wider text-[var(--ink-subtle)] font-semibold">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (c.kind === "pad") return <div key={i} className="aspect-square" />;
            const s = byDate.get(c.key);
            const isToday = c.date.getTime() === today.getTime();
            const isPast = c.date < today;
            const isCompleted = !!s?.sessionLog;
            const hasSession = !!s;

            const baseCls = "relative aspect-square rounded-lg border flex flex-col items-center justify-center text-xs sm:text-sm transition";
            const colorCls = !hasSession
              ? "border-transparent text-[var(--ink-subtle)]"
              : isCompleted
              ? "bg-[var(--success-soft)] border-[var(--success)]/40 text-[var(--success)] hover:bg-[var(--success-soft)]/80"
              : isPast
              ? "bg-[var(--surface-2)] border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]"
              : "bg-[var(--primary-soft)] border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary-soft)]/80";
            const ringCls = isToday ? "ring-2 ring-[var(--ink)] ring-offset-1" : "";

            const inner = (
              <>
                <span className="font-semibold leading-none">{c.date.getDate()}</span>
                {hasSession && (
                  <span className="text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 max-w-full px-1 text-center leading-tight">
                    {s!.focus ? s!.focus : isCompleted ? "✓" : "•"}
                  </span>
                )}
              </>
            );

            return hasSession ? (
              <Link
                key={i}
                href={`/${lang}/athlete/session/${s!.id}`}
                className={`${baseCls} ${colorCls} ${ringCls}`}
                title={`${c.date.toISOString().slice(0, 10)} — ${s!.focus ?? s!.programWeek.program.title}`}
              >
                {inner}
              </Link>
            ) : (
              <div key={i} className={`${baseCls} ${colorCls} ${ringCls}`}>
                {inner}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 text-xs text-[var(--ink-muted)]">
        <Pill color="primary">{dict.athlete.scheduled ?? "Scheduled"}</Pill>
        <Pill color="success">{dict.athlete.completedPill ?? "Completed"}</Pill>
        <Pill color="soft">{dict.athlete.missed ?? "Past, not done"}</Pill>
      </div>

      <Card>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="font-semibold">{viewYear} {dict.athlete.summary ?? "summary"}</h2>
          <div className="text-sm text-[var(--ink-muted)]">
            {totalCompleted} / {totalScheduled} {dict.athlete.completedLower ?? "completed"}
          </div>
        </div>
        {totalScheduled > 0 && (
          <div className="mt-3 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full bg-[var(--success)]"
              style={{ width: `${Math.round((totalCompleted / totalScheduled) * 100)}%` }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
