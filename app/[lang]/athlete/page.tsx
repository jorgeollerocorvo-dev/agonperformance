import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import { ytEmbed } from "@/lib/youtube";
import { Card, Pill, Button } from "@/components/ui/Card";

export default async function AthleteToday({ params }: PageProps<"/[lang]/athlete">) {
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

  const programSession = await prisma.programSession.findFirst({
    where: { date: today, programWeek: { program: { athleteId: link.athleteId } } },
    include: {
      programWeek: { include: { program: true } },
      blocks: {
        orderBy: { order: "asc" },
        include: { movements: { orderBy: { order: "asc" }, include: { movement: true } } },
      },
      sessionLog: true,
    },
  });

  async function markDone() {
    "use server";
    if (!programSession || !link) return;
    await prisma.sessionLog.upsert({
      where: { programSessionId: programSession.id },
      update: { completedAt: new Date() },
      create: { programSessionId: programSession.id, athleteId: link.athleteId },
    });
    redirect(`/${lang}/athlete`);
  }

  if (!programSession) {
    return (
      <Card>
        <h1 className="text-2xl font-bold mb-2">{dict.athlete.todayHeader}</h1>
        <p className="text-sm text-[var(--ink-muted)]">{dict.athlete.noWorkout}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-[var(--ink-muted)]">{dict.athlete.todayHeader}</p>
          <h1 className="text-3xl font-bold">{programSession.programWeek.program.title}</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            {programSession.day} · {programSession.date.toISOString().slice(0, 10)} — {programSession.focus}
          </p>
        </div>
        {programSession.intensity && (
          <Pill color={programSession.intensity === "Hard" ? "primary" : "soft"}>{programSession.intensity}</Pill>
        )}
      </header>

      {programSession.blocks.map((b) => (
        <Card key={b.id} className="space-y-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="w-7 h-7 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center text-sm font-bold">{b.blockCode}</span>
            <span className="font-semibold">{b.label}</span>
            {b.format && <span className="text-xs text-[var(--ink-muted)]">{b.format}</span>}
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {b.movements.map((m) => {
              const p = (m.prescription ?? {}) as Record<string, unknown>;
              const name = m.movement?.nameEs ?? m.movement?.nameEn ?? m.customName ?? "—";
              const bits = [
                p.sets && `${p.sets}×`,
                p.reps ?? p.reps_range,
                p.load_kg && `${p.load_kg} kg`,
                p.duration_min && `${p.duration_min} min`,
                p.rpe && `RPE ${p.rpe}`,
              ].filter(Boolean).join(" · ");
              const embed = ytEmbed(m.movement?.videoUrl);
              return (
                <li key={m.id} className="py-3">
                  <div className="font-medium">{name}</div>
                  {bits && <div className="text-sm text-[var(--ink-muted)]">{bits}</div>}
                  {typeof p.notes === "string" && <div className="text-xs text-[var(--ink-subtle)] italic mt-1">{p.notes}</div>}
                  {embed && (
                    <div className="mt-2 aspect-video max-w-md">
                      <iframe src={embed} className="w-full h-full rounded-xl" allow="encrypted-media" allowFullScreen />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {b.restSec && <div className="text-xs text-[var(--ink-muted)]">Rest: {b.restSec}s</div>}
        </Card>
      ))}

      <form action={markDone}>
        <Button disabled={!!programSession.sessionLog} size="lg">
          {programSession.sessionLog ? dict.athlete.completed : dict.athlete.markDone}
        </Button>
      </form>
    </div>
  );
}
