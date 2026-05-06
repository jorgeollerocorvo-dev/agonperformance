import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary, hasLocale } from "./dictionaries";
import { primaryRole } from "@/lib/roles";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BrandedHeader from "@/components/BrandedHeader";
import HeroSection from "@/components/HeroSection";
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
          <Link 
            href={dashboardHref} 
            className="rounded-lg bg-[#2E75B6] text-white px-4 py-2 text-sm font-semibold hover:bg-[#1E5A94] transition-colors"
          >
            {dict.nav.profile} →
          </Link>
        ) : (
          <>
            <Link 
              href={`/${lang}/login`} 
              className="text-sm px-3 py-2 text-[#666666] hover:text-[#1A1A1A] hidden sm:inline transition-colors"
            >
              {dict.auth.signIn}
            </Link>
            <Link 
              href={`/${lang}/register`} 
              className="rounded-lg bg-[#2E75B6] text-white px-4 py-2 text-sm font-semibold hover:bg-[#1E5A94] transition-colors"
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
              className="group p-8 rounded-xl bg-gradient-to-br from-[#2E75B6] to-[#1E5A94] text-white shadow-md hover:shadow-xl hover:scale-105 transition-all"
            >
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-2xl font-bold mb-2">Browse Coaches</h3>
              <p className="text-white/90">Find elite coaches in your area</p>
            </Link>

            {/* Find My Coach */}
            <Link
              href={`/${lang}/find-my-coach`}
              className="group p-8 rounded-xl border-2 border-[#2E75B6] bg-white hover:bg-[#E8F0F7] transition-all"
            >
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2">Get Matched</h3>
              <p className="text-[#666666]">We find the perfect coach for you</p>
            </Link>

            {/* Book Consultation */}
            <Link
              href={`/${lang}/consultation`}
              className="group p-8 rounded-xl bg-white border-2 border-[#E5E5E5] hover:border-[#2E75B6] hover:shadow-lg transition-all"
            >
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2">Free Consultation</h3>
              <p className="text-[#666666]">Talk with our experts today</p>
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
