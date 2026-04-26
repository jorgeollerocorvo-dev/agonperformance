"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type MobileMenuItem = {
  href: string;
  label: string;
  highlight?: boolean;
};

/**
 * Mobile-only expandable menu (hamburger).
 * Renders nothing on sm+ — desktop has its own inline nav.
 *
 * Pass the same nav items the desktop menu uses; we render them stacked
 * with proper tap targets, plus an optional logout/extra slot at the bottom.
 */
export default function MobileMenu({
  items,
  extraSlot,
  ariaLabel = "Menu",
}: {
  items: MobileMenuItem[];
  extraSlot?: React.ReactNode;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-[var(--surface-2)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="sm:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          {/* Sheet */}
          <div className="absolute inset-y-0 end-0 w-72 max-w-[90vw] bg-[var(--bg)] border-s border-[var(--border)] shadow-[var(--shadow-lg)] flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border)]">
              <span className="text-sm font-semibold text-[var(--ink-muted)]">{ariaLabel}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-[var(--surface-2)]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {items.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`block px-4 py-3 text-base ${
                      active
                        ? "bg-[var(--primary-soft)] text-[var(--primary)] font-semibold"
                        : it.highlight
                        ? "text-[var(--primary)] hover:bg-[var(--surface-2)]"
                        : "hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </nav>
            {extraSlot && (
              <div className="px-4 py-3 border-t border-[var(--border)]">{extraSlot}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
