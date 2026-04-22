import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { hasRole } from "@/lib/roles";
import { getDictionary, hasLocale } from "../dictionaries";
import HomeLink from "@/components/HomeLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function CoachLayout({
  children,
  params,
}: LayoutProps<"/[lang]/coach">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!Array.isArray(session.user.roles) || session.user.roles.length === 0) {
    redirect(`/${lang}/login`);
  }
  if (!hasRole(session, "COACH")) redirect(`/${lang}/athlete`);

  const dict = await getDictionary(lang);

  const navLink = "px-3 py-1.5 rounded-full text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <HomeLink href={`/${lang}`} label="Home" />
          <Link href={`/${lang}/coach`} className="font-semibold tracking-tight">{dict.brand}</Link>
          <nav className="hidden sm:flex gap-1 ml-2">
            <Link href={`/${lang}/coach/athletes`} className={navLink}>{dict.nav.athletes}</Link>
            <Link href={`/${lang}/coach/programs`} className={navLink}>{dict.nav.programs}</Link>
            <Link href={`/${lang}/messages`} className={navLink}>{dict.nav.messages}</Link>
            <Link href={`/${lang}/coach/profile`} className={navLink}>{dict.nav.profile}</Link>
            <Link href={`/${lang}/account`} className={navLink}>{dict.nav.account}</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher current={lang} compact />
            <form action={async () => { "use server"; await signOut({ redirect: false }); }}>
              <button className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] px-3 py-1.5">{dict.nav.logout}</button>
            </form>
          </div>
        </div>
        {/* mobile tabs */}
        <nav className="sm:hidden flex gap-1 px-3 pb-2 overflow-x-auto">
          <Link href={`/${lang}/coach/athletes`} className={navLink}>{dict.nav.athletes}</Link>
          <Link href={`/${lang}/coach/programs`} className={navLink}>{dict.nav.programs}</Link>
          <Link href={`/${lang}/messages`} className={navLink}>{dict.nav.messages}</Link>
          <Link href={`/${lang}/coach/profile`} className={navLink}>{dict.nav.profile}</Link>
          <Link href={`/${lang}/account`} className={navLink}>{dict.nav.account}</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-10">{children}</main>
    </div>
  );
}
