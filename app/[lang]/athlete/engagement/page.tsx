import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import Link from "next/link";
import ProgressPhotoUploader from "@/components/ProgressPhotoUploader";
import MeasurementChart from "@/components/MeasurementChart";
import HabitGrid from "@/components/HabitGrid";
import {
  upsertMeasurement,
  submitCheckIn,
  deleteProgressPhoto,
} from "./actions";

export default async function AthleteEngagementPage({ params }: PageProps<"/[lang]/athlete/engagement">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  await getDictionary(lang);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login?next=${encodeURIComponent(`/${lang}/athlete/engagement`)}`);

  const athlete = await prisma.athlete.findUnique({ where: { userId: session.user.id } });
  if (!athlete) notFound();

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  const [photos, measurements, latestCheckIn, habits, habitLogs] = await Promise.all([
    prisma.progressPhoto.findMany({
      where: { athleteId: athlete.id },
      orderBy: { takenAt: "desc" },
      take: 24,
      select: { id: true, dataUrl: true, takenAt: true, angle: true, weightKg: true, notes: true },
    }),
    prisma.bodyMeasurement.findMany({
      where: { athleteId: athlete.id },
      orderBy: { date: "asc" },
      take: 120, // ~4 months of daily entries
    }),
    prisma.checkIn.findUnique({
      where: { athleteId_weekOf: { athleteId: athlete.id, weekOf: weekStart } },
    }),
    prisma.habit.findMany({
      where: { athleteId: athlete.id, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.habitLog.findMany({
      where: {
        habit: { athleteId: athlete.id },
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { habitId: true, date: true, completed: true },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <header>
        <h1 className="text-3xl font-bold">Progreso</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Fotos, medidas, check-in semanal y hábitos. Todo lo que hagas se lo enseño al coach.
        </p>
      </header>

      {/* Weekly check-in ────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-lg mb-3">📋 Check-in de la semana</h2>
        <form action={submitCheckIn} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["energy", "sleep", "stress", "motivation"] as const).map((k) => (
              <label key={k} className="text-sm">
                <span className="mb-1 block text-[var(--ink-muted)] capitalize">{k}</span>
                <select name={k} defaultValue={(latestCheckIn?.[k] ?? "").toString()} className={inputCls}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
          </div>
          <label className="text-sm block">
            <span className="mb-1 block text-[var(--ink-muted)]">Peso (kg)</span>
            <input name="weightKg" type="number" step="0.1" defaultValue={latestCheckIn?.weightKg ?? ""} className={inputCls} />
          </label>
          <label className="text-sm block">
            <span className="mb-1 block text-[var(--ink-muted)]">¿Cómo fue la semana?</span>
            <textarea name="weekSummary" rows={3} defaultValue={latestCheckIn?.weekSummary ?? ""} className={inputCls} />
          </label>
          <label className="text-sm block">
            <span className="mb-1 block text-[var(--ink-muted)]">Preguntas para el coach</span>
            <textarea name="questions" rows={2} defaultValue={latestCheckIn?.questions ?? ""} className={inputCls} />
          </label>
          {latestCheckIn?.coachReply && (
            <Card className="bg-emerald-50 border-emerald-200">
              <div className="text-xs font-semibold text-emerald-700 mb-1">Respuesta del coach:</div>
              <div className="text-sm text-emerald-900 whitespace-pre-wrap">{latestCheckIn.coachReply}</div>
            </Card>
          )}
          <Button type="submit" size="sm">Guardar check-in</Button>
        </form>
      </Card>

      {/* Habits ─────────────────────────────────────────────── */}
      {habits.length > 0 && (
        <Card>
          <h2 className="font-semibold text-lg mb-3">✅ Hábitos diarios</h2>
          <HabitGrid
            habits={habits.map((h) => ({ id: h.id, name: h.name, icon: h.icon, targetPerWeek: h.targetPerWeek }))}
            logs={habitLogs.map((l) => ({ habitId: l.habitId, date: l.date.toISOString().slice(0, 10), completed: l.completed }))}
          />
        </Card>
      )}

      {/* Measurements ────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-lg mb-3">📏 Medidas</h2>
        {measurements.length > 0 && (
          <div className="mb-4">
            <MeasurementChart
              data={measurements.map((m) => ({
                date: m.date.toISOString().slice(0, 10),
                weightKg: m.weightKg,
                waistCm: m.waistCm,
                bodyFatPct: m.bodyFatPct,
              }))}
            />
          </div>
        )}
        <form action={upsertMeasurement} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              <span className="text-xs text-[var(--ink-muted)]">Fecha</span>
              <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} required className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-xs text-[var(--ink-muted)]">Peso (kg)</span>
              <input name="weightKg" type="number" step="0.1" className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-xs text-[var(--ink-muted)]">Cintura (cm)</span>
              <input name="waistCm" type="number" step="0.1" className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-xs text-[var(--ink-muted)]">Pecho (cm)</span>
              <input name="chestCm" type="number" step="0.1" className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-xs text-[var(--ink-muted)]">Cadera (cm)</span>
              <input name="hipCm" type="number" step="0.1" className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-xs text-[var(--ink-muted)]">Brazo (cm)</span>
              <input name="armCm" type="number" step="0.1" className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-xs text-[var(--ink-muted)]">Muslo (cm)</span>
              <input name="thighCm" type="number" step="0.1" className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-xs text-[var(--ink-muted)]">% Grasa</span>
              <input name="bodyFatPct" type="number" step="0.1" className={inputCls} />
            </label>
          </div>
          <Button type="submit" size="sm">Guardar medidas</Button>
        </form>
      </Card>

      {/* Progress photos ──────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-lg mb-3">📸 Fotos de progreso</h2>
        <ProgressPhotoUploader />
        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
            {photos.map((p) => (
              <div key={p.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.dataUrl} alt={p.angle ?? "progress"} className="w-full aspect-square object-cover rounded-lg" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition rounded-lg flex flex-col items-center justify-center gap-1 text-white text-xs p-2">
                  <div>{p.takenAt.toISOString().slice(0, 10)}</div>
                  {p.angle && <div className="opacity-80">{p.angle}</div>}
                  {p.weightKg != null && <div className="opacity-80">{p.weightKg}kg</div>}
                  <form action={deleteProgressPhoto} className="mt-1">
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="text-red-300 hover:text-red-100 text-xs underline">borrar</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="text-xs text-center text-[var(--ink-muted)]">
        <Link href={`/${lang}/athlete`} className="hover:underline">← Volver al calendario</Link>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
