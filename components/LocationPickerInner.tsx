"use client";

import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export default function LocationPickerInner({
  center, lat, lng, radius, onPick,
}: {
  center: LatLngExpression;
  lat: number | null;
  lng: number | null;
  radius: number;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer center={center} zoom={lat != null ? 11 : 4} className="w-full h-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCapture onPick={onPick} />
      {lat != null && lng != null && (
        <>
          <Marker position={[lat, lng]} icon={icon} />
          <Circle
            center={[lat, lng]}
            radius={radius * 1000}
            pathOptions={{ color: "#111", fillColor: "#111", fillOpacity: 0.1, weight: 1 }}
          />
        </>
      )}
    </MapContainer>
  );
}
