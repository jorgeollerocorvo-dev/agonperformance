import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";

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
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href={`/${lang}`} className="font-semibold">{dict.brand}</Link>
          <span className="ml-auto text-sm">{dict.account.title}</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 space-y-6">
        <section>
          <h1 className="text-2xl font-semibold">{dict.account.title}</h1>
          <p className="text-sm text-zinc-500 mt-1">{user.email}</p>
        </section>

        {sp?.saved && <div className="rounded-md bg-green-50 text-green-900 px-3 py-2 text-sm">{dict.account.saved}</div>}
        {sp?.error === "wrong" && <div className="rounded-md bg-red-50 text-red-900 px-3 py-2 text-sm">{dict.account.wrongPassword}</div>}
        {sp?.error === "short" && <div className="rounded-md bg-red-50 text-red-900 px-3 py-2 text-sm">{dict.account.passwordTooShort}</div>}

        <form action={changePassword} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
          <h2 className="text-lg font-medium">{dict.account.changePassword}</h2>
          <label className="block text-sm">
            <span className="mb-1 block">{dict.account.currentPassword}</span>
            <input type="password" name="current" required className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{dict.account.newPassword}</span>
            <input type="password" name="next" minLength={6} required className={inputCls} />
          </label>
          <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">{dict.coach.save}</button>
        </form>

        <form action={deleteAccount} className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 space-y-3">
          <h2 className="text-lg font-medium text-red-900 dark:text-red-300">{dict.account.deleteAccount}</h2>
          <p className="text-sm text-red-800 dark:text-red-300">{dict.account.deleteWarning}</p>
          <label className="block text-sm">
            <span className="mb-1 block">{dict.account.deleteConfirm}</span>
            <input name="confirm" placeholder="DELETE" className={inputCls} />
          </label>
          <button className="rounded-md bg-red-700 text-white px-4 py-2">{dict.account.deleteAccount}</button>
        </form>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800";
