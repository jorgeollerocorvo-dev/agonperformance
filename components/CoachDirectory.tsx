"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { CoachMapItem } from "./CoachMap";

const CoachMap = dynamic(() => import("./CoachMap"), { ssr: false });

export type CoachDirItem = {
  id: string;
  handle: string | null;
  name: string;
  headline: string | null;
  city: string | null;
  specialties: { id: string; label: string }[];
  priceMin: string | null;
  priceMax: string | null;
  currency: string;
  lat: number | null;
  lng: number | null;
  radiusKm: number | null;
  photoInitial: string;
};

export default function CoachDirectory({
  coaches,
  lang,
  labels,
}: {
  coaches: CoachDirItem[];
  lang: string;
  labels: { noMapLoc: string; from: string };
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const mapItems: CoachMapItem[] = coaches
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({
      id: c.id,
      handle: c.handle,
      name: c.name,
      headline: c.headline,
      lat: c.lat!,
      lng: c.lng!,
      radiusKm: c.radiusKm,
      city: c.city,
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {/* List */}
      <ul className="space-y-3 max-h-[70vh] overflow-y-auto pr-1" dir="ltr">
        {coaches.map((c) => {
          const isActive = c.id === selectedId || c.id === hoveredId;
          return (
            <li
              key={c.id}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
              onClick={() => setSelectedId(c.id)}
              className={`rounded-lg border bg-white dark:bg-zinc-900 p-4 cursor-pointer transition ${
                isActive
                  ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/10 dark:ring-white/20"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-semibold text-zinc-700 dark:text-zinc-200">
                  {c.photoInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  {c.headline && <div className="text-xs text-zinc-500 truncate">{c.headline}</div>}
                </div>
                {c.lat === null && (
                  <span className="text-[10px] text-zinc-400 shrink-0">📍 —</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.specialties.slice(0, 3).map((s) => (
                  <span key={s.id} className="text-xs rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5">
                    {s.label}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{c.city}</span>
                {(c.priceMin || c.priceMax) && (
                  <span>
                    {labels.from} {c.priceMin} {c.currency}
                    {c.priceMax && ` – ${c.priceMax}`}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <Link
                  href={`/${lang}/coaches/${c.handle ?? c.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm underline text-zinc-700 dark:text-zinc-300"
                >
                  →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Map */}
      <div className="h-[70vh] sticky top-4" dir="ltr">
        {mapItems.length === 0 ? (
          <div className="w-full h-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-sm text-zinc-500 p-6 text-center">
            {labels.noMapLoc}
          </div>
        ) : (
          <CoachMap
            items={mapItems}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
          />
        )}
      </div>
    </div>
  );
}
