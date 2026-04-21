import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary, hasLocale } from "./dictionaries";
import { primaryRole } from "@/lib/roles";
import { Button } from "@/components/ui/Card";

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
    <main className="flex min-h-screen items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-[var(--border)] px-3 py-1 text-xs text-[var(--ink-muted)] backdrop-blur">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
          {dict.brand}
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-none">
          {dict.landing.heroLine1 ?? dict.landing.tagline}
        </h1>
        {dict.landing.heroLine2 && (
          <p className="text-lg text-[var(--ink-muted)] max-w-lg mx-auto">{dict.landing.heroLine2}</p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href={`/${lang}/coaches`}
            className="rounded-full bg-[var(--primary)] text-white px-6 py-3 font-medium hover:bg-[var(--primary-hover)]"
          >
            {dict.directory.browseCoaches}
          </Link>
          <Link
            href={`/${lang}/find-my-coach`}
            className="rounded-full bg-white border border-[var(--border)] text-[var(--ink)] px-6 py-3 font-medium hover:bg-[var(--surface-2)]"
          >
            {dict.directory.findMyCoach}
          </Link>
        </div>
        <div className="text-sm text-[var(--ink-muted)] flex gap-3 justify-center">
          {dashboardHref ? (
            <Link href={dashboardHref} className="hover:underline font-medium text-[var(--primary)]">{dict.nav.profile} →</Link>
          ) : (
            <>
              <Link href={`/${lang}/login`} className="hover:underline">{dict.auth.signIn}</Link>
              <span className="text-[var(--ink-subtle)]">·</span>
              <Link href={`/${lang}/register`} className="hover:underline">{dict.auth.signUp}</Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
