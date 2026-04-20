import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { signIn } from "@/auth";
import { getDictionary, hasLocale } from "../../dictionaries";

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
    <main className="flex min-h-screen items-center justify-center p-6">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold">{dict.auth.signIn}</h1>
        {err && <p className="text-sm text-red-600">{dict.auth.invalid}</p>}
        <label className="block text-sm">
          <span className="mb-1 block">{dict.auth.email}</span>
          <input name="email" type="email" required className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{dict.auth.password}</span>
          <input name="password" type="password" required className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" />
        </label>
        <button type="submit" className="w-full rounded-md bg-zinc-900 text-white py-2.5 font-medium hover:bg-zinc-700 dark:bg-white dark:text-zinc-900">
          {dict.auth.signIn}
        </button>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {dict.auth.needAccount}{" "}
          <Link href={`/${lang}/register`} className="underline">
            {dict.auth.signUp}
          </Link>
        </p>
      </form>
    </main>
  );
}
