import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Pill, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import MovementVideoPreview from "@/components/MovementVideoPreview";
import { rerollMovementVideo, toggleMovementLock, setMovementVideoUrl, clearMovementVideo } from "./actions";

const PAGE_SIZE = 30;

export default async function MovementsAdmin({ params, searchParams }: PageProps<"/[lang]/coach/movements">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!isJorge(session)) notFound();

  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  const onlyMissing = sp?.missing === "1";
  const onlyLocked = sp?.locked === "1";
  const page = Math.max(1, parseInt(typeof sp?.page === "string" ? sp.page : "1", 10) || 1);

  const where = {
    isActive: true,
    ...(q
      ? {
          OR: [
            { nameEn: { contains: q, mode: "insensitive" as const } },
            { nameEs: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q.replace(/\s+/g, "_"), mode: "insensitive" as const } },
            { category: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(onlyMissing ? { videoUrl: null } : {}),
    ...(onlyLocked ? { videoLocked: true } : {}),
  };
  const total = await prisma.movement.count({ where });
  const movements = await prisma.movement.findMany({
    where,
    orderBy: [{ category: "asc" }, { nameEn: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const lockedCount = await prisma.movement.count({ where: { videoLocked: true } });
  const missingCount = await prisma.movement.count({ where: { videoUrl: null, isActive: true } });
  const totalActive = await prisma.movement.count({ where: { isActive: true } });

  async function rerollAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (id) await rerollMovementVideo(id);
  }
  async function lockAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (id) await toggleMovementLock(id);
  }
  async function clearAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (id) await clearMovementVideo(id);
  }
  async function pasteUrlAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const url = String(formData.get("url") ?? "");
    if (id && url) await setMovementVideoUrl(id, url);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (onlyMissing) params.set("missing", "1");
    if (onlyLocked) params.set("locked", "1");
    if (page > 1) params.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    const s = params.toString();
    return `/${lang}/coach/movements${s ? "?" + s : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Movement library</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            Curate the auto-picked YouTube videos. ✕ rerolls to the next candidate, 🔒 locks it as the permanent main video.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Total</div><div className="text-3xl font-bold mt-0.5">{totalActive}</div></Card>
        <Card><div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">No video yet</div><div className="text-3xl font-bold mt-0.5">{missingCount}</div></Card>
        <Card><div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Locked</div><div className="text-3xl font-bold mt-0.5">{lockedCount}</div></Card>
      </div>

      <form method="GET" className="flex flex-wrap gap-2 items-center">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, code, category…"
          className="flex-1 min-w-48 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]"
        />
        <label className="text-sm flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1.5">
          <input type="checkbox" name="missing" value="1" defaultChecked={onlyMissing} /> No video
        </label>
        <label className="text-sm flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1.5">
          <input type="checkbox" name="locked" value="1" defaultChecked={onlyLocked} /> Locked
        </label>
        <Button type="submit">Filter</Button>
        {(q || onlyMissing || onlyLocked) && (
          <Link href={`/${lang}/coach/movements`} className="text-sm text-[var(--ink-muted)] hover:underline">Reset</Link>
        )}
      </form>

      <ul className="space-y-3">
        {movements.map((m) => (
          <li key={m.id}>
            <Card padded={false} className="p-4 sm:p-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-base">{m.nameEn}</h3>
                  {m.nameEs && <span className="text-sm text-[var(--ink-muted)]">{m.nameEs}</span>}
                  {m.videoLocked && <Pill color="success">🔒 Locked</Pill>}
                  {!m.videoUrl && <Pill color="soft">No video</Pill>}
                </div>
                <div className="text-xs text-[var(--ink-subtle)] flex flex-wrap gap-2 mb-3">
                  <span><code className="bg-[var(--surface-2)] px-1 rounded">{m.code}</code></span>
                  {m.category && <span>· {m.category}</span>}
                </div>

                {m.videoUrl && (
                  <div className="text-xs break-all text-[var(--ink-muted)] mb-3">
                    <a href={m.videoUrl} target="_blank" rel="noreferrer" className="hover:underline">{m.videoUrl}</a>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <form action={rerollAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      disabled={m.videoLocked}
                      title={m.videoLocked ? "Unlock first" : "Pick a different video"}
                      className="inline-flex items-center gap-1 rounded-full bg-white border border-[var(--border-strong)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✕ Reroll
                    </button>
                  </form>
                  <form action={lockAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      disabled={!m.videoUrl}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                        m.videoLocked
                          ? "bg-[var(--success)] text-white hover:opacity-90"
                          : "bg-white border border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      {m.videoLocked ? "🔒 Locked" : "🔓 Lock"}
                    </button>
                  </form>
                  <form action={clearAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full bg-white border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
                    >
                      Clear cache
                    </button>
                  </form>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-[var(--primary)] hover:underline">Paste a custom URL</summary>
                  <form action={pasteUrlAction} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <input
                      name="url"
                      placeholder="https://youtu.be/…"
                      className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
                    />
                    <Button type="submit" size="sm">Set</Button>
                  </form>
                </details>
              </div>

              <div>
                <MovementVideoPreview url={m.videoUrl ?? null} name={m.nameEn} ctaLabel="Find demo" />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-muted)]">Page {page} of {totalPages} — {total} movements</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildHref({ page: String(page - 1) })} className="rounded-full border border-[var(--border)] px-3 py-1 hover:bg-[var(--surface-2)]">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={buildHref({ page: String(page + 1) })} className="rounded-full border border-[var(--border)] px-3 py-1 hover:bg-[var(--surface-2)]">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
