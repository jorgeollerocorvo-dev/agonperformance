"use client";

import { useState } from "react";

export default function CheckoutButton({ planId, lang, label }: { planId: string; lang: string; label: string }) {
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setErr(null);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, lang }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data.error ?? "Could not start checkout");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="w-full rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-3 font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "..." : label}
      </button>
      {err && <div className="text-xs text-[var(--danger)] mt-2 text-center">{err}</div>}
    </>
  );
}
