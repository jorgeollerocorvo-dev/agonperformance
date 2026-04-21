import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import PublicHeader from "@/components/ui/PublicHeader";
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
    if (!s?.user) redirect(`/${lang}/login`);
    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("next") ?? "");
    if (next.length < 6) redirect(`/${lang}/account?error=short`);

    const u = await prisma.user.findUnique({ where: { id: s.user.id } });
    if (!u?.passwordHash) redirect(`/${lang}/account?error=no_password`);
    const ok = await bcrypt.compare(current, u.passwordHash);
    if (!ok) redirect(`/${lang}/account?error=wrong`);

    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(next, 10) },
    });
    redirect(`/${lang}/account?saved=1`);
  }

  async function deleteAccount(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user) redirect(`/${lang}/login`);
    const confirm = String(formData.get("confirm") ?? "");
    if (confirm !== "DELETE") redirect(`/${lang}/account?error=confirm`);
    await prisma.user.delete({ where: { id: s.user.id } });
    await signOut({ redirect: false });
    redirect(`/${lang}`);
  }

  return (
    <div className="min-h-screen">
      <PublicHeader lang={lang} brand={dict.brand} rightSlot={<span className="text-sm text-[var(--ink-muted)]">{dict.account.title}</span>} />
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
            <h2 className="text-lg font-semibold text-[var(--danger)]">{dict.account.deleteAccount}</h2>
            <p className="text-sm text-[var(--danger)]">{dict.account.deleteWarning}</p>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">{dict.account.deleteConfirm}</span>
              <input name="confirm" placeholder="DELETE" className={inputCls} />
            </label>
            <Button type="submit" variant="danger">{dict.account.deleteAccount}</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
