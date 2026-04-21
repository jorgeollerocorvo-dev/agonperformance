import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { getDictionary, hasLocale } from "../../dictionaries";
import HomeLink from "@/components/HomeLink";
import { Card, Button } from "@/components/ui/Card";

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
        preferredLanguage: lang === "en" ? "EN" : lang === "ar" ? "AR" : "ES",
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
    <div className="min-h-screen">
      <header className="px-4 sm:px-6 py-3 flex items-center gap-3">
        <HomeLink href={`/${lang}`} label="Home" />
        <Link href={`/${lang}`} className="font-semibold tracking-tight">{dict.brand}</Link>
      </header>
      <main className="flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-sm">
          <form action={register} className="space-y-4">
            <h1 className="text-2xl font-bold">{dict.auth.signUp}</h1>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.auth.name}</span>
              <input name="fullName" className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.auth.email}</span>
              <input name="email" type="email" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.auth.password}</span>
              <input name="password" type="password" minLength={6} required className={inputCls} />
            </label>
            <fieldset className="text-sm">
              <legend className="mb-1 text-[var(--ink-muted)]">{dict.auth.role}</legend>
              <div className="flex gap-2">
                <label className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-soft)] has-[:checked]:text-[var(--primary)] cursor-pointer">
                  <input type="radio" name="role" value="COACH" defaultChecked className="mr-2" />
                  {dict.auth.coach}
                </label>
                <label className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-soft)] has-[:checked]:text-[var(--primary)] cursor-pointer">
                  <input type="radio" name="role" value="CLIENT" className="mr-2" />
                  {dict.auth.athlete}
                </label>
              </div>
            </fieldset>
            <Button type="submit" className="w-full" size="lg">{dict.auth.signUp}</Button>
            <p className="text-sm text-[var(--ink-muted)]">
              {dict.auth.alreadyHaveAccount}{" "}
              <Link href={`/${lang}/login`} className="underline text-[var(--primary)]">{dict.auth.signIn}</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
