import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import BrandedHeader from "@/components/BrandedHeader";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AccountLogoutButton from "@/components/AccountLogoutButton";
import { Card, Button } from "@/components/ui/Card";

export default async function AccountPage({ params, searchParams }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  const sp = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect(`/${lang}/login`);

  async function changePassword(formData: FormData) {
    "use server";
    const s = await auth();
    const langParam = String(formData.get("lang") ?? lang);
    if (!s?.user) redirect(`/${langParam}/login`);
    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("next") ?? "");
    if (next.length < 6) redirect(`/${langParam}/account?error=short`);

    const u = await prisma.user.findUnique({ where: { id: s.user.id } });
    if (!u?.passwordHash) redirect(`/${langParam}/account?error=no_password`);
    const ok = await bcrypt.compare(current, u.passwordHash);
    if (!ok) redirect(`/${langParam}/account?error=wrong`);

    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(next, 10) },
    });
    redirect(`/${langParam}/account?saved=1`);
  }

  async function deleteAccount(formData: FormData) {
    "use server";
    const s = await auth();
    const langParam = String(formData.get("lang") ?? lang);
    if (!s?.user) redirect(`/${langParam}/login`);
    const confirm = String(formData.get("confirm") ?? "");
    if (confirm !== "DELETE") redirect(`/${langParam}/account?error=confirm`);
    await prisma.user.delete({ where: { id: s.user.id } });
    await signOut({ redirect: false });
    redirect(`/${langParam}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <BrandedHeader lang={lang}>
        <LanguageSwitcher current={lang} compact />
        <Link
          href={`/${lang}`}
          className="text-sm px-3 py-2 text-[#666666] hover:text-[#1A1A1A] transition-colors"
        >
          ← Home
        </Link>
      </BrandedHeader>
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">{dict.account.title}</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">{user.email}</p>
        </header>

        {sp?.saved && <div className="rounded-xl bg-[var(--success)]/10 text-[var(--success)] px-4 py-2 text-sm border border-[var(--success)]/20">{dict.account.saved}</div>}
        {sp?.error === "wrong" && <div className="rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] px-4 py-2 text-sm border border-[var(--danger)]/20">{dict.account.wrongPassword}</div>}
        {sp?.error === "short" && <div className="rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] px-4 py-2 text-sm border border-[var(--danger)]/20">{dict.account.passwordTooShort}</div>}

        <Card>
          <form action={changePassword} className="space-y-3">
            <input type="hidden" name="lang" value={lang} />
            <h2 className="text-lg font-semibold">{dict.account.changePassword}</h2>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.account.currentPassword}</span>
              <input type="password" name="current" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.account.newPassword}</span>
              <input type="password" name="next" minLength={6} required className={inputCls} />
            </label>
            <Button type="submit">{dict.coach.save}</Button>
          </form>
        </Card>

        <Card className="bg-[var(--danger)]/5 border-[var(--danger)]/30">
          <form action={deleteAccount} className="space-y-3">
            <input type="hidden" name="lang" value={lang} />
            <h2 className="text-lg font-semibold text-[var(--danger)]">{dict.account.deleteAccount}</h2>
            <p className="text-sm text-[var(--danger)]">{dict.account.deleteWarning}</p>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.account.deleteConfirm}</span>
              <input name="confirm" placeholder="DELETE" className={inputCls} />
            </label>
            <Button type="submit" variant="danger">{dict.account.deleteAccount}</Button>
          </form>
        </Card>

        <Card className="bg-[#F5F5F5] border-[#E5E5E5]">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Log Out</h2>
            <p className="text-sm text-[#666666]">You can log back in anytime with your credentials.</p>
            <AccountLogoutButton lang={lang} />
          </div>
        </Card>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
