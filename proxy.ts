import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "es", "ar"] as const;
const DEFAULT_LOCALE = "en";

function detectLocale(request: NextRequest): string {
  const cookie = request.cookies.get("locale")?.value;
  if (cookie && LOCALES.includes(cookie as (typeof LOCALES)[number])) return cookie;

  const accept = request.headers.get("accept-language") ?? "";
  const preferred = accept.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (preferred && LOCALES.includes(preferred as (typeof LOCALES)[number])) return preferred;

  return DEFAULT_LOCALE;
}

// Short shareable aliases → real route
const ALIASES: Record<string, string> = {
  "/start": "/find-my-coach",
  "/quiz": "/find-my-coach",
  "/match": "/find-my-coach",
  "/j": "/find/jorge",        // Jorge intake: shortest possible
  "/jorge": "/find/jorge",
  "/train": "/find/jorge",
};

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Resolve shareable aliases first (e.g. /start → /{locale}/find-my-coach?source=...)
  if (ALIASES[pathname]) {
    const locale = detectLocale(request);
    const target = `/${locale}${ALIASES[pathname]}`;
    request.nextUrl.pathname = target;
    // Preserve any ?source= or other UTM params already on the URL
    if (!searchParams.has("source")) searchParams.set("source", pathname.slice(1));
    return NextResponse.redirect(request.nextUrl);
  }

  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
