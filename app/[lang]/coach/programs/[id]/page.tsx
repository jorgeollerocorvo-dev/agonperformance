import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { ytEmbed } from "@/lib/youtube";

export default async function ProgramDetail({ params }: PageProps<"/[lang]/coach/programs/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: session!.user.id } });

  const program = await prisma.program.findFirst({
    where: { id, athlete: { coachProfileId: coachProfile!.id } },
    include: {
      athlete: true,
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
            },
          },
        },
      },
    },
  });
  if (!program) notFound();

  return (
    <div className="space-y-8">
      <Link href={`/${lang}/coach/athletes/${program.athleteId}`} className="text-sm text-zinc-500 hover:underline">← {program.athlete.fullName}</Link>

      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold">{program.title}</h1>
        {program.goal && <p className="text-sm text-zinc-600 dark:text-zinc-400">{program.goal}</p>}
        <p className="text-xs text-zinc-500">
          {program.startDate.toISOString().slice(0, 10)} → {program.endDate?.toISOString().slice(0, 10) ?? "—"} · {program.durationWeeks ?? program.weeks.length} {dict.coach.weeks}
        </p>
      </header>

      {program.weeks.map((week) => (
        <section key={week.id} className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-zinc-200 dark:border-zinc-800 pb-2">
            {week.weekLabel ?? `Week ${week.weekNumber}`}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {week.sessions.map((s) => (
              <div key={s.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
                <div>
                  <div className="font-medium">{s.day} · {s.date.toISOString().slice(0, 10)}</div>
                  <div className="text-xs text-zinc-500">
                    {[s.focus, s.intensity].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {s.blocks.map((b) => (
                  <div key={b.id} className="space-y-1">
                    <div className="text-sm font-medium">
                      {b.blockCode}) {b.label}
                      {b.format && <span className="text-zinc-500 font-normal"> — {b.format}</span>}
                    </div>
                    <ul className="text-sm pl-3 space-y-1">
                      {b.movements.map((m) => {
                        const p = (m.prescription ?? {}) as Record<string, unknown>;
                        const name = m.movement?.nameEn ?? m.customName ?? "—";
                        const bits = [
                          p.sets && `${p.sets}×`,
                          p.reps ?? p.reps_range,
                          p.load_kg && `${p.load_kg} kg`,
                          p.load_range_kg && `${(p.load_range_kg as number[]).join("-")} kg`,
                          p.duration_min && `${p.duration_min} min`,
                          p.rpe && `RPE ${p.rpe}`,
                        ].filter(Boolean).join(" · ");
                        const embed = ytEmbed(m.movement?.videoUrl);
                        return (
                          <li key={m.id} className={m.isTest ? "text-amber-700 dark:text-amber-400 font-medium" : ""}>
                            <span>{name}</span>
                            {bits && <span className="text-zinc-500"> — {bits}</span>}
                            {p.notes ? <div className="text-xs text-zinc-500">{p.notes as string}</div> : null}
                            {embed && (
                              <div className="mt-1 aspect-video max-w-sm">
                                <iframe src={embed} className="w-full h-full rounded" allow="encrypted-media" allowFullScreen />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {b.restSec && <div className="text-xs text-zinc-500">Rest: {b.restSec}s</div>}
                    {b.notes && <div className="text-xs text-zinc-500 italic">{b.notes}</div>}
                  </div>
                ))}
                {s.notes && <div className="text-xs text-zinc-500 italic">{s.notes}</div>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
