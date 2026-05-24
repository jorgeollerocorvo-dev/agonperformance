import Link from "next/link";
import { auth } from "@/auth";
import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import AccountLogoutButton from "./AccountLogoutButton";

/**
 * Auth-aware header actions — shows Login + Sign Up when logged out,
 * Logout when logged in. Always visible on every screen size.
 *
 * Drop into any header that may be rendered on both authenticated and
 * unauthenticated pages (landing, public messages, consultation, etc.).
 */
export default async function AuthHeaderActions({ lang }: { lang: string }) {
  const session = await auth();
  const safeLang = hasLocale(lang) ? lang : "en";
  const dict = await getDictionary(safeLang);

  if (session?.user) {
    return (
      <div className="flex items-center">
        <AccountLogoutButton lang={lang} compact />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/${lang}/login`}
        className="text-sm px-3 py-2 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
      >
        {dict.auth.signIn}
      </Link>
      <Link
        href={`/${lang}/register`}
        className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
      >
        {dict.auth.signUp}
      </Link>
    </div>
  );
}
