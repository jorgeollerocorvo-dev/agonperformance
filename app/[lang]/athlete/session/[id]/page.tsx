import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { Card, Pill, Button } from "@/components/ui/Card";
import MovementVideoPreview from "@/components/MovementVideoPreview";
import { ensureMovementVideoUrl } from "@/lib/youtube-search";
import { isYoutubeSearch } from "@/lib/youtube";

export default async function SessionDetail({ params, searchParams }: PageProps<"/[lang]/athlete/session/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const sp = await searchParams;
  const fromCalendar = sp?.from === "calendar";

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

  // Resolve a real YouTube video URL for every movement on this session
  // (cached on the Movement row after first hit, parallelized).
  const resolvedVideoByMovement = new Map<string, string | null>();
  type MovementContext = { id: string; movementId: string | null; name: string };
  const targets: MovementContext[] = [];
  for (const b of s.blocks) {
    for (const m of b.movements) {
      const p = (m.prescription ?? {}) as Record<string, unknown>;
      const userUrl = typeof p.youtubeUrl === "string" ? p.youtubeUrl : null;
      if (userUrl && !isYoutubeSearch(userUrl)) continue;
      targets.push({ id: m.id, movementId: m.movementId, name: m.movement?.nameEn ?? m.customName ?? "exercise" });
    }
  }
  const resolved = await Promise.allSettled(
    targets.map(async (t) => ({ id: t.id, url: await ensureMovementVideoUrl(t.movementId, t.name) })),
  );
  for (const r of resolved) {
    if (r.status === "fulfilled") resolvedVideoByMovement.set(r.value.id, r.value.url);
  }

  async function toggleComplete() {
    "use server";
    if (!s || !link) return;
    if (s.sessionLog) {
      await prisma.sessionLog.delete({ where: { id: s.sessionLog.id } });
    } else {
      await prisma.sessionLog.create({
        data: { programSessionId: s.id, athleteId: link.athleteId },
      });
    }
    redirect(`/${lang}/athlete/session/${s.id}${fromCalendar ? "?from=calendar" : ""}`);
  }

  const backHref = fromCalendar
    ? `/${lang}/athlete/calendar?month=${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, "0")}`
    : `/${lang}/athlete/history`;
  const backLabel = fromCalendar ? (dict.athlete.calendarTitle ?? "Calendar") : dict.nav.history;

  return (
    <div className="space-y-6">
      <Link href={backHref} className="text-sm text-[var(--ink-muted)] hover:underline">← {backLabel}</Link>

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
          <ul className="space-y-3">
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
                  <div className="flex items-baseline gap-2 mb-1">
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
        </Card>
      ))}

      <form action={toggleComplete}>
        <Button size="lg" variant={s.sessionLog ? "outline" : "primary"}>
          {s.sessionLog
            ? `↺ ${dict.athlete.unmark ?? "Mark as not done"}`
            : `✓ ${dict.athlete.markDone}`}
        </Button>
      </form>
    </div>
  );
}
