"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const OPTIONS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
];

/**
 * Compact in-header language switcher (dropdown-button style).
 * Placed in the PublicHeader / layout bar, not floating.
 */
export default function LanguageSwitcher({ current, compact = false }: { current: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const switchTo = (code: string) => {
    setOpen(false);
    const segments = pathname.split("/");
    if (segments.length > 1) segments[1] = code;
    const next = segments.join("/") || `/${code}`;
    document.cookie = `locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}`;
    start(() => { router.push(next); router.refresh(); });
  };

  const currentLabel = OPTIONS.find((o) => o.code === current)?.label ?? current.toUpperCase();

  return (
    <div ref={ref} className="relative" dir="ltr">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
        </svg>
        {!compact && <span>{currentLabel}</span>}
        <span className="text-xs text-[var(--ink-subtle)]">{current.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)] overflow-hidden z-40 min-w-40">
          {OPTIONS.map((o) => (
            <button
              key={o.code}
              onClick={() => switchTo(o.code)}
              className={`block w-full text-start px-4 py-2 text-sm hover:bg-[var(--surface-2)] ${o.code === current ? "font-semibold" : ""}`}
            >
              <span className="inline-block w-5">{o.code === current ? "✓" : ""}</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
