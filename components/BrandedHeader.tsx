import Link from "next/link";
import Image from "next/image";
import { BRAND } from "@/lib/brand";

export default function BrandedHeader({
  lang,
  children,
}: {
  lang: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-40">
      <div className="px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        {/* Logo & Brand Name */}
        <Link href={`/${lang}`} className="flex items-center gap-3 hover:opacity-80 transition group">
          {/* Agon Performance Logo */}
          <div className="w-12 h-12 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <circle cx="100" cy="100" r="95" fill="#1A1A1A" stroke="#FFFFFF" strokeWidth="3"/>
              <g stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round">
                <path d="M 100 60 Q 120 70, 120 100 Q 120 120, 100 120 Q 80 120, 80 100 Q 80 85, 95 80 Q 110 75, 115 90 Q 120 105, 105 115"/>
              </g>
            </svg>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-[#1A1A1A]">{BRAND.name}</div>
            <div className="text-xs text-[#666666]">Elite Performance</div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href={`/${lang}/consultation`}
            className="text-sm text-[#666666] hover:text-[#2E75B6] transition-colors font-medium"
          >
            Consultation
          </Link>
          <Link
            href={`/${lang}/coaches`}
            className="text-sm text-[#666666] hover:text-[#2E75B6] transition-colors font-medium"
          >
            Coaches
          </Link>
        </nav>

        {/* Auth Navigation */}
        <nav className="ml-auto flex items-center gap-3">
          {children}
        </nav>
      </div>
    </header>
  );
}
