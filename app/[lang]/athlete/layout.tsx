import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { hasRole } from "@/lib/roles";
import { getDictionary, hasLocale } from "../dictionaries";
import HomeLink from "@/components/HomeLink";

export default async function AthleteLayout({
  children,
  params,
}: LayoutProps<"/[lang]/athlete">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!Array.isArray(session.user.roles) || session.user.roles.length === 0) {
    redirect(`/${lang}/login`);
  }
  if (!hasRole(session, "CLIENT")) redirect(`/${lang}/coach`);

  const dict = await getDictionary(lang);

  const navLink = "px-3 py-1.5 rounded-full text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] backdrop-blur border-b border-[var(--border)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <HomeLink href={`/${lang}`} label="Home" />
          <Link href={`/${lang}/athlete`} className="font-semibold tracking-tight">{dict.brand}</Link>
          <nav className="flex gap-1 ml-auto overflow-x-auto">
            <Link href={`/${lang}/athlete`} className={navLink}>{dict.nav.today}</Link>
            <Link href={`/${lang}/athlete/history`} className={navLink}>{dict.nav.history}</Link>
            <Link href={`/${lang}/messages`} className={navLink}>{dict.nav.messages}</Link>
            <Link href={`/${lang}/account`} className={navLink}>{dict.nav.account}</Link>
          </nav>
          <form
            action={async () => { "use server"; await signOut({ redirect: false }); }}
          >
            <button className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] px-3 py-1.5">{dict.nav.logout}</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-6 sm:py-10">{children}</main>
    </div>
  );
}
