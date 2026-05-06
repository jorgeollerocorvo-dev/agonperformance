import Link from "next/link";
import { BRAND, BRAND_MESSAGE } from "@/lib/brand";

interface HeroSectionProps {
  lang: string;
  showCTA?: boolean;
  variant?: "minimal" | "full";
}

export default function HeroSection({
  lang,
  showCTA = true,
  variant = "full",
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F5F5F5] via-white to-white" />

      {/* Content */}
      <div className="relative px-4 sm:px-8 py-20 sm:py-32 max-w-6xl mx-auto">
        <div className="text-center space-y-8">
          {/* Logo - Centered Large */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-[#2E75B6] to-[#1A1A1A] flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300">
              {/* Spiral Logo Placeholder */}
              <div className="text-6xl sm:text-8xl">◯</div>
            </div>
          </div>

          {/* Brand Name */}
          <div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-[#1A1A1A] leading-[0.9] mb-4">
              {BRAND.name}
            </h1>
            <div className="h-1 w-16 bg-[#2E75B6] mx-auto rounded-full" />
          </div>

          {/* Tagline */}
          <div className="space-y-4">
            <p className="text-2xl sm:text-4xl font-bold text-[#1A1A1A] max-w-3xl mx-auto">
              {BRAND_MESSAGE.hero.heading}
            </p>
            <p className="text-lg sm:text-xl text-[#666666] max-w-2xl mx-auto leading-relaxed">
              {BRAND_MESSAGE.hero.description}
            </p>
          </div>

          {/* CTAs */}
          {showCTA && (
            <div className="flex gap-4 justify-center flex-wrap pt-8">
              <Link
                href={`/${lang}/consultation`}
                className="px-8 py-4 bg-[#2E75B6] text-white font-bold text-lg rounded-lg hover:bg-[#1E5A94] transition-colors shadow-md hover:shadow-lg"
              >
                {BRAND_MESSAGE.cta.secondary}
              </Link>
              <Link
                href={`/${lang}/register`}
                className="px-8 py-4 border-2 border-[#1A1A1A] text-[#1A1A1A] font-bold text-lg rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors"
              >
                {BRAND_MESSAGE.cta.primary}
              </Link>
            </div>
          )}

          {/* Features Grid */}
          {variant === "full" && (
            <div className="mt-20 sm:mt-32 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {BRAND_MESSAGE.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="p-6 bg-white border border-[#E5E5E5] rounded-xl hover:border-[#2E75B6] hover:shadow-lg transition-all"
                >
                  <div className="text-3xl mb-3">
                    {idx === 0 ? "🎯" : idx === 1 ? "👨‍🏫" : "📊"}
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[#666666]">{feature.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
