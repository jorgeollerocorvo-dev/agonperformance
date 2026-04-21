"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";

const InnerMap = dynamic(() => import("./LocationPickerInner"), { ssr: false });

export default function LocationPicker({
  initialLat,
  initialLng,
  initialRadiusKm,
  labels,
}: {
  initialLat: number | null;
  initialLng: number | null;
  initialRadiusKm: number | null;
  labels: { lat: string; lng: string; radius: string; instruction: string };
}) {
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [radius, setRadius] = useState<number>(initialRadiusKm ?? 10);

  const center: LatLngExpression =
    lat != null && lng != null ? [lat, lng] : [25.286, 51.534];

  return (
    <div className="space-y-3" dir="ltr">
      <p className="text-xs text-zinc-500">{labels.instruction}</p>
      <div className="h-80 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <InnerMap
          center={center}
          lat={lat}
          lng={lng}
          radius={radius}
          onPick={(la, lo) => { setLat(la); setLng(lo); }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <label>
          <span className="block text-xs text-zinc-500">{labels.lat}</span>
          <input name="homeBaseLat" readOnly value={lat ?? ""} className="w-full rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800" />
        </label>
        <label>
          <span className="block text-xs text-zinc-500">{labels.lng}</span>
          <input name="homeBaseLng" readOnly value={lng ?? ""} className="w-full rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800" />
        </label>
        <label>
          <span className="block text-xs text-zinc-500">{labels.radius} ({radius} km)</span>
          <input
            type="range" min={1} max={100} step={1}
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <input type="hidden" name="serviceAreaRadiusKm" value={radius} />
        </label>
      </div>
    </div>
  );
}
