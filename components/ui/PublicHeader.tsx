import Link from "next/link";
import HomeLink from "../HomeLink";

export default function PublicHeader({
  lang,
  brand,
  rightSlot,
}: {
  lang: string;
  brand: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] backdrop-blur border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-3">
        <HomeLink href={`/${lang}`} label="Home" />
        <Link href={`/${lang}`} className="font-semibold tracking-tight">{brand}</Link>
        <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
      </div>
    </header>
  );
}
