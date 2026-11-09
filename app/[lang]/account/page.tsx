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
import AthleteHubSection, { type HubTab } from "@/components/AthleteHubSection";
import Tabs from "@/components/Tabs";

/**
 * Athlete account page — single surface with top-level tabs instead of the
 * previous long scroll that mixed profile, plan and settings.
 * URL param `?tab=overview|plan|progress|settings` picks the panel; default
 * is overview. Non-athlete users (coaches) only see the Settings panel.
 */
export default async function AccountPage({ params, searchParams }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  const sp = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect(`/${lang}/login`);

  // Athlete = direct User.athleteProfile OR an active AthleteLink.
  const direct = await prisma.athlete.findUnique({ where: { userId: user.id }, select: { id: true } });
  const link = direct ? null : await prisma.athleteLink.findFirst({ where: { userId: user.id, active: true }, select: { athleteId: true } });
  const isAthlete = !!direct || !!link;

  const tabParam = typeof sp?.tab === "string" ? sp.tab : "overview";
  const currentTab = ["overview", "plan", "progress", "settings"].includes(tabParam) ? tabParam : "overview";

  async function changePassword(formData: FormData) {
    "use server";
    const s = await auth();
    const langParam = String(formData.get("lang") ?? lang);
    if (!s?.user) redirect(`/${langParam}/login`);
    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("next") ?? "");
    if (next.length < 6) redirect(`/${langParam}/account?tab=settings&error=short`);

    const u = await prisma.user.findUnique({ where: { id: s.user.id } });
    if (!u?.passwordHash) redirect(`/${langParam}/account?tab=settings&error=no_password`);
    const ok = await bcrypt.compare(current, u.passwordHash);
    if (!ok) redirect(`/${langParam}/account?tab=settings&error=wrong`);

    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(next, 10) },
    });
    redirect(`/${langParam}/account?tab=settings&saved=1`);
  }

  async function deleteAccount(formData: FormData) {
    "use server";
    const s = await auth();
    const langParam = String(formData.get("lang") ?? lang);
    if (!s?.user) redirect(`/${langParam}/login`);
    const confirm = String(formData.get("confirm") ?? "");
    if (confirm !== "DELETE") redirect(`/${langParam}/account?tab=settings&error=confirm`);
    await prisma.user.delete({ where: { id: s.user.id } });
    await signOut({ redirect: false });
    redirect(`/${langParam}`);
  }

  // Non-athlete users only see Settings. Athletes get 4 tabs.
  const tabs = isAthlete
    ? [
        { id: "overview", label: "Resumen", icon: "👤" },
        { id: "plan", label: "Mi plan", icon: "🥗" },
        { id: "progress", label: "Progreso", icon: "📊" },
        { id: "settings", label: "Ajustes", icon: "⚙️" },
      ]
    : [{ id: "settings", label: dict.account.title, icon: "⚙️" }];

  const effectiveTab = isAthlete ? currentTab : "settings";

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <BrandedHeader lang={lang}>
        <LanguageSwitcher current={lang} compact />
        <Link
          href={`/${lang}`}
          className="text-sm px-3 py-2 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
        >
          ← Home
        </Link>
      </BrandedHeader>
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10 space-y-5">
        <header>
          <h1 className="text-3xl font-bold">{dict.account.title}</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">{user.email}</p>
        </header>

        <Tabs tabs={tabs} currentTab={effectiveTab} basePath={`/${lang}/account`} />

        {effectiveTab !== "settings" && isAthlete && (
          <div className="space-y-5">
            <AthleteHubSection userId={user.id} lang={lang} tab={effectiveTab as HubTab} />
          </div>
        )}

        {effectiveTab === "settings" && (
          <div className="space-y-5">
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

            <Card className="bg-[var(--surface-2)]">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Log Out</h2>
                <p className="text-sm text-[var(--ink-muted)]">You can log back in anytime with your credentials.</p>
                <AccountLogoutButton lang={lang} />
              </div>
            </Card>

            <details className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--danger)]">
                ⚠️ {dict.account.deleteAccount}
              </summary>
              <form action={deleteAccount} className="space-y-3 mt-3">
                <input type="hidden" name="lang" value={lang} />
                <p className="text-sm text-[var(--danger)]">{dict.account.deleteWarning}</p>
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--ink-muted)]">{dict.account.deleteConfirm}</span>
                  <input name="confirm" placeholder="DELETE" className={inputCls} />
                </label>
                <Button type="submit" variant="danger">{dict.account.deleteAccount}</Button>
              </form>
            </details>
          </div>
        )}
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
