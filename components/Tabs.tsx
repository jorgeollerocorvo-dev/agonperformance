import Link from "next/link";

export type Tab = {
  id: string;
  label: string;
  icon?: string;
  /** Hide the tab entirely (used for role-gated tabs like Jorge-only admin). */
  hidden?: boolean;
  /** Small badge/count to show next to the label. */
  badge?: string | number;
};

/**
 * URL-driven tabbar — SSR-safe, no client state. Each tab sets `?tab=<id>`
 * and the parent page reads the current tab from its own `searchParams`.
 * Rendering stays server-rendered so dark-mode / theme-aware tokens work
 * without any hydration flicker, and deep-links are shareable.
 *
 * Intentional: no animated underline, no icons-only view. Pill rail is dense
 * at phone width (horizontal scroll) and falls back to a block on wide
 * screens. Keeps the hierarchy flat so users don't hunt for the field.
 */
export default function Tabs({
  tabs,
  currentTab,
  basePath,
  carryParams,
}: {
  tabs: Tab[];
  currentTab: string;
  /** e.g. "/en/account" — the path the links point at (without `?tab=`). */
  basePath: string;
  /** Other searchParams to preserve across tab switches (e.g. filters). */
  carryParams?: Record<string, string>;
}) {
  const visible = tabs.filter((t) => !t.hidden);
  return (
    <nav className="flex gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-[var(--border)] mb-5">
      {visible.map((t) => {
        const active = t.id === currentTab;
        const q = new URLSearchParams({ ...(carryParams ?? {}), tab: t.id });
        return (
          <Link
            key={t.id}
            href={`${basePath}?${q.toString()}`}
            scroll={false}
            className={`whitespace-nowrap text-sm px-3 py-2.5 border-b-2 -mb-px transition shrink-0 flex items-center gap-1.5 ${
              active
                ? "border-[var(--ink)] text-[var(--ink)] font-semibold"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {t.icon && <span aria-hidden>{t.icon}</span>}
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge !== 0 && (
              <span className={`text-[0.65rem] rounded-full px-1.5 py-0.5 font-bold ${active ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--surface-2)] text-[var(--ink-muted)]"}`}>
                {t.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
