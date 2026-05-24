import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isJorge } from "@/lib/jorge";
import { getDictionary, hasLocale } from "../dictionaries";
import HomeLink from "@/components/HomeLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AccountLogoutButton from "@/components/AccountLogoutButton";
import MobileMenu, { type MobileMenuItem } from "@/components/MobileMenu";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);

  // Only Jorge can access admin area
  if (!isJorge(session)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  const navLink = "px-3 py-1.5 rounded-full text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]";

  const items: MobileMenuItem[] = [
    { href: `/${lang}/admin/coaches`, label: "Coaches Area" },
    { href: `/${lang}/admin/catalog`, label: "🛍️ Catalog" },
    { href: `/${lang}/coach`, label: dict.coach.dashboard ?? "Coach Dashboard" },
    { href: `/${lang}/account`, label: dict.nav.account ?? "Account" },
  ];

  const logoutForm = (
    <div className="px-2 py-2">
      <AccountLogoutButton lang={lang} />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--border)] isolate">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <HomeLink href={`/${lang}`} label="Home" />
          <Link href={`/${lang}/coach`} className="font-semibold tracking-tight">
            {dict.brand}
          </Link>
          <span className="text-[var(--ink-muted)] text-sm">/ Admin</span>

          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-1 ml-2">
            <Link href={`/${lang}/admin/coaches`} className={navLink}>
              Coaches Area
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher current={lang} compact />
            <div className="hidden sm:block">
              <AccountLogoutButton lang={lang} compact />
            </div>
            {/* Mobile hamburger with logout in extra slot */}
            <div className="sm:hidden">
              <MobileMenu items={items} extraSlot={logoutForm} ariaLabel="Menu" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
