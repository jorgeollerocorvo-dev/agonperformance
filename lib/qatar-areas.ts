/**
 * Canonical list of Qatar areas used for quick-pick filtering on the coach
 * directory. These are the most-searched locations where coaches operate.
 * Order matters: appears left-to-right in the UI.
 */
export const QATAR_AREAS: Array<{ id: string; label: string; lat: number; lng: number }> = [
  { id: "doha", label: "Doha", lat: 25.2854, lng: 51.5310 },
  { id: "west-bay", label: "West Bay", lat: 25.3217, lng: 51.5250 },
  { id: "the-pearl", label: "The Pearl", lat: 25.3663, lng: 51.5468 },
  { id: "lusail", label: "Lusail", lat: 25.4260, lng: 51.4870 },
  { id: "al-rayyan", label: "Al Rayyan", lat: 25.2919, lng: 51.4244 },
  { id: "education-city", label: "Education City", lat: 25.3148, lng: 51.4344 },
  { id: "al-wakrah", label: "Al Wakrah", lat: 25.1715, lng: 51.6033 },
  { id: "al-khor", label: "Al Khor", lat: 25.6881, lng: 51.5057 },
  { id: "mesaieed", label: "Mesaieed", lat: 24.9876, lng: 51.5466 },
];

export const QATAR_CENTER: [number, number] = [25.3548, 51.1839];

/** Common languages coaches offer in Qatar. */
export const COMMON_LANGUAGES: Array<{ code: string; label: string; nativeLabel: string }> = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "tl", label: "Tagalog", nativeLabel: "Tagalog" },
];

/** Price buckets in QAR for the quick-filter chips. */
export const PRICE_BUCKETS = [
  { id: "lt150", label: "< 150 QAR", min: 0, max: 150 },
  { id: "150-300", label: "150–300 QAR", min: 150, max: 300 },
  { id: "300-500", label: "300–500 QAR", min: 300, max: 500 },
  { id: "gt500", label: "500+ QAR", min: 500, max: 999999 },
];

/** Years-of-experience brackets. */
export const EXPERIENCE_BUCKETS = [
  { id: "0-2", label: "< 2 years", min: 0, max: 2 },
  { id: "2-5", label: "2–5 years", min: 2, max: 5 },
  { id: "5-10", label: "5–10 years", min: 5, max: 10 },
  { id: "10+", label: "10+ years", min: 10, max: 99 },
];
