import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { signIn } from "@/auth";
import { getDictionary, hasLocale } from "../../dictionaries";
import HomeLink from "@/components/HomeLink";
import { Card, Button } from "@/components/ui/Card";

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const sp = await searchParams;
  const dict = await getDictionary(lang);
  const err = typeof sp?.error === "string";

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      await signIn("credentials", { email, password, redirect: false });
    } catch {
      redirect(`/${lang}/login?error=1`);
    }
    redirect(`/${lang}`);
  }

  return (
    <div className="min-h-screen">
      <header className="px-4 sm:px-6 py-3 flex items-center gap-3">
        <HomeLink href={`/${lang}`} label="Home" />
        <Link href={`/${lang}`} className="font-semibold tracking-tight">{dict.brand}</Link>
      </header>
      <main className="flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-sm">
          <form action={login} className="space-y-4">
            <h1 className="text-2xl font-bold">{dict.auth.signIn}</h1>
            {err && <p className="text-sm text-[var(--danger)]">{dict.auth.invalid}</p>}
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.auth.email}</span>
              <input name="email" type="email" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.auth.password}</span>
              <input name="password" type="password" required className={inputCls} />
            </label>
            <Button type="submit" className="w-full" size="lg">{dict.auth.signIn}</Button>
            <p className="text-sm text-[var(--ink-muted)]">
              {dict.auth.needAccount}{" "}
              <Link href={`/${lang}/register`} className="underline text-[var(--primary)]">{dict.auth.signUp}</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
