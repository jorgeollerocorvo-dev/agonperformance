import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary, hasLocale } from "./dictionaries";
import { primaryRole } from "@/lib/roles";

export default async function LandingPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  const role = primaryRole(session);
  const dashboardHref =
    role === "COACH" ? `/${lang}/coach`
    : role === "ADMIN" ? `/${lang}/admin`
    : role === "CLIENT" ? `/${lang}/athlete`
    : null;

  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="px-4 sm:px-8 py-5 flex items-center">
        <Link href={`/${lang}`} className="font-bold text-lg tracking-tight">{dict.brand}</Link>
        <nav className="ml-auto flex items-center gap-2">
          {dashboardHref ? (
            <Link href={dashboardHref} className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-2 text-sm font-semibold hover:opacity-90">
              {dict.nav.profile} →
            </Link>
          ) : (
            <>
              <Link href={`/${lang}/login`} className="text-sm px-4 py-2 hover:opacity-70">{dict.auth.signIn}</Link>
              <Link href={`/${lang}/register`} className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-2 text-sm font-semibold hover:opacity-90">
                {dict.auth.signUp}
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="px-4 sm:px-8 py-8 sm:py-20 max-w-6xl mx-auto">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] px-3 py-1 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
            {dict.brand}
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[0.95] display">
            {dict.landing.heroLine1 ?? dict.landing.tagline}
          </h1>
          {dict.landing.heroLine2 && (
            <p className="text-lg sm:text-xl text-[var(--ink-muted)] max-w-2xl mx-auto">
              {dict.landing.heroLine2}
            </p>
          )}
          <div className="flex gap-3 justify-center flex-wrap pt-4">
            <Link
              href={`/${lang}/coaches`}
              className="rounded-full bg-[var(--primary)] text-white px-7 py-3.5 font-semibold text-base hover:bg-[var(--primary-hover)]"
            >
              {dict.directory.browseCoaches}
            </Link>
            <Link
              href={`/${lang}/find-my-coach`}
              className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-7 py-3.5 font-semibold text-base hover:opacity-90"
            >
              {dict.directory.findMyCoach}
            </Link>
          </div>
        </div>

        {/* Gradient feature cards — each links to a real page */}
        <div className="mt-16 sm:mt-24 grid gap-5 sm:grid-cols-3">
          <Link
            href={`/${lang}/coaches`}
            className="rounded-2xl p-6 text-white bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] shadow-[var(--shadow-lg)] min-h-[180px] flex flex-col justify-between hover:scale-[1.01] transition"
          >
            <div className="w-9 h-9 rounded-full bg-white/20 grid place-items-center">🗺️</div>
            <div>
              <div className="text-xl font-bold">{dict.landing.feat1Title ?? "Browse by map"}</div>
              <div className="text-sm text-white/80 mt-1">{dict.landing.feat1Sub ?? "See coaches who cover your area."}</div>
            </div>
          </Link>
          <Link
            href={`/${lang}/find-my-coach`}
            className="rounded-2xl p-6 bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)] min-h-[180px] flex flex-col justify-between hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)] transition"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center">📋</div>
            <div>
              <div className="text-xl font-bold">{dict.landing.feat2Title ?? "Real programming"}</div>
              <div className="text-sm text-[var(--ink-muted)] mt-1">{dict.landing.feat2Sub ?? "Weekly plans, video demos, check-ins."}</div>
            </div>
          </Link>
          <Link
            href={
              role === "CLIENT" ? `/${lang}/athlete/talk`
              : role === "COACH" ? `/${lang}/messages`
              : `/${lang}/register`
            }
            className="rounded-2xl p-6 text-white bg-gradient-to-br from-[var(--ink)] to-[var(--accent-purple)] shadow-[var(--shadow-lg)] min-h-[180px] flex flex-col justify-between hover:scale-[1.01] transition"
          >
            <div className="w-9 h-9 rounded-full bg-white/20 grid place-items-center">💬</div>
            <div>
              <div className="text-xl font-bold">{dict.landing.feat3Title ?? "Talk to your coach"}</div>
              <div className="text-sm text-white/80 mt-1">{dict.landing.feat3Sub ?? "In-app chat, no phone-tag."}</div>
            </div>
          </Link>
        </div>
      </main>

      <footer className="px-4 sm:px-8 py-8 text-xs text-[var(--ink-subtle)] text-center">
        © {dict.brand}
      </footer>
    </div>
  );
}
