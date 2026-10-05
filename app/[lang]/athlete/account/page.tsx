import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../../dictionaries";
import { Card } from "@/components/ui/Card";

/**
 * Athlete account hub — single place where the client sees everything the
 * coach has created for them: goals, 1RMs, benchmarks, nutrition plan,
 * injury history, programming notes, plus links to the evolution charts,
 * movement history, engagement panel. Read-only.
 */
export default async function AthleteAccountPage({ params }: PageProps<"/[lang]/athlete/account">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login?next=${encodeURIComponent(`/${lang}/athlete/account`)}`);

  // Same athlete resolution pattern as the feedback actions: direct user
  // relation OR active AthleteLink.
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

  const [athlete, nutrition, movementCount, lastSession, firstSession] = await Promise.all([
    prisma.athlete.findUnique({
      where: { id: athleteId },
      include: {
        coachProfile: {
          select: {
            user: { select: { displayName: true, fullName: true, email: true } },
            handle: true,
          },
        },
      },
    }),
    prisma.nutritionPlan.findUnique({ where: { athleteId } }),
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
  if (!athlete) notFound();

  const coachName = athlete.coachProfile?.user?.displayName ?? athlete.coachProfile?.user?.fullName ?? athlete.coachProfile?.user?.email ?? "—";

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <header>
        <h1 className="text-3xl font-bold">Mi cuenta</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Todo lo que tu coach ha preparado para ti: objetivos, dieta, PRs y hábitos.
        </p>
      </header>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <QuickLink href={`/${lang}/athlete/evolution`} icon="📈" label="PRs y evolución" />
        <QuickLink href={`/${lang}/athlete/movements`} icon="🏋️" label="Mi historial" />
        <QuickLink href={`/${lang}/athlete/engagement`} icon="📊" label="Fotos · Medidas · Hábitos" />
        <QuickLink href={`/${lang}/athlete/calendar`} icon="📅" label="Calendario" />
      </div>

      {/* Identity + Coach */}
      <Card>
        <h2 className="font-semibold mb-3">Perfil</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <Row label="Nombre" value={athlete.fullName} />
          <Row label="Coach" value={coachName} />
          {athlete.sex && <Row label="Sexo" value={athlete.sex === "M" ? "Hombre" : "Mujer"} />}
          {athlete.age != null && <Row label="Edad" value={`${athlete.age} años`} />}
          {athlete.heightCm != null && <Row label="Altura" value={`${athlete.heightCm} cm`} />}
          {athlete.weightKg != null && <Row label="Peso" value={`${athlete.weightKg} kg`} />}
          {athlete.division && <Row label="División" value={athlete.division} />}
          <Row label="Entrenando desde" value={firstSession?.date.toISOString().slice(0, 10) ?? "—"} />
          <Row label="Última sesión completada" value={lastSession?.date.toISOString().slice(0, 10) ?? "—"} />
          <Row label="Movimientos totales programados" value={String(movementCount)} />
        </dl>
      </Card>

      {/* Goals */}
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

      {/* Nutrition plan */}
      {nutrition && (
        <Card>
          <h2 className="font-semibold mb-3">🥗 Plan de nutrición</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {nutrition.caloriesTarget != null && <MacroTile label="kcal" value={nutrition.caloriesTarget} color="indigo" />}
            {nutrition.proteinG != null && <MacroTile label="Proteína" value={`${nutrition.proteinG} g`} color="rose" />}
            {nutrition.carbsG != null && <MacroTile label="Carbos" value={`${nutrition.carbsG} g`} color="amber" />}
            {nutrition.fatG != null && <MacroTile label="Grasa" value={`${nutrition.fatG} g`} color="emerald" />}
            {nutrition.mealsPerDay != null && <MacroTile label="Comidas/día" value={String(nutrition.mealsPerDay)} color="slate" />}
          </div>
          {nutrition.mealPlan && (
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-1">Estructura del día</div>
              <div className="text-sm whitespace-pre-wrap bg-[var(--surface-2)]/60 rounded-lg p-3">{nutrition.mealPlan}</div>
            </div>
          )}
          {nutrition.supplements && <TextSection label="Suplementación" text={nutrition.supplements} />}
          {nutrition.restrictions && <TextSection label="Restricciones" text={nutrition.restrictions} />}
          {nutrition.notes && <TextSection label="Notas del coach" text={nutrition.notes} />}
          <div className="text-[0.65rem] text-[var(--ink-subtle)] mt-2">Actualizado {nutrition.updatedAt.toISOString().slice(0, 10)}</div>
        </Card>
      )}

      {/* Current 1RMs */}
      {renderJsonBlock(athlete.current1rms, "💪 1RMs actuales")}

      {/* Benchmarks */}
      {renderJsonBlock(athlete.currentBenchmarks, "⏱️ Benchmarks")}

      {/* Targets by competition */}
      {renderJsonBlock(athlete.targetsByCompetition, "🏆 Objetivos por competición")}

      {/* Injury history */}
      {renderJsonBlock(athlete.injuryHistory, "🩹 Historial de lesiones")}

      {/* Training frequency */}
      {renderJsonBlock(athlete.trainingFrequency, "📆 Frecuencia de entrenamiento")}

      {/* Programming notes */}
      {renderJsonBlock(athlete.programmingNotes, "📋 Notas de programación")}

      {/* Free notes */}
      {athlete.notes && (
        <Card>
          <h2 className="font-semibold mb-3">📝 Notas del coach</h2>
          <div className="text-sm whitespace-pre-wrap">{athlete.notes}</div>
        </Card>
      )}

      {/* Nothing from coach yet */}
      {!athlete.goals && !athlete.competitiveGoal && !nutrition && !athlete.notes && !athlete.current1rms && !athlete.currentBenchmarks && (
        <Card>
          <p className="text-sm text-[var(--ink-muted)]">
            Tu coach todavía no te ha añadido notas, objetivos o plan de nutrición. Cuando lo haga, aparecerán aquí.
          </p>
        </Card>
      )}

      <div className="text-xs text-center text-[var(--ink-muted)]">
        <Link href={`/${lang}/athlete`} className="hover:underline">← Volver al calendario</Link>
      </div>
    </div>
  );
}

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
    <Link href={href} className="rounded-xl border border-[var(--border)] bg-white hover:bg-[var(--surface-2)] p-3 text-center transition">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-semibold">{label}</div>
    </Link>
  );
}

function MacroTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  const bg = {
    indigo: "bg-indigo-50 text-indigo-900",
    rose: "bg-rose-50 text-rose-900",
    amber: "bg-amber-50 text-amber-900",
    emerald: "bg-emerald-50 text-emerald-900",
    slate: "bg-slate-50 text-slate-900",
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
      <div className="text-sm whitespace-pre-wrap">{text}</div>
    </div>
  );
}

/**
 * Render a JSON blob (current1rms, benchmarks, etc.) as a clean key-value
 * list. Falls back silently if the field is null or not an object.
 */
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
