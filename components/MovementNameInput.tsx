"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = {
  id: string;
  code: string;
  label: string;
  labelEs?: string | null;
  labelAr?: string | null;
  category?: string | null;
};

/**
 * Movement name input with typeahead suggestions sourced from the Movement library.
 * Falls back to a plain text input if the API call fails.
 */
export default function MovementNameInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch suggestions whenever the input value changes (debounced)
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/movements/suggest?q=${encodeURIComponent(value.trim())}`);
        if (!res.ok) return;
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setHighlight(0);
      } catch {
        /* ignore */
      }
    }, 150);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const pick = (s: Suggestion) => {
    onChange(s.label);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % suggestions.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length); }
          else if (e.key === "Enter" && suggestions[highlight]) { e.preventDefault(); pick(suggestions[highlight]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)]">
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(s)}
                className={`block w-full text-left px-3 py-2 text-sm ${
                  i === highlight ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="font-medium">{s.label}</div>
                {s.category && (
                  <div className="text-xs text-[var(--ink-muted)]">{s.category.replace(/_/g, " ")}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
