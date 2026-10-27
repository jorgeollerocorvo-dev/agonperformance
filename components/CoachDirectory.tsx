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
  photoUrl: string | null;
  photoInitial: string;
  rating: number | null;
  ratingCount: number;
  yearsExperience: number | null;
  languages: string[];
  verified: boolean;
  willTravel: boolean;
  subscriptionTier: "FREE" | "PREMIUM" | "PRO";
};

/**
 * Doctoralia-style directory layout: sticky map on the right (desktop) /
 * collapsible toggle on mobile, cards on the left. Hover a card → highlights
 * the pin and vice versa.
 */
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
  const [showMap, setShowMap] = useState(false);

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
    <div className="grid lg:grid-cols-[1fr_24rem] gap-4" dir="ltr">
      {/* Results column */}
      <div>
        {/* Mobile map toggle */}
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="lg:hidden mb-3 w-full rounded-full bg-[var(--ink)] text-white text-sm font-semibold px-4 py-2.5"
        >
          {showMap ? "✕ Hide map" : "🗺️ Show map"}
        </button>

        {showMap && (
          <div className="lg:hidden h-[50vh] rounded-2xl overflow-hidden border border-[var(--border)] mb-4">
            <CoachMap items={mapItems} selectedId={selectedId} hoveredId={hoveredId} onSelect={setSelectedId} defaultCenter={defaultCenter} />
          </div>
        )}

        <ul className="space-y-3">
          {coaches.map((c) => <CoachCard key={c.id} c={c} lang={lang} labels={labels} active={c.id === selectedId || c.id === hoveredId} onEnter={() => setHoveredId(c.id)} onLeave={() => setHoveredId((h) => (h === c.id ? null : h))} onSelect={() => setSelectedId(c.id)} />)}
        </ul>
      </div>

      {/* Sticky desktop map */}
      <div className="hidden lg:block">
        <div className="sticky top-24 h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-[var(--border)] relative">
          <CoachMap items={mapItems} selectedId={selectedId} hoveredId={hoveredId} onSelect={setSelectedId} defaultCenter={defaultCenter} />
          {mapItems.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
              <div className="rounded-full bg-white/90 backdrop-blur border border-[var(--border)] px-4 py-2 text-xs text-[var(--ink-muted)] shadow-sm">
                {labels.noMapLoc}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CoachCard({ c, lang, labels, active, onEnter, onLeave, onSelect }: {
  c: CoachDirItem;
  lang: string;
  labels: { from: string; perSession: string; viewProfile: string };
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const featured = c.subscriptionTier !== "FREE";
  const langsLabel = c.languages?.length ? c.languages.slice(0, 4).map((l) => l.toUpperCase()).join(" · ") : null;

  return (
    <li onMouseEnter={onEnter} onMouseLeave={onLeave} onFocus={onSelect}>
      <Link
        href={`/${lang}/coaches/${c.handle ?? c.id}`}
        className={`block rounded-2xl bg-[var(--surface)] p-4 sm:p-5 border transition relative ${
          active
            ? "border-[var(--primary)] ring-4 ring-[var(--primary-soft)] shadow-lg"
            : "border-[var(--border)] hover:border-[var(--primary)]/40 hover:shadow-md"
        }`}
      >
        {featured && (
          <div className="absolute top-3 right-3 text-[0.6rem] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
            ⭐ Featured
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--ink)] text-white grid place-items-center text-2xl font-bold shrink-0 overflow-hidden">
            {c.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
            ) : (
              c.photoInitial
            )}
          </div>

          {/* Core info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <div className="font-bold text-base sm:text-lg truncate">{c.name}</div>
              {c.verified && <span title="Verified" className="text-[var(--primary)] text-sm">✓</span>}
            </div>
            {c.headline && <div className="text-sm text-[var(--ink-muted)] line-clamp-2 mt-0.5">{c.headline}</div>}

            {/* Row of meta — city · exp · languages */}
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ink-muted)]">
              {c.city && <span>📍 {c.city}</span>}
              {c.yearsExperience != null && c.yearsExperience > 0 && (
                <span>🎓 {c.yearsExperience} {lang === "es" ? "años exp." : lang === "ar" ? "سنوات" : "yr exp"}</span>
              )}
              {c.willTravel && <span>🚗 {lang === "es" ? "Se desplaza" : lang === "ar" ? "يتنقل" : "Travels"}</span>}
              {langsLabel && <span>🌐 {langsLabel}</span>}
            </div>
          </div>

          {/* Rating + action right side */}
          <div className="text-right shrink-0 hidden sm:block">
            {c.rating !== null && (
              <>
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-amber-500">★</span>
                  <span className="font-bold">{c.rating.toFixed(1)}</span>
                </div>
                <div className="text-[0.65rem] text-[var(--ink-subtle)]">{c.ratingCount} {lang === "es" ? "reseñas" : lang === "ar" ? "تقييم" : "reviews"}</div>
              </>
            )}
          </div>
        </div>

        {/* Specialty chips */}
        {c.specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {c.specialties.slice(0, 4).map((s) => (
              <Pill key={s.id} color="primary">{s.label}</Pill>
            ))}
            {c.specialties.length > 4 && <span className="text-xs text-[var(--ink-muted)] py-0.5">+{c.specialties.length - 4}</span>}
          </div>
        )}

        {/* Footer: price + CTA */}
        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-baseline justify-between gap-2">
          {c.priceMin ? (
            <div>
              <span className="text-xs text-[var(--ink-muted)]">{labels.from}</span>{" "}
              <span className="text-xl font-bold text-[var(--ink)]">{Math.round(parseFloat(c.priceMin))}</span>{" "}
              <span className="text-xs text-[var(--ink-muted)]">{c.currency} / {labels.perSession}</span>
            </div>
          ) : (
            <span className="text-xs text-[var(--ink-muted)]">{lang === "es" ? "Precio bajo consulta" : lang === "ar" ? "السعر عند الاستفسار" : "Price on request"}</span>
          )}
          <span className="text-sm font-bold text-[var(--primary)]">{labels.viewProfile} →</span>
        </div>
      </Link>
    </li>
  );
}
