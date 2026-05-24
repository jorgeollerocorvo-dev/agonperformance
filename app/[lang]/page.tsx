import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary, hasLocale } from "./dictionaries";
import { primaryRole } from "@/lib/roles";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BrandedHeader from "@/components/BrandedHeader";
import HeroSection from "@/components/HeroSection";
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
    <div className="min-h-screen bg-white">
      {/* Premium Branded Header */}
      <BrandedHeader lang={lang}>
        <LanguageSwitcher current={lang} compact />
        {dashboardHref ? (
          <>
            <Link
              href={dashboardHref}
              className="rounded-lg bg-[#2E75B6] text-white px-4 py-2 text-sm font-semibold hover:bg-[#1E5A94] transition-colors whitespace-nowrap"
            >
              {dict.nav.profile} →
            </Link>
            <AccountLogoutButton lang={lang} compact />
          </>
        ) : (
          <>
            <Link
              href={`/${lang}/login`}
              className="text-sm px-3 py-2 text-[#666666] hover:text-[#1A1A1A] transition-colors whitespace-nowrap"
            >
              {dict.auth.signIn}
            </Link>
            <Link
              href={`/${lang}/register`}
              className="rounded-lg bg-[#2E75B6] text-white px-4 py-2 text-sm font-semibold hover:bg-[#1E5A94] transition-colors whitespace-nowrap"
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
              className="p-8 rounded-xl bg-[#2E75B6] text-white font-bold text-center hover:bg-[#1E5A94] transition-colors shadow-md hover:shadow-lg"
            >
              <div className="text-4xl mb-3">🗺️</div>
              <h3 className="text-xl mb-2">Browse Coaches</h3>
              <p className="text-white/90 text-sm">Find elite coaches in your area</p>
            </Link>

            {/* Find My Coach */}
            <Link
              href={`/${lang}/find-my-coach`}
              className="p-8 rounded-xl border-2 border-[#1A1A1A] bg-white text-[#1A1A1A] font-bold text-center hover:bg-[#1A1A1A] hover:text-white transition-colors"
            >
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-xl mb-2">Get Matched</h3>
              <p className="text-[#666666] text-sm hover:text-white/90">We find the perfect coach for you</p>
            </Link>

            {/* Book Consultation */}
            <Link
              href={`/${lang}/consultation`}
              className="p-8 rounded-xl bg-[#2E75B6] text-white font-bold text-center hover:bg-[#1E5A94] transition-colors shadow-md hover:shadow-lg"
            >
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-xl mb-2">Free Consultation</h3>
              <p className="text-white/90 text-sm">Talk with our experts today</p>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] bg-[#F5F5F5] px-4 sm:px-8 py-12">
        <div className="max-w-6xl mx-auto text-center text-[#666666]">
          <p className="mb-2 font-bold text-[#1A1A1A]">{BRAND.name}</p>
          <p className="text-sm mb-4">{BRAND.tagline}</p>
          <p className="text-xs">© 2026 {BRAND.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
