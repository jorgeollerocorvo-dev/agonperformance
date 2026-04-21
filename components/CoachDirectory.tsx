"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { CoachMapItem } from "./CoachMap";
import { Pill } from "./ui/Card";

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
  rating: number | null;
  ratingCount: number;
};

export default function CoachDirectory({
  coaches,
  lang,
  labels,
  defaultCenter,
}: {
  coaches: CoachDirItem[];
  lang: string;
  labels: { noMapLoc: string; from: string; perSession: string; viewProfile: string };
  defaultCenter?: [number, number];
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
    <div className="space-y-4">
      {/* Map on top */}
      <div className="h-[40vh] sm:h-[45vh]" dir="ltr">
        {mapItems.length === 0 ? (
          <div className="w-full h-full rounded-3xl border border-[var(--border)] bg-white grid place-items-center text-sm text-[var(--ink-muted)] p-6 text-center">
            {labels.noMapLoc}
          </div>
        ) : (
          <div className="w-full h-full rounded-3xl overflow-hidden border border-[var(--border)]">
            <CoachMap
              items={mapItems}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              defaultCenter={defaultCenter}
            />
          </div>
        )}
      </div>

      {/* Scrollable card list below */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" dir="ltr">
        {coaches.map((c) => {
          const isActive = c.id === selectedId || c.id === hoveredId;
          return (
            <li
              key={c.id}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
              onFocus={() => setSelectedId(c.id)}
            >
              <Link
                href={`/${lang}/coaches/${c.handle ?? c.id}`}
                className={`block rounded-2xl bg-white p-4 border transition ${
                  isActive
                    ? "border-[var(--primary)] ring-4 ring-[var(--primary-soft)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center text-xl font-bold shrink-0">
                    {c.photoInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold truncate">{c.name}</div>
                      {c.rating !== null && (
                        <div className="text-sm text-[var(--ink)] shrink-0">
                          <span className="text-[var(--primary)]">★</span> {c.rating.toFixed(2)}
                        </div>
                      )}
                    </div>
                    {c.headline && <div className="text-xs text-[var(--ink-muted)] truncate">{c.headline}</div>}
                    {c.city && <div className="text-xs text-[var(--ink-subtle)] mt-0.5">📍 {c.city}</div>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.specialties.slice(0, 3).map((s) => (
                    <Pill key={s.id} color="primary">{s.label}</Pill>
                  ))}
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  {(c.priceMin || c.priceMax) ? (
                    <div className="text-sm">
                      <span className="font-semibold">{labels.from} {c.priceMin} {c.currency}</span>
                      <span className="text-[var(--ink-muted)]"> / {labels.perSession}</span>
                    </div>
                  ) : <span />}
                  <span className="text-sm font-semibold text-[var(--primary)]">{labels.viewProfile} →</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
