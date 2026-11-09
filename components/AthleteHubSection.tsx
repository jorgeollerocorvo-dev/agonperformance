import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

/**
 * Athlete hub, split across tabs. Call-site passes the current `tab` and we
 * render just that panel — keeps the account page lean and respects the
 * "no over-information" standard.
 *
 * Tabs:
 *   overview  → profile + goals + quick links
 *   plan      → nutrition plan + 1RMs + benchmarks + competition targets
 *   progress  → quick links to progress & evolution (heavy rendering lives
 *               on the dedicated routes, not duplicated here)
 */
export type HubTab = "overview" | "plan" | "progress";

export default async function AthleteHubSection({
  userId,
  lang,
  tab = "overview",
}: {
  userId: string;
  lang: string;
  tab?: HubTab;
}) {
  // Resolve the athlete via direct User → Athlete OR AthleteLink.
  let athleteId: string | null = null;
  const direct = await prisma.athlete.findUnique({ where: { userId }, select: { id: true } });
  if (direct) {
    athleteId = direct.id;
  } else {
    const link = await prisma.athleteLink.findFirst({
      where: { userId, active: true },
      select: { athleteId: true },
    });
    athleteId = link?.athleteId ?? null;
  }
  if (!athleteId) return null;

  if (tab === "plan") return <PlanTab athleteId={athleteId} />;
  if (tab === "progress") return <ProgressTab athleteId={athleteId} lang={lang} />;
  return <OverviewTab athleteId={athleteId} lang={lang} />;
}

/* ─────────── Overview tab (default) ─────────── */

async function OverviewTab({ athleteId, lang }: { athleteId: string; lang: string }) {
  const [athlete, movementCount, lastSession, firstSession] = await Promise.all([
    prisma.athlete.findUnique({
      where: { id: athleteId },
      include: {
        coachProfile: { select: { user: { select: { displayName: true, fullName: true, email: true } } } },
      },
    }),
    prisma.programMovement.count({
      where: { programBlock: { programSession: { programWeek: { program: { athleteId } } } } },
    }),
    prisma.programSession.findFirst({
      where: { programWeek: { program: { athleteId } }, sessionLog: { isNot: null } },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.programSession.findFirst({
      where: { programWeek: { program: { athleteId } } },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);
  if (!athlete) return null;

  const coachName =
    athlete.coachProfile?.user?.displayName ??
    athlete.coachProfile?.user?.fullName ??
    athlete.coachProfile?.user?.email ??
    "—";

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <QuickLink href={`/${lang}/athlete`} icon="📅" label="Hoy" />
        <QuickLink href={`/${lang}/athlete/evolution`} icon="📈" label="PRs" />
        <QuickLink href={`/${lang}/athlete/movements`} icon="🏋️" label="Historial" />
        <QuickLink href={`/${lang}/athlete/engagement`} icon="📊" label="Fotos · Hábitos" />
      </div>

      <Card>
        <h2 className="font-semibold mb-3">Perfil</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <Row label="Nombre" value={athlete.fullName} />
          <Row label="Coach" value={coachName} />
          {athlete.division && <Row label="División" value={athlete.division} />}
          <Row label="Entrenando desde" value={firstSession?.date.toISOString().slice(0, 10) ?? "—"} />
          <Row label="Última sesión completada" value={lastSession?.date.toISOString().slice(0, 10) ?? "—"} />
          <Row label="Movimientos totales" value={String(movementCount)} />
        </dl>
      </Card>

      {(athlete.goals || athlete.competitiveGoal) && (
        <Card>
          <h2 className="font-semibold mb-3">🎯 Objetivos</h2>
          {athlete.competitiveGoal && (
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-1">Objetivo competitivo</div>
              <div className="text-sm whitespace-pre-wrap">{athlete.competitiveGoal}</div>
            </div>
          )}
          {athlete.goals && (
            <div>
              <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-1">Objetivos personales</div>
              <div className="text-sm whitespace-pre-wrap">{athlete.goals}</div>
            </div>
          )}
        </Card>
      )}

      {athlete.notes && (
        <Card>
          <h2 className="font-semibold mb-3">📝 Notas del coach</h2>
          <div className="text-sm whitespace-pre-wrap">{athlete.notes}</div>
        </Card>
      )}
    </>
  );
}

/* ─────────── Plan tab (nutrition + 1RMs + benchmarks) ─────────── */

async function PlanTab({ athleteId }: { athleteId: string }) {
  const [athlete, nutrition] = await Promise.all([
    prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { current1rms: true, currentBenchmarks: true, targetsByCompetition: true },
    }),
    prisma.nutritionPlan.findUnique({ where: { athleteId } }),
  ]);
  if (!athlete) return null;

  const empty = !nutrition && !athlete.current1rms && !athlete.currentBenchmarks && !athlete.targetsByCompetition;
  if (empty) {
    return (
      <Card>
        <p className="text-sm text-[var(--ink-muted)] text-center py-4">
          Tu coach todavía no ha creado tu plan. Cuando añada nutrición, 1RMs o benchmarks, aparecerán aquí.
        </p>
      </Card>
    );
  }

  return (
    <>
      {nutrition && (
        <Card>
          <h2 className="font-semibold mb-3">🥗 Plan de nutrición</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {nutrition.caloriesTarget != null && <MacroTile label="kcal" value={nutrition.caloriesTarget} color="indigo" />}
            {nutrition.proteinG != null && <MacroTile label="Proteína" value={`${nutrition.proteinG} g`} color="rose" />}
            {nutrition.carbsG != null && <MacroTile label="Carbos" value={`${nutrition.carbsG} g`} color="amber" />}
            {nutrition.fatG != null && <MacroTile label="Grasa" value={`${nutrition.fatG} g`} color="emerald" />}
          </div>
          {nutrition.mealPlan && <TextSection label="Estructura del día" text={nutrition.mealPlan} />}
          {nutrition.supplements && <TextSection label="Suplementación" text={nutrition.supplements} />}
          {nutrition.restrictions && <TextSection label="Restricciones" text={nutrition.restrictions} />}
          {nutrition.notes && <TextSection label="Notas del coach" text={nutrition.notes} />}
          <div className="text-[0.65rem] text-[var(--ink-subtle)] mt-2">
            Actualizado {nutrition.updatedAt.toISOString().slice(0, 10)}
          </div>
        </Card>
      )}

      {renderJsonBlock(athlete.current1rms, "💪 1RMs actuales")}
      {renderJsonBlock(athlete.currentBenchmarks, "⏱️ Benchmarks")}
      {renderJsonBlock(athlete.targetsByCompetition, "🏆 Objetivos por competición")}
    </>
  );
}

/* ─────────── Progress tab (quick-links to full pages) ─────────── */

function ProgressTab({ athleteId: _athleteId, lang }: { athleteId: string; lang: string }) {
  return (
    <>
      <Card>
        <p className="text-sm text-[var(--ink-muted)] mb-4">
          Para no sobrecargar esta pantalla, los módulos pesados (fotos, gráficas, grid de hábitos) viven en su propia página.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <BigLink href={`/${lang}/athlete/evolution`} icon="📈" title="Evolución y PRs" desc="Pesos, tiempos y récords por movimiento." />
          <BigLink href={`/${lang}/athlete/engagement`} icon="📊" title="Fotos · Medidas · Check-ins · Hábitos" desc="Registra tu progreso semanal." />
          <BigLink href={`/${lang}/athlete/movements`} icon="🏋️" title="Historial de movimientos" desc="Cada ejercicio que has hecho." />
          <BigLink href={`/${lang}/athlete/calendar`} icon="📅" title="Calendario" desc="Vista mensual de tus sesiones." />
        </div>
      </Card>
    </>
  );
}

/* ─────────── primitives ─────────── */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[var(--ink-muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] p-3 text-center transition">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-semibold">{label}</div>
    </Link>
  );
}

function BigLink({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:shadow-md p-4 transition flex items-start gap-3">
      <div className="text-2xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-[var(--ink-muted)] mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}

function MacroTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  const bg = {
    indigo: "bg-indigo-50 text-indigo-900",
    rose: "bg-rose-50 text-rose-900",
    amber: "bg-amber-50 text-amber-900",
    emerald: "bg-emerald-50 text-emerald-900",
  }[color] ?? "bg-slate-50 text-slate-900";
  return (
    <div className={`rounded-lg ${bg} p-3 text-center`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[0.65rem] uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}

function TextSection({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-3">
      <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-1">{label}</div>
      <div className="text-sm whitespace-pre-wrap bg-[var(--surface-2)]/60 rounded-lg p-3">{text}</div>
    </div>
  );
}

function renderJsonBlock(value: unknown, title: string) {
  if (!value || typeof value !== "object") return null;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return null;
  return (
    <Card>
      <h2 className="font-semibold mb-3">{title}</h2>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-[var(--ink-muted)] capitalize">{k.replace(/_/g, " ")}</dt>
            <dd className="font-medium break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
