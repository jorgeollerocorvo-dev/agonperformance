import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../../dictionaries";
import { Card } from "@/components/ui/Card";

/**
 * Lifetime movement history for an athlete. Every exercise they've been
 * programmed, aggregated by name — first/last date, times programmed, how
 * many logged (actuals), with a link to the evolution chart filtered to
 * that movement.
 *
 * Standard #2: pure DB aggregation, no AI, no YouTube. Charts live on
 * /athlete/evolution; this page is the index.
 */
export default async function AthleteMovementsPage({ params }: PageProps<"/[lang]/athlete/movements">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login?next=${encodeURIComponent(`/${lang}/athlete/movements`)}`);

  let athleteId: string | null = null;
  const direct = await prisma.athlete.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (direct) {
    athleteId = direct.id;
  } else {
    const link = await prisma.athleteLink.findFirst({
      where: { userId: session.user.id, active: true },
      select: { athleteId: true },
    });
    athleteId = link?.athleteId ?? null;
  }
  if (!athleteId) notFound();

  // Pull every ProgramMovement the athlete has ever had, with session date.
  const rows = await prisma.programMovement.findMany({
    where: {
      programBlock: { programSession: { programWeek: { program: { athleteId } } } },
    },
    select: {
      customName: true,
      movement: { select: { nameEn: true, videoUrl: true } },
      programBlock: {
        select: {
          programSession: { select: { date: true, sessionLog: { select: { actuals: true } } } },
        },
      },
    },
  });

  // Aggregate by normalized name.
  type Agg = {
    name: string;
    hasVideo: boolean;
    timesProgrammed: number;
    timesLogged: number;
    firstDate: string | null;
    lastDate: string | null;
  };
  const byName = new Map<string, Agg>();
  for (const r of rows) {
    const name = r.movement?.nameEn ?? r.customName ?? "";
    if (!name.trim()) continue;
    const key = name.toLowerCase().trim();
    const date = r.programBlock?.programSession?.date?.toISOString().slice(0, 10) ?? null;
    const actuals = (r.programBlock?.programSession?.sessionLog?.actuals ?? null) as Record<string, unknown> | null;
    const isLogged = !!actuals && Object.keys(actuals).length > 0;

    const prev = byName.get(key);
    if (prev) {
      prev.timesProgrammed++;
      if (isLogged) prev.timesLogged++;
      if (date && (!prev.firstDate || date < prev.firstDate)) prev.firstDate = date;
      if (date && (!prev.lastDate || date > prev.lastDate)) prev.lastDate = date;
    } else {
      byName.set(key, {
        name: titleCase(name),
        hasVideo: !!r.movement?.videoUrl,
        timesProgrammed: 1,
        timesLogged: isLogged ? 1 : 0,
        firstDate: date,
        lastDate: date,
      });
    }
  }

  const list = Array.from(byName.values()).sort((a, b) => b.timesProgrammed - a.timesProgrammed);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <header>
        <h1 className="text-2xl font-bold">Mi historial de movimientos</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Cada ejercicio que has entrenado. {list.length} movimientos distintos · {rows.length} veces programados.
        </p>
      </header>

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--ink-muted)]">Aún no tienes movimientos registrados. Cuando tu coach programe entrenos aparecerán aquí.</p>
        </Card>
      ) : (
        <Card padded={false} className="divide-y divide-[var(--border)]">
          {list.map((m) => (
            <div key={m.name} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm truncate">{m.name}</div>
                  {m.hasVideo && <span className="text-[0.65rem] text-emerald-700" title="Hay video demo">▶</span>}
                </div>
                <div className="text-xs text-[var(--ink-muted)] mt-0.5">
                  {m.timesProgrammed}× programado{m.timesLogged > 0 ? ` · ${m.timesLogged} con registro` : ""}
                  {m.firstDate && m.lastDate && ` · desde ${m.firstDate}`}
                </div>
              </div>
              {m.timesLogged > 0 && (
                <Link
                  href={`/${lang}/athlete/evolution`}
                  className="text-xs text-[var(--primary)] font-semibold hover:underline shrink-0"
                >
                  Ver evolución →
                </Link>
              )}
            </div>
          ))}
        </Card>
      )}

      <div className="text-xs text-center text-[var(--ink-muted)]">
        <Link href={`/${lang}/athlete/account`} className="hover:underline">← Mi cuenta</Link>
      </div>
    </div>
  );
}

function titleCase(s: string): string {
  return s.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
