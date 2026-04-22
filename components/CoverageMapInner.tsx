"use client";

import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function CoverageMapInner({
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
  const r = radiusKm ?? 10;
  // Zoom that fits the circle reasonably (rough inverse of radius)
  const zoom = r > 50 ? 9 : r > 20 ? 10 : r > 10 ? 11 : 12;

  return (
    <MapContainer center={[lat, lng]} zoom={zoom} className="w-full h-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {radiusKm && (
        <Circle
          center={[lat, lng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: "#0075EB",
            fillColor: "#0075EB",
            fillOpacity: 0.18,
            weight: 2,
            dashArray: "6 4",
          }}
        />
      )}
      <Marker position={[lat, lng]} icon={icon}>
        {label && <Popup>{label}</Popup>}
      </Marker>
    </MapContainer>
  );
}
