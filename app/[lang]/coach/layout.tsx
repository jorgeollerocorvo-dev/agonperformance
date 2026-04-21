import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { hasRole } from "@/lib/roles";
import { getDictionary, hasLocale } from "../dictionaries";
import HomeLink from "@/components/HomeLink";

export default async function CoachLayout({
  children,
  params,
}: LayoutProps<"/[lang]/coach">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!Array.isArray(session.user.roles) || session.user.roles.length === 0) {
    // Stale session from pre-rewrite — force re-login
    redirect(`/${lang}/login`);
  }
  if (!hasRole(session, "COACH")) redirect(`/${lang}/athlete`);

  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
          <HomeLink href={`/${lang}`} label="Home" />
          <Link href={`/${lang}/coach`} className="font-semibold">{dict.brand}</Link>
          <nav className="flex gap-3 sm:gap-4 text-sm flex-wrap">
            <Link href={`/${lang}/coach/athletes`}>{dict.nav.athletes}</Link>
            <Link href={`/${lang}/coach/programs`}>{dict.nav.programs}</Link>
            <Link href={`/${lang}/messages`}>{dict.nav.messages}</Link>
            <Link href={`/${lang}/coach/profile`}>{dict.nav.profile}</Link>
            <Link href={`/${lang}/account`}>{dict.nav.account}</Link>
          </nav>
          <form
            action={async () => { "use server"; await signOut({ redirect: false }); }}
            className="ml-auto"
          >
            <button className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline">{dict.nav.logout}</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
