"use client";

import dynamic from "next/dynamic";

const CoverageInner = dynamic(() => import("./CoverageMapInner"), { ssr: false });

export default function CoverageMap({
  lat,
  lng,
  radiusKm,
  label,
}: {
  lat: number;
  lng: number;
  radiusKm: number | null;
  label?: string;
}) {
  return (
    <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-[var(--border)]" dir="ltr">
      <CoverageInner lat={lat} lng={lng} radiusKm={radiusKm} label={label} />
    </div>
  );
}
