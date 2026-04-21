import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { hasRole } from "@/lib/roles";
import { getDictionary, hasLocale } from "../dictionaries";

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6">
          <Link href={`/${lang}/athlete`} className="font-semibold">{dict.brand}</Link>
          <nav className="flex gap-4 text-sm flex-wrap">
            <Link href={`/${lang}/athlete`}>{dict.nav.today}</Link>
            <Link href={`/${lang}/athlete/history`}>{dict.nav.history}</Link>
            <Link href={`/${lang}/messages`}>{dict.nav.messages}</Link>
          </nav>
          <form
            action={async () => { "use server"; await signOut({ redirect: false }); }}
            className="ml-auto"
          >
            <button className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline">{dict.nav.logout}</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
