"use client";

import { useState, useTransition } from "react";
import { uploadProgressPhoto } from "@/app/[lang]/athlete/engagement/actions";

const MAX_DIM = 1024; // px — resize longest edge to this before upload
const JPEG_QUALITY = 0.82;

/**
 * Client-side image resize before upload. Photos land as base64 in Postgres
 * (cheapest option — no S3/R2 wiring for the MVP), so keeping them ≤400KB is
 * critical for both DB size and Railway egress on every read.
 */
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas encode failed"))), "image/jpeg", JPEG_QUALITY);
  });
}

export default function ProgressPhotoUploader() {
  const [angle, setAngle] = useState<"front" | "side" | "back" | "">("");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    try {
      const blob = await resizeImage(file);
      const resized = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
      const fd = new FormData();
      fd.set("photo", resized);
      fd.set("angle", angle);
      fd.set("weightKg", weightKg);
      fd.set("notes", notes);
      start(async () => {
        try {
          await uploadProgressPhoto(fd);
          e.target.value = "";
        } catch (ex) {
          // Standard #1: never report success paths as errors. NEXT_REDIRECT
          // and NEXT_NOT_FOUND are routing signals, not failures.
          const digest = (ex as { digest?: string } | null)?.digest;
          if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")) {
            throw ex;
          }
          setErr((ex as Error).message);
        }
      });
    } catch (ex) {
      setErr((ex as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {(["front", "side", "back"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAngle(angle === a ? "" : a)}
            className={`text-xs px-3 py-1.5 rounded-full border ${angle === a ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "bg-white border-[var(--border)]"}`}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.1"
          placeholder="Peso hoy (kg)"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none"
        />
        <input
          type="text"
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none"
        />
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={onFile}
        disabled={pending}
        className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--ink)] file:text-[var(--bg)] file:px-4 file:py-2 file:font-semibold hover:file:opacity-90 file:cursor-pointer"
      />
      {pending && <div className="text-xs text-[var(--ink-muted)]">Subiendo…</div>}
      {err && <div className="text-xs text-[var(--danger)]">{err}</div>}
    </div>
  );
}
