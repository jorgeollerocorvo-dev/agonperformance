import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Pill, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import MovementVideoPreview from "@/components/MovementVideoPreview";
import { rerollMovementVideo, toggleMovementLock, setMovementVideoUrl, clearMovementVideo, createMovement, deleteMovement } from "./actions";

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
  const onlyUnlocked = sp?.unlocked === "1";
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
    ...(onlyUnlocked ? { videoLocked: false, videoUrl: { not: null } } : {}),
  };
  const total = await prisma.movement.count({ where });
  const movements = await prisma.movement.findMany({
    where,
    orderBy: [{ category: "asc" }, { nameEn: "asc" }],
  });

  // Group movements by category
  const groupedMovements = movements.reduce(
    (acc, m) => {
      const cat = m.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    },
    {} as Record<string, typeof movements>
  );

  const sortedCategories = Object.keys(groupedMovements).sort();
  const lockedCount = await prisma.movement.count({ where: { videoLocked: true } });
  const unlockedCount = await prisma.movement.count({ where: { videoLocked: false, videoUrl: { not: null }, isActive: true } });
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
  async function createAction(formData: FormData) {
    "use server";
    const nameEn = String(formData.get("nameEn") ?? "").trim();
    const nameEs = String(formData.get("nameEs") ?? "").trim() || null;
    const autoSearch = formData.get("autoSearch") === "on";
    const videoUrl = String(formData.get("videoUrl") ?? "").trim() || null;
    const lockVideo = formData.get("lockVideo") === "on" && !!videoUrl;
    if (nameEn) await createMovement(nameEn, nameEs, autoSearch, videoUrl, lockVideo);
  }
  async function deleteAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (id) await deleteMovement(id);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (onlyMissing) params.set("missing", "1");
    if (onlyLocked) params.set("locked", "1");
    if (onlyUnlocked) params.set("unlocked", "1");
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

      <Card padded className="bg-[var(--surface-2)]">
        <h2 className="text-lg font-semibold mb-4">Add new exercise</h2>
        <form action={createAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              name="nameEn"
              placeholder="Exercise name (English)"
              required
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]"
            />
            <input
              type="text"
              name="nameEs"
              placeholder="Nombre del ejercicio (Español, opcional)"
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" name="autoSearch" id="autoSearch" defaultChecked className="rounded w-4 h-4" />
              <label htmlFor="autoSearch" className="text-sm text-[var(--ink-muted)]">
                Auto-search YouTube for video demo
              </label>
            </div>
            <div className="text-xs text-[var(--ink-subtle)] ml-6">Or paste a custom URL instead:</div>
            <input
              type="url"
              name="videoUrl"
              placeholder="https://youtu.be/… (optional)"
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]"
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" name="lockVideo" id="lockVideo" className="rounded w-4 h-4" />
              <label htmlFor="lockVideo" className="text-sm text-[var(--ink-muted)]">
                🔒 Lock video (prevent auto-reroll)
              </label>
            </div>
          </div>

          <Button type="submit">Create movement</Button>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Total</div><div className="text-3xl font-bold mt-0.5 text-[var(--ink)]">{totalActive}</div></Card>
        <Card><div className="text-xs uppercase tracking-wider text-[var(--danger)]">⚠️ No Video</div><div className="text-3xl font-bold mt-0.5 text-[var(--danger)]">{missingCount}</div></Card>
        <Card><div className="text-xs uppercase tracking-wider text-[var(--success)]">🔒 Locked</div><div className="text-3xl font-bold mt-0.5 text-[var(--success)]">{lockedCount}</div></Card>
        <Card><div className="text-xs uppercase tracking-wider text-[var(--primary)]">🔓 Unlocked</div><div className="text-3xl font-bold mt-0.5 text-[var(--primary)]">{unlockedCount}</div></Card>
      </div>

      <form method="GET" className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, code, category…"
            className="flex-1 min-w-48 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]"
          />
          <Button type="submit">Search</Button>
          {(q || onlyMissing || onlyLocked || onlyUnlocked) && (
            <Link href={`/${lang}/coach/movements`} className="text-sm text-[var(--ink-muted)] hover:underline">Reset</Link>
          )}
        </div>

        {/* Video Status Filters */}
        <div className="flex flex-wrap gap-2 items-start">
          <span className="text-xs uppercase tracking-wide text-[var(--ink-muted)] font-semibold w-full">Filter by video status:</span>
          <Link
            href={buildHref({ missing: onlyMissing ? undefined : "1", unlocked: undefined, locked: undefined })}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${
              onlyMissing
                ? "bg-[var(--danger)] text-white"
                : "bg-white border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--danger)]"
            }`}
          >
            ⚠️ No Video ({missingCount})
          </Link>
          <Link
            href={buildHref({ locked: onlyLocked ? undefined : "1", missing: undefined, unlocked: undefined })}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${
              onlyLocked
                ? "bg-[var(--success)] text-white"
                : "bg-white border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--success)]"
            }`}
          >
            🔒 Locked ({lockedCount})
          </Link>
          <Link
            href={buildHref({ unlocked: onlyUnlocked ? undefined : "1", missing: undefined, locked: undefined })}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${
              onlyUnlocked
                ? "bg-[var(--primary)] text-white"
                : "bg-white border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--primary)]"
            }`}
          >
            🔓 Unlocked
          </Link>
        </div>

        {/* Category Quick Filter */}
        <div className="flex flex-wrap gap-2 items-start">
          <span className="text-xs uppercase tracking-wide text-[var(--ink-muted)] font-semibold w-full">Filter by category:</span>
          {sortedCategories.map((cat) => (
            <Link
              key={cat}
              href={buildHref({ q: cat })}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${
                q === cat
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--primary)]"
              }`}
            >
              {cat} ({groupedMovements[cat].length})
            </Link>
          ))}
        </div>
      </form>

      <div className="space-y-8">
        {sortedCategories.map((category) => (
          <section key={category} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center gap-3 pb-3 border-b-2 border-[var(--primary)]">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold capitalize">{category}</h2>
                <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-1">
                  {groupedMovements[category].length} movement{groupedMovements[category].length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-bold text-sm">
                {groupedMovements[category].length}
              </div>
            </div>

            {/* Movements in Category */}
            <ul className="space-y-3">
              {groupedMovements[category].map((m) => (
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
                  {m.category && (
                    <Link
                      href={buildHref({ q: m.category })}
                      className="px-2 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-medium hover:bg-[var(--primary)] hover:text-white transition"
                    >
                      {m.category}
                    </Link>
                  )}
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
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full bg-white border border-[var(--border-danger)] px-3 py-1.5 text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      title="Remove this movement from the library"
                    >
                      🗑 Delete
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
          </section>
        ))}
      </div>

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
