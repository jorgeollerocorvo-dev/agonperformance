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
            <div className="w-32 h-32 sm:w-48 sm:h-48 hover:scale-110 transition-transform duration-300 drop-shadow-lg">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Outer circle background */}
                <circle cx="100" cy="100" r="95" fill="#1A1A1A" stroke="#FFFFFF" strokeWidth="4"/>

                {/* Inner spiral */}
                <g stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round">
                  {/* Spiral path - represents the journey, growth, and struggle */}
                  <path d="M 100 50 Q 130 70, 130 100 Q 130 130, 100 130 Q 70 130, 70 100 Q 70 80, 95 70 Q 120 60, 125 85 Q 130 110, 105 125"/>
                </g>
              </svg>
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
                className="px-8 py-3 bg-[#2E75B6] text-white font-bold text-lg rounded-lg hover:bg-[#1E5A94] transition-colors"
              >
                {BRAND_MESSAGE.cta.secondary}
              </Link>
              <Link
                href={`/${lang}/register`}
                className="px-8 py-3 border-2 border-[#1A1A1A] text-[#1A1A1A] font-bold text-lg rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors"
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
