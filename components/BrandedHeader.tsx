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
    <header className="border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur sticky top-0 z-40">
      <div className="px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <Link href={`/${lang}`} className="flex items-center gap-3 hover:opacity-80 transition group">
          <div className="w-12 h-12 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            <Image
              src="/images/brand/logo.svg"
              alt={BRAND.name}
              width={48}
              height={48}
              className="w-full h-full object-contain dark:invert"
            />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-[var(--ink)]">{BRAND.name}</div>
            <div className="text-xs text-[var(--ink-muted)]">Elite Performance</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-4 mr-4">
          <Link
            href={`/${lang}/consultation`}
            className="text-sm px-4 py-2 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            Consultation
          </Link>
          <Link
            href={`/${lang}/coaches`}
            className="text-sm px-4 py-2 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            Coaches
          </Link>
        </nav>

        <nav className="ml-auto flex items-center gap-3">
          {children}
        </nav>
      </div>
    </header>
  );
}
