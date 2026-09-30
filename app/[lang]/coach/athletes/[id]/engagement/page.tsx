import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import MeasurementChart from "@/components/MeasurementChart";
import { createHabit, deleteHabit, replyToCheckIn, updateAthleteStatus } from "./actions";
import type { AthleteStatus } from "@prisma/client";

export default async function CoachAthleteEngagementPage({ params }: PageProps<"/[lang]/coach/athletes/[id]/engagement">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session!.user.id } });
  if (!coach) notFound();

  const athlete = await prisma.athlete.findFirst({ where: { id, coachProfileId: coach.id } });
  if (!athlete) notFound();

  const [photos, measurements, checkIns, habits, habitLogs] = await Promise.all([
    prisma.progressPhoto.findMany({
      where: { athleteId: id },
      orderBy: { takenAt: "desc" },
      take: 24,
    }),
    prisma.bodyMeasurement.findMany({
      where: { athleteId: id },
      orderBy: { date: "asc" },
      take: 120,
    }),
    prisma.checkIn.findMany({
      where: { athleteId: id },
      orderBy: { weekOf: "desc" },
      take: 8,
    }),
    prisma.habit.findMany({ where: { athleteId: id }, orderBy: { createdAt: "asc" } }),
    prisma.habitLog.findMany({
      where: { habit: { athleteId: id }, date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { habitId: true, date: true, completed: true },
    }),
  ]);

  const statuses: AthleteStatus[] = ["ACTIVE", "NEW", "PAUSED", "AT_RISK", "ON_STREAK", "ARCHIVED"];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">{athlete.fullName}</h1>
          <p className="text-sm text-[var(--ink-muted)]">Engagement</p>
        </div>
        <Link href={`/${lang}/coach/athletes/${id}`} className="text-sm text-[var(--primary)] hover:underline">← Perfil</Link>
      </header>

      {/* Status tag ─────────────────────────────────────────── */}
      <Card>
        <form action={updateAthleteStatus} className="flex items-center gap-3">
          <input type="hidden" name="athleteId" value={id} />
          <label className="text-sm font-semibold">Estado:</label>
          <select name="status" defaultValue={athlete.status} className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm">
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button type="submit" size="sm">Guardar</Button>
        </form>
      </Card>

      {/* Latest check-ins ───────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-lg mb-3">Check-ins recientes</h2>
        {checkIns.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">Aún no ha enviado ninguno.</p>
        ) : (
          <div className="space-y-4">
            {checkIns.map((c) => (
              <div key={c.id} className="border-l-2 border-[var(--primary)] pl-3">
                <div className="text-xs text-[var(--ink-muted)]">Semana del {c.weekOf.toISOString().slice(0, 10)}</div>
                <div className="mt-1 flex gap-3 text-xs">
                  {c.energy != null && <span>⚡ {c.energy}/5</span>}
                  {c.sleep != null && <span>😴 {c.sleep}/5</span>}
                  {c.stress != null && <span>🔥 {c.stress}/5</span>}
                  {c.motivation != null && <span>💪 {c.motivation}/5</span>}
                  {c.weightKg != null && <span>{c.weightKg}kg</span>}
                </div>
                {c.weekSummary && <div className="text-sm mt-1 whitespace-pre-wrap">{c.weekSummary}</div>}
                {c.questions && (
                  <div className="text-sm mt-1 bg-yellow-50 border-l-2 border-yellow-300 pl-2 py-1">
                    <span className="font-semibold text-yellow-800">Pregunta:</span> {c.questions}
                  </div>
                )}
                <form action={replyToCheckIn} className="mt-2 flex gap-2">
                  <input type="hidden" name="athleteId" value={id} />
                  <input type="hidden" name="id" value={c.id} />
                  <textarea
                    name="coachReply"
                    defaultValue={c.coachReply ?? ""}
                    placeholder="Responder..."
                    rows={2}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-sm outline-none"
                  />
                  <button type="submit" className="text-xs bg-[var(--primary)] text-white rounded-lg px-3 py-1 self-end">Enviar</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Measurements chart ─────────────────────────────────── */}
      {measurements.length > 0 && (
        <Card>
          <h2 className="font-semibold text-lg mb-3">Medidas</h2>
          <MeasurementChart data={measurements.map((m) => ({
            date: m.date.toISOString().slice(0, 10),
            weightKg: m.weightKg,
            waistCm: m.waistCm,
            bodyFatPct: m.bodyFatPct,
          }))} />
        </Card>
      )}

      {/* Habits ─────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-lg mb-3">Hábitos asignados</h2>
        <form action={createHabit} className="flex flex-wrap gap-2 mb-3">
          <input type="hidden" name="athleteId" value={id} />
          <input name="icon" placeholder="🎯" maxLength={2} className="w-16 rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm outline-none text-center" />
          <input name="name" placeholder="Nombre del hábito" required className="flex-1 min-w-[10rem] rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm outline-none" />
          <input name="targetPerWeek" type="number" min={1} max={7} defaultValue={7} className="w-16 rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm outline-none" />
          <Button type="submit" size="sm">Añadir</Button>
        </form>
        {habits.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">Sin hábitos aún.</p>
        ) : (
          <ul className="space-y-1">
            {habits.map((h) => {
              const doneCount = habitLogs.filter((l) => l.habitId === h.id && l.completed).length;
              return (
                <li key={h.id} className="flex items-center justify-between text-sm py-1">
                  <span>{h.icon} {h.name} <span className="text-[var(--ink-muted)] text-xs">(x{h.targetPerWeek}/sem · {doneCount} en 30d)</span></span>
                  <form action={deleteHabit}>
                    <input type="hidden" name="athleteId" value={id} />
                    <input type="hidden" name="id" value={h.id} />
                    <button type="submit" className="text-xs text-[var(--danger)] hover:underline">borrar</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Progress photos gallery ────────────────────────────── */}
      {photos.length > 0 && (
        <Card>
          <h2 className="font-semibold text-lg mb-3">Fotos de progreso</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.dataUrl} alt={p.angle ?? "progress"} className="w-full aspect-square object-cover rounded-lg" />
                <div className="text-[0.65rem] text-center mt-1 text-[var(--ink-muted)]">
                  {p.takenAt.toISOString().slice(0, 10)}{p.weightKg != null ? ` · ${p.weightKg}kg` : ""}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
