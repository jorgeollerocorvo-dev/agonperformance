"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker on first load. Scoped to the whole app so
 * the install prompt appears site-wide, and the offline fallback kicks in on
 * any navigation when the device loses connectivity. No-op in dev / unsupported
 * browsers. The /push-sw.js worker (for notifications) stays separate — this
 * one only handles the offline shell.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    // Register after window load so the SW install doesn't contend with the
    // initial render.
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
