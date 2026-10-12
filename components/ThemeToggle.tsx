"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

/**
 * Compact theme switcher: cycles light → dark → system → light. Hydration-
 * safe (renders a stable placeholder until mounted so SSR + client output
 * match). Uses next-themes to persist across sessions.
 */
export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <span className="inline-block w-8 h-8 rounded-full" aria-hidden />;
  }
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--surface-2)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun size={18} weight="duotone" /> : <Moon size={18} weight="duotone" />}
    </button>
  );
}
