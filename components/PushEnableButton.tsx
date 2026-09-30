"use client";

import { useEffect, useState } from "react";

/**
 * Client-side push opt-in. Renders a "Activar notificaciones" button when the
 * browser supports Push and hasn't subscribed yet; hides itself otherwise.
 *
 * Uses the NEXT_PUBLIC_VAPID_PUBLIC_KEY env var. If missing, nothing renders
 * — no broken buttons in dev.
 */
export default function PushEnableButton() {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<"idle" | "subscribed" | "denied" | "loading">("idle");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!publicKey) return;
    setSupported(true);
    navigator.serviceWorker.getRegistration("/push-sw.js").then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) setStatus("subscribed");
    });
  }, [publicKey]);

  async function subscribe() {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey!) as unknown as BufferSource,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus("subscribed");
    } catch {
      setStatus("idle");
    }
  }

  if (!supported) return null;
  if (status === "subscribed") {
    return <span className="text-xs text-emerald-700">🔔 Notificaciones activadas</span>;
  }
  if (status === "denied") {
    return <span className="text-xs text-[var(--ink-muted)]">Notificaciones bloqueadas por el navegador.</span>;
  }

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={status === "loading"}
      className="text-xs rounded-full border border-[var(--border)] bg-white px-3 py-1.5 hover:bg-[var(--surface-2)] disabled:opacity-50"
    >
      🔔 Activar notificaciones
    </button>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}
