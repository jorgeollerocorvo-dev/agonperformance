import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary, hasLocale } from "./dictionaries";
import { primaryRole } from "@/lib/roles";

export default async function LandingPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  const role = primaryRole(session);
  const dashboardHref =
    role === "COACH" ? `/${lang}/coach`
    : role === "ADMIN" ? `/${lang}/admin`
    : role === "CLIENT" ? `/${lang}/athlete`
    : null;

  const dict = await getDictionary(lang);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-xl text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight">{dict.brand}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{dict.landing.tagline}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href={`/${lang}/coaches`}
            className="rounded-md bg-zinc-900 text-white px-5 py-2.5 font-medium hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
          >
            {dict.directory.browseCoaches}
          </Link>
          <Link
            href={`/${lang}/find-my-coach`}
            className="rounded-md border border-zinc-300 px-5 py-2.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {dict.directory.findMyCoach}
          </Link>
        </div>
        <div className="text-xs text-zinc-500 flex gap-3 justify-center">
          {dashboardHref ? (
            <Link href={dashboardHref} className="hover:underline">{dict.nav.profile} →</Link>
          ) : (
            <>
              <Link href={`/${lang}/login`} className="hover:underline">{dict.auth.signIn}</Link>
              <span>·</span>
              <Link href={`/${lang}/register`} className="hover:underline">{dict.auth.signUp}</Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
