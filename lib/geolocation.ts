export type GeoHint = {
  country: string;       // Always "QA" — app is Qatar-only for launch
  lat: number;
  lng: number;
  city?: string;
};

/**
 * Launch scope: Qatar only. Always return Doha as the default center.
 * Coaches differentiate themselves by setting their own lat/lng + radius inside Qatar.
 */
export async function detectGeo(): Promise<GeoHint> {
  return { country: "QA", lat: 25.286, lng: 51.534, city: "Doha" };
}
