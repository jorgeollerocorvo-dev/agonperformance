import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getDictionary, hasLocale } from "../dictionaries";

export default async function AthleteLayout({
  children,
  params,
}: LayoutProps<"/[lang]/athlete">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (session.user.role !== "ATHLETE") redirect(`/${lang}/coach`);

  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center gap-6">
          <Link href={`/${lang}/athlete`} className="font-semibold">{dict.brand}</Link>
          <nav className="flex gap-4 text-sm">
            <Link href={`/${lang}/athlete`}>{dict.nav.today}</Link>
            <Link href={`/${lang}/athlete/history`}>{dict.nav.history}</Link>
          </nav>
          <form
            action={async () => { "use server"; await signOut({ redirect: false }); }}
            className="ml-auto"
          >
            <button className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline">{dict.nav.logout}</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
