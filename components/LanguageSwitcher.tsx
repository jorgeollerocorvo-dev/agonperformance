"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

const OPTIONS: { code: string; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export default function LanguageSwitcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (code: string) => {
    setOpen(false);
    // Replace the leading /{current}/... segment with /{code}/...
    const segments = pathname.split("/");
    if (segments.length > 1) segments[1] = code;
    const next = segments.join("/") || `/${code}`;
    document.cookie = `locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}`;
    start(() => {
      router.push(next);
      router.refresh();
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50" dir="ltr">
      {open && (
        <div className="mb-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          {OPTIONS.map((o) => (
            <button
              key={o.code}
              onClick={() => switchTo(o.code)}
              disabled={pending}
              className={`block w-40 text-start px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                o.code === current ? "font-semibold" : ""
              }`}
            >
              <span className="inline-block w-6">{o.code === current ? "✓" : ""}</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
      <button
        aria-label="Change language"
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-12 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg flex items-center justify-center hover:scale-105 transition"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
        </svg>
      </button>
    </div>
  );
}
