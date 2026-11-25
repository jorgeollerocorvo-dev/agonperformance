"use client";

import { useState } from "react";

type Result = {
  connected: boolean;
  username?: string;
  login?: string;
  publishingPermission?: string;
  insightsPermission?: string;
  publishingQuotaReadable?: boolean;
  message?: string;
};

export default function InstagramConnection() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  async function verify() {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/admin/agon-hq/instagram", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(50000) });
      if ([401, 403, 404].includes(response.status)) {
        setError("Your owner session could not be verified. Sign out and sign in again using your AGON owner account, then retry here.");
        return;
      }
      if (!response.headers.get("content-type")?.includes("application/json")) {
        setError("Unexpected server response. Refresh this dashboard and try again.");
        return;
      }
      setResult(await response.json() as Result);
    } catch {
      setError("The verification request timed out or lost its connection. Please try again.");
    } finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <button type="button" onClick={verify} disabled={busy} className="rounded-lg bg-[#1F3A5F] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Checking Instagram…" : "Verify Instagram connection"}</button>
    <div aria-live="polite">
      {error && <p role="alert" className="rounded-lg border border-amber-500 p-3">{error}</p>}
      {result && <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
        <p className="font-semibold">{result.connected ? "Connected: @" + (result.username || "agonperformanceqa") : "Not connected"}</p>
        {result.login && <p>API: {result.login}</p>}
        {result.publishingPermission && <p>Publishing permission: {result.publishingPermission.replaceAll("_", " ")}</p>}
        {result.insightsPermission && <p>Analytics permission: {result.insightsPermission.replaceAll("_", " ")}</p>}
        {typeof result.publishingQuotaReadable === "boolean" && <p>Publishing quota: {result.publishingQuotaReadable ? "Readable" : "Not verified"}</p>}
        {result.message && <p className="text-sm">{result.message}</p>}
      </div>}
    </div>
  </div>;
}
