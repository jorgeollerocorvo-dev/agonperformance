import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isJorge } from "@/lib/jorge";
import { getDictionary, hasLocale } from "../dictionaries";
import HomeLink from "@/components/HomeLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AccountLogoutButton from "@/components/AccountLogoutButton";

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
              <AccountLogoutButton lang={lang} />
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
