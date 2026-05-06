import Link from "next/link";
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
        <Link href={`/${lang}`} className="flex items-center gap-3 hover:opacity-80 transition">
          {/* Logo Placeholder - Replace with actual logo */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2E75B6] to-[#1A1A1A] flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-[#1A1A1A]">{BRAND.name}</div>
            <div className="text-xs text-[#666666]">Elite Performance</div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="ml-auto flex items-center gap-3">
          {children}
        </nav>
      </div>
    </header>
  );
}
