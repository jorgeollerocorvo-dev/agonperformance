import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary, hasLocale } from "./dictionaries";
import { primaryRole } from "@/lib/roles";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BrandedHeader from "@/components/BrandedHeader";
import HeroSection from "@/components/HeroSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import AccountLogoutButton from "@/components/AccountLogoutButton";
import { BRAND } from "@/lib/brand";

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
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Premium Branded Header */}
      <BrandedHeader lang={lang}>
        <LanguageSwitcher current={lang} compact />
        {dashboardHref ? (
          <>
            <Link
              href={dashboardHref}
              className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
            >
              {dict.nav.profile} →
            </Link>
            <AccountLogoutButton lang={lang} compact />
          </>
        ) : (
          <>
            <Link
              href={`/${lang}/login`}
              className="text-sm px-3 py-2 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors whitespace-nowrap"
            >
              {dict.auth.signIn}
            </Link>
            <Link
              href={`/${lang}/register`}
              className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
            >
              {dict.auth.signUp}
            </Link>
          </>
        )}
      </BrandedHeader>

      {/* Hero Section */}
      <HeroSection lang={lang} showCTA={!dashboardHref} />

      {/* Feature Cards - Links to real pages */}
      {!dashboardHref && (
        <section className="px-4 sm:px-8 py-20 max-w-6xl mx-auto">
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Browse Coaches */}
            <Link
              href={`/${lang}/coaches`}
              className="p-8 rounded-xl bg-[var(--primary)] text-white font-bold text-center hover:bg-[var(--primary-hover)] transition-colors shadow-md hover:shadow-lg"
            >
              <div className="text-4xl mb-3">🗺️</div>
              <h3 className="text-xl mb-2">Browse Coaches</h3>
              <p className="text-white/90 text-sm">Find elite coaches in your area</p>
            </Link>

            {/* Find My Coach */}
            <Link
              href={`/${lang}/find-my-coach`}
              className="p-8 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] font-bold text-center hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors"
            >
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-xl mb-2">Get Matched</h3>
              <p className="text-[var(--ink-muted)] text-sm hover:text-[var(--bg)]/90">We find the perfect coach for you</p>
            </Link>

            {/* Book Consultation */}
            <Link
              href={`/${lang}/consultation`}
              className="p-8 rounded-xl bg-[var(--primary)] text-white font-bold text-center hover:bg-[var(--primary-hover)] transition-colors shadow-md hover:shadow-lg"
            >
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-xl mb-2">Free Consultation</h3>
              <p className="text-white/90 text-sm">Talk with our experts today</p>
            </Link>
          </div>
          {/* Pricing CTA */}
          <div className="mt-8 text-center">
            <Link href={`/${lang}/pricing`} className="inline-block text-sm text-[var(--primary)] font-semibold hover:underline">
              {lang === "es" ? "Ver planes y precios →" : lang === "ar" ? "عرض الخطط والأسعار ←" : "See plans and pricing →"}
            </Link>
          </div>
        </section>
      )}

      {/* Testimonials — hidden if there are none */}
      <TestimonialsSection lang={lang} />

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface-2)] px-4 sm:px-8 py-12">
        <div className="max-w-6xl mx-auto text-center text-[var(--ink-muted)]">
          <p className="mb-2 font-bold text-[var(--ink)]">{BRAND.name}</p>
          <p className="text-sm mb-4">{BRAND.tagline}</p>
          <p className="text-xs">© 2026 {BRAND.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
