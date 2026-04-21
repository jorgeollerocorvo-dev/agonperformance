import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { ytEmbed } from "@/lib/youtube";
import { Card, Pill } from "@/components/ui/Card";

export default async function SessionDetail({ params }: PageProps<"/[lang]/athlete/session/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();

  const link = await prisma.athleteLink.findFirst({
    where: { userId: session!.user.id, active: true },
  });
  if (!link) notFound();

  const s = await prisma.programSession.findFirst({
    where: { id, programWeek: { program: { athleteId: link.athleteId } } },
    include: {
      programWeek: { include: { program: true } },
      blocks: {
        orderBy: { order: "asc" },
        include: { movements: { orderBy: { order: "asc" }, include: { movement: true } } },
      },
      sessionLog: true,
    },
  });
  if (!s) notFound();

  return (
    <div className="space-y-6">
      <Link href={`/${lang}/athlete/history`} className="text-sm text-[var(--ink-muted)] hover:underline">← {dict.nav.history}</Link>

      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-[var(--ink-muted)]">{s.programWeek.program.title}</p>
          <h1 className="text-3xl font-bold">{s.day} · {s.date.toISOString().slice(0, 10)}</h1>
          {s.focus && <p className="text-sm text-[var(--ink-muted)] mt-1">{s.focus}</p>}
        </div>
        {s.sessionLog && <Pill color="success">{dict.athlete.completed}</Pill>}
      </header>

      {s.blocks.map((b) => (
        <Card key={b.id} className="space-y-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="w-7 h-7 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center text-sm font-bold">{b.blockCode}</span>
            <span className="font-semibold">{b.label}</span>
            {b.format && <span className="text-xs text-[var(--ink-muted)]">{b.format}</span>}
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {b.movements.map((m) => {
              const p = (m.prescription ?? {}) as Record<string, unknown>;
              const name = m.movement?.nameEn ?? m.customName ?? "—";
              const bits = [
                p.sets && `${p.sets}×`,
                p.reps ?? p.reps_range,
                p.load_kg && `${p.load_kg} kg`,
                p.load,
                p.duration_min && `${p.duration_min} min`,
                p.rpe && `RPE ${p.rpe}`,
              ].filter(Boolean).join(" · ");
              const youtubeUrl = (p.youtubeUrl as string | undefined) ?? m.movement?.videoUrl;
              const embed = ytEmbed(youtubeUrl);
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
        </Card>
      ))}
    </div>
  );
}
