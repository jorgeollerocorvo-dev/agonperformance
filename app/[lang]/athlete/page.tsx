import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import { ytEmbed } from "@/lib/youtube";

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
      <div>
        <h1 className="text-2xl font-semibold mb-2">{dict.athlete.todayHeader}</h1>
        <p className="text-sm text-zinc-500">{dict.athlete.notLinked}</p>
      </div>
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
      <div>
        <h1 className="text-2xl font-semibold mb-2">{dict.athlete.todayHeader}</h1>
        <p className="text-sm text-zinc-500">{dict.athlete.noWorkout}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{programSession.programWeek.program.title}</h1>
        <p className="text-sm text-zinc-500">{programSession.day} · {programSession.date.toISOString().slice(0, 10)} — {programSession.focus}</p>
      </header>

      {programSession.blocks.map((b) => (
        <section key={b.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold">{b.blockCode}</span>
            <span className="text-sm">{b.label}</span>
            {b.format && <span className="text-xs text-zinc-500">· {b.format}</span>}
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                  {bits && <div className="text-sm text-zinc-600 dark:text-zinc-400">{bits}</div>}
                  {typeof p.notes === "string" && <div className="text-xs text-zinc-500 italic">{p.notes}</div>}
                  {embed && (
                    <div className="mt-2 aspect-video max-w-md">
                      <iframe src={embed} className="w-full h-full rounded-md" allow="encrypted-media" allowFullScreen />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {b.restSec && <div className="text-xs text-zinc-500">Rest: {b.restSec}s</div>}
        </section>
      ))}

      <form action={markDone}>
        <button
          disabled={!!programSession.sessionLog}
          className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900 disabled:opacity-50"
        >
          {programSession.sessionLog ? dict.athlete.completed : dict.athlete.markDone}
        </button>
      </form>
    </div>
  );
}
