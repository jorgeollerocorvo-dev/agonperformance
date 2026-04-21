import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { getDictionary, hasLocale } from "../../dictionaries";

export default async function RegisterPage({ params }: PageProps<"/[lang]/register">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  async function register(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim() || null;
    const roleChoice = formData.get("role") === "CLIENT" ? "CLIENT" : "COACH";

    if (!email || password.length < 6) redirect(`/${lang}/register?error=1`);
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) redirect(`/${lang}/register?error=exists`);

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        displayName: fullName,
        preferredLanguage: lang === "en" ? "EN" : "ES",
        roles: { create: [{ role: roleChoice }] },
        ...(roleChoice === "COACH"
          ? {
              coachProfile: {
                create: {
                  providerType: "PERSONAL_TRAINER",
                  listingStatus: "DRAFT",
                },
              },
            }
          : {}),
      },
    });

    await signIn("credentials", { email, password, redirect: false });
    redirect(`/${lang}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form action={register} className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold">{dict.auth.signUp}</h1>
        <label className="block text-sm">
          <span className="mb-1 block">{dict.auth.name}</span>
          <input name="fullName" className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{dict.auth.email}</span>
          <input name="email" type="email" required className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{dict.auth.password}</span>
          <input name="password" type="password" minLength={6} required className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" />
        </label>
        <fieldset className="text-sm">
          <legend className="mb-1">{dict.auth.role}</legend>
          <label className="mr-4"><input type="radio" name="role" value="COACH" defaultChecked /> {dict.auth.coach}</label>
          <label><input type="radio" name="role" value="CLIENT" /> {dict.auth.athlete}</label>
        </fieldset>
        <button type="submit" className="w-full rounded-md bg-zinc-900 text-white py-2.5 font-medium hover:bg-zinc-700 dark:bg-white dark:text-zinc-900">
          {dict.auth.signUp}
        </button>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {dict.auth.alreadyHaveAccount}{" "}
          <Link href={`/${lang}/login`} className="underline">{dict.auth.signIn}</Link>
        </p>
      </form>
    </main>
  );
}
