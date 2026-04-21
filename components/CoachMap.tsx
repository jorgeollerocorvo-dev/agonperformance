"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type CoachMapItem = {
  id: string;
  handle: string | null;
  name: string;
  headline: string | null;
  lat: number;
  lng: number;
  radiusKm: number | null;
  city: string | null;
};

// Default Leaflet marker icon fix (bundler path issue)
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const highlightIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#111;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitBounds({ items }: { items: CoachMapItem[] }) {
  const map = useMap();
  useEffect(() => {
    if (items.length === 0) return;
    if (items.length === 1) {
      map.setView([items[0].lat, items[0].lng], 11);
      return;
    }
    const bounds = L.latLngBounds(items.map((i) => [i.lat, i.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [items, map]);
  return null;
}

function FocusOnSelected({ item }: { item: CoachMapItem | null }) {
  const map = useMap();
  useEffect(() => {
    if (!item) return;
    map.flyTo([item.lat, item.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [item, map]);
  return null;
}

export default function CoachMap({
  items,
  selectedId,
  hoveredId,
  onSelect,
}: {
  items: CoachMapItem[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  const center: [number, number] =
    items.length > 0 ? [items[0].lat, items[0].lng] : [25.286, 51.534]; // default Doha

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <MapContainer center={center} zoom={10} className="w-full h-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds items={items} />
        <FocusOnSelected item={selectedItem} />
        {items.map((c) => {
          const isActive = c.id === selectedId || c.id === hoveredId;
          return (
            <div key={c.id}>
              {c.radiusKm && isActive && (
                <Circle
                  center={[c.lat, c.lng]}
                  radius={c.radiusKm * 1000}
                  pathOptions={{ color: "#111", fillColor: "#111", fillOpacity: 0.08, weight: 1 }}
                />
              )}
              <Marker
                position={[c.lat, c.lng]}
                icon={isActive ? highlightIcon : defaultIcon}
                eventHandlers={{ click: () => onSelect(c.id) }}
              >
                <Popup>
                  <div className="font-medium">{c.name}</div>
                  {c.headline && <div className="text-xs text-zinc-600">{c.headline}</div>}
                  {c.city && <div className="text-xs text-zinc-500">📍 {c.city}</div>}
                  {c.radiusKm && <div className="text-xs text-zinc-500">{c.radiusKm} km radius</div>}
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
