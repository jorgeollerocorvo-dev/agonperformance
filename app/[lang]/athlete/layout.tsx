// Every athlete-facing view must render fresh on every request — coaches edit
// programs from another tab and we can't afford to serve stale HTML from the
// Full Route Cache. Setting dynamic here propagates to every page under
// /[lang]/athlete/*.
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { hasRole } from "@/lib/roles";
import { getDictionary, hasLocale } from "../dictionaries";
import HomeLink from "@/components/HomeLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MobileMenu, { type MobileMenuItem } from "@/components/MobileMenu";

export default async function AthleteLayout({
  children,
  params,
}: LayoutProps<"/[lang]/athlete">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!Array.isArray(session.user.roles) || session.user.roles.length === 0) {
    redirect(`/${lang}/login`);
  }
  if (!hasRole(session, "CLIENT")) redirect(`/${lang}/coach`);

  const dict = await getDictionary(lang);

  const navLink = "px-3 py-1.5 rounded-full text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]";

  // Resolve the athlete's coach WhatsApp link once per request so the nav
  // can point directly to wa.me — in-app messages were removed per product
  // decision, every "talk to coach" CTA now opens WhatsApp.
  let whatsappHref: string | null = null;
  if (session?.user?.id) {
    const { prisma } = await import("@/lib/prisma");
    const { getCoachWhatsAppUrlForAthlete } = await import("@/lib/whatsapp-link");
    const direct = await prisma.athlete.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    const athleteId = direct?.id ?? (await prisma.athleteLink.findFirst({ where: { userId: session.user.id, active: true }, select: { athleteId: true } }))?.athleteId ?? null;
    if (athleteId) whatsappHref = await getCoachWhatsAppUrlForAthlete(athleteId);
  }

  // Lean nav: Today + Calendar + WhatsApp (external) + Account.
  const items: MobileMenuItem[] = [
    { href: `/${lang}/athlete`, label: dict.nav.today },
    { href: `/${lang}/athlete/calendar`, label: dict.nav.calendar ?? "Calendar" },
    { href: whatsappHref ?? `/${lang}/athlete/talk`, label: "WhatsApp" },
    { href: `/${lang}/account`, label: dict.nav.account },
  ];

  const logoutForm = (
    <form action={async () => { "use server"; await signOut({ redirect: false }); }}>
      <button className="w-full text-start text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] px-2 py-2">
        {dict.nav.logout}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--border)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <HomeLink href={`/${lang}`} label="Home" />
          <Link href={`/${lang}/athlete`} className="font-semibold tracking-tight">{dict.brand}</Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-1">
            <Link href={`/${lang}/athlete`} className={navLink}>{dict.nav.today}</Link>
            <Link href={`/${lang}/athlete/calendar`} className={navLink}>{dict.nav.calendar ?? "Calendar"}</Link>
            {whatsappHref ? (
              <a href={whatsappHref} target="_blank" rel="noreferrer" className={navLink}>💚 WhatsApp</a>
            ) : (
              <Link href={`/${lang}/athlete/talk`} className={navLink}>💚 WhatsApp</Link>
            )}
            <Link href={`/${lang}/account`} className={navLink}>{dict.nav.account}</Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher current={lang} compact />
            <form action={async () => { "use server"; await signOut({ redirect: false }); }} className="hidden sm:block">
              <button className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] px-3 py-1.5">{dict.nav.logout}</button>
            </form>
            {/* Mobile hamburger */}
            <MobileMenu items={items} extraSlot={logoutForm} ariaLabel={dict.nav.menu ?? "Menu"} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-6 sm:py-10">{children}</main>
    </div>
  );
}
