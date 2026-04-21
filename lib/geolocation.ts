import { headers } from "next/headers";

export type GeoHint = {
  country: string;       // ISO-2, e.g. "QA"
  lat: number;
  lng: number;
  city?: string;
};

// Known country fallback centers (used if IP lookup fails but we can guess)
const COUNTRY_CENTERS: Record<string, { lat: number; lng: number; city: string }> = {
  QA: { lat: 25.286, lng: 51.534, city: "Doha" },
  AE: { lat: 25.276, lng: 55.296, city: "Dubai" },
  SA: { lat: 24.713, lng: 46.675, city: "Riyadh" },
  BH: { lat: 26.228, lng: 50.586, city: "Manama" },
  KW: { lat: 29.375, lng: 47.976, city: "Kuwait City" },
  OM: { lat: 23.586, lng: 58.408, city: "Muscat" },
  ES: { lat: 40.4168, lng: -3.7038, city: "Madrid" },
  GB: { lat: 51.507, lng: -0.127, city: "London" },
  US: { lat: 40.7128, lng: -74.006, city: "New York" },
};

const DEFAULT_CENTER: GeoHint = { country: "QA", lat: 25.286, lng: 51.534, city: "Doha" };

/**
 * Detect approximate user location from request IP.
 * Uses ipapi.co (free, ~30k/month no-key). Cached for 1h per-IP.
 * Falls back to Doha/Qatar if detection fails.
 */
export async function detectGeo(): Promise<GeoHint> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || h.get("x-real-ip") || "";

  // Cloudflare / Railway may also inject cf-ipcountry
  const cfCountry = h.get("cf-ipcountry")?.toUpperCase();
  if (cfCountry && COUNTRY_CENTERS[cfCountry]) {
    const c = COUNTRY_CENTERS[cfCountry];
    return { country: cfCountry, lat: c.lat, lng: c.lng, city: c.city };
  }

  if (!ip || isPrivateIp(ip)) return DEFAULT_CENTER;

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "AgonPerformance/1.0" },
    });
    if (!res.ok) return DEFAULT_CENTER;
    const data = await res.json();
    if (data?.error || typeof data?.latitude !== "number") return DEFAULT_CENTER;
    return {
      country: String(data.country_code ?? "").toUpperCase() || DEFAULT_CENTER.country,
      lat: Number(data.latitude),
      lng: Number(data.longitude),
      city: data.city ?? undefined,
    };
  } catch {
    return DEFAULT_CENTER;
  }
}

function isPrivateIp(ip: string): boolean {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("127.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") || ip.startsWith("172.17.") || ip.startsWith("172.18.") || ip.startsWith("172.19.") ||
    ip.startsWith("172.20.") || ip.startsWith("172.21.") || ip.startsWith("172.22.") || ip.startsWith("172.23.") ||
    ip.startsWith("172.24.") || ip.startsWith("172.25.") || ip.startsWith("172.26.") || ip.startsWith("172.27.") ||
    ip.startsWith("172.28.") || ip.startsWith("172.29.") || ip.startsWith("172.30.") || ip.startsWith("172.31.") ||
    ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd")
  );
}
