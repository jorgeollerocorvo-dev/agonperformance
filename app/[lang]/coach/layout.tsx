import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getDictionary, hasLocale } from "../dictionaries";

export default async function CoachLayout({
  children,
  params,
}: LayoutProps<"/[lang]/coach">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (session.user.role !== "COACH") redirect(`/${lang}/athlete`);

  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-6">
          <Link href={`/${lang}/coach`} className="font-semibold">{dict.brand}</Link>
          <nav className="flex gap-4 text-sm">
            <Link href={`/${lang}/coach/athletes`}>{dict.nav.athletes}</Link>
            <Link href={`/${lang}/coach/programs`}>{dict.nav.programs}</Link>
          </nav>
          <form
            action={async () => { "use server"; await signOut({ redirect: false }); }}
            className="ml-auto"
          >
            <button className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline">{dict.nav.logout}</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
