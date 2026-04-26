import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import MovementVideoPreview from "@/components/MovementVideoPreview";
import { ensureMovementVideoUrl } from "@/lib/youtube-search";
import { isYoutubeSearch } from "@/lib/youtube";
import Link from "next/link";
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

  // Resolve a real YouTube video URL for every movement on this session.
  // We do it once per render (cached on the Movement row after first hit), in parallel.
  const resolvedVideoByMovement = new Map<string, string | null>();
  if (programSession) {
    type MovementContext = { id: string; movementId: string | null; name: string; userUrl: string | null };
    const targets: MovementContext[] = [];
    for (const b of programSession.blocks) {
      for (const m of b.movements) {
        const p = (m.prescription ?? {}) as Record<string, unknown>;
        const userUrl = typeof p.youtubeUrl === "string" ? p.youtubeUrl : null;
        // If the coach pinned a real video URL, skip the search.
        if (userUrl && !isYoutubeSearch(userUrl)) continue;
        const name = m.movement?.nameEn ?? m.customName ?? "exercise";
        targets.push({ id: m.id, movementId: m.movementId, name, userUrl });
      }
    }
    const resolved = await Promise.allSettled(
      targets.map(async (t) => ({ id: t.id, url: await ensureMovementVideoUrl(t.movementId, t.name) })),
    );
    for (const r of resolved) {
      if (r.status === "fulfilled") resolvedVideoByMovement.set(r.value.id, r.value.url);
    }
  }

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
        <p className="text-sm text-[var(--ink-muted)] mb-4">{dict.athlete.noWorkout}</p>
        <Link
          href={`/${lang}/athlete/talk`}
          className="inline-flex rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          💬 {dict.athlete.talkToCoach}
        </Link>
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
        <div className="flex items-center gap-2">
          {programSession.intensity && (
            <Pill color={programSession.intensity === "Hard" ? "primary" : "soft"}>{programSession.intensity}</Pill>
          )}
          <Link
            href={`/${lang}/athlete/talk`}
            className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            💬 {dict.athlete.talkToCoach}
          </Link>
        </div>
      </header>

      {programSession.blocks.map((b) => (
        <Card key={b.id} className="space-y-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="w-7 h-7 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center text-sm font-bold">{b.blockCode}</span>
            <span className="font-semibold">{b.label}</span>
            {b.format && <span className="text-xs text-[var(--ink-muted)]">{b.format}</span>}
          </div>
          <ul className="space-y-4">
            {b.movements.map((m, idx) => {
              const p = (m.prescription ?? {}) as Record<string, unknown>;
              const localName = lang === "es"
                ? (m.movement?.nameEs ?? m.movement?.nameEn ?? m.customName ?? "—")
                : lang === "ar"
                ? (m.movement?.nameAr ?? m.movement?.nameEn ?? m.customName ?? "—")
                : (m.movement?.nameEn ?? m.customName ?? "—");
              const bits = [
                p.sets && `${p.sets}×`,
                p.reps ?? p.reps_range,
                p.load_kg && `${p.load_kg} kg`,
                p.load,
                p.duration_min && `${p.duration_min} min`,
                p.rest && `rest ${p.rest}`,
                p.rpe && `RPE ${p.rpe}`,
              ].filter(Boolean).join(" · ");
              const prescriptionUrl = typeof p.youtubeUrl === "string" ? p.youtubeUrl : null;
              const coachPinned = prescriptionUrl && !isYoutubeSearch(prescriptionUrl) ? prescriptionUrl : null;
              const sourceUrl = coachPinned ?? resolvedVideoByMovement.get(m.id) ?? m.movement?.videoUrl ?? prescriptionUrl ?? null;
              return (
                <li key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 sm:p-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xs font-bold text-[var(--ink-subtle)]">{b.blockCode}{idx + 1}</span>
                    <span className="font-semibold flex-1">{localName}</span>
                  </div>
                  {bits && <div className="text-sm text-[var(--ink-muted)] mb-3">{bits}</div>}
                  <MovementVideoPreview
                    url={sourceUrl}
                    name={localName}
                    ctaLabel={dict.athlete.findDemo ?? "Find demo"}
                  />
                  {typeof p.notes === "string" && p.notes && (
                    <div className="text-xs text-[var(--ink-subtle)] italic mt-2">{p.notes}</div>
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
