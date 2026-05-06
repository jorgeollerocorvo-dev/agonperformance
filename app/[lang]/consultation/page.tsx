import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import BrandedHeader from "@/components/BrandedHeader";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ConsultationBooking from "@/components/ConsultationBooking";
import { auth } from "@/auth";
import Link from "next/link";
import { primaryRole } from "@/lib/roles";

export const metadata = {
  title: "Free Consultation - Agon Performance",
  description: "Book your free 15-20 minute consultation with our fitness coach",
};

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const role = primaryRole(session);
  const dashboardHref =
    role === "COACH" ? `/${lang}/coach`
    : role === "ADMIN" ? `/${lang}/admin`
    : role === "CLIENT" ? `/${lang}/athlete`
    : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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

      {/* Content */}
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2">Free Consultation</h1>
            <p className="text-lg text-[#666666]">
              Get personalized advice from our fitness coach
            </p>
          </div>

          <ConsultationBooking />
        </div>
      </div>
    </div>
  );
}
