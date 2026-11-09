"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Standard: coach edits → athlete sees them without a hard reload. We can't
 * push data from server to client for free (needs SSE/websocket infra), so we
 * do the next best thing: when the page gains focus or comes back from
 * background, re-fetch the server-rendered RSC. Zero marginal cost — one HTTP
 * request per focus event.
 *
 * `minMs` throttles: don't refresh if we just refreshed in the last N ms.
 * Default 30s keeps DB load tiny even if the athlete toggles tabs.
 *
 * Mount near the top of any athlete page that renders coach-edited data:
 *   <VisibilityRefresh />
 */
export default function VisibilityRefresh({ minMs = 30_000 }: { minMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastAt = Date.now();
    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastAt < minMs) return;
      lastAt = Date.now();
      router.refresh();
    };
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, [router, minMs]);
  return null;
}
