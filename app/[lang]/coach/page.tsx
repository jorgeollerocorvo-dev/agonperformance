import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import { Card, StatCard, Pill, Button } from "@/components/ui/Card";

export default async function CoachDashboard({ params }: PageProps<"/[lang]/coach">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: session!.user.id },
    include: {
      user: true,
      athletes: { orderBy: { createdAt: "desc" }, take: 8 },
      _count: { select: { athletes: true } },
    },
  });

  if (!coachProfile) {
    return (
      <Card>
        <h1 className="text-2xl font-bold">{dict.coach.dashboard}</h1>
        <p className="text-sm text-[var(--ink-muted)]">Coach profile not found.</p>
      </Card>
    );
  }

  const programCount = await prisma.program.count({
    where: { athlete: { coachProfileId: coachProfile.id } },
  });
  const convoCount = await prisma.conversation.count({
    where: { coachUserId: session!.user.id },
  });

  const greeting = coachProfile.user.displayName ?? coachProfile.user.fullName ?? "Coach";
  const statusColor =
    coachProfile.listingStatus === "APPROVED" ? "success"
    : coachProfile.listingStatus === "DRAFT" ? "soft"
    : "primary";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--ink-muted)]">{dict.coach.hello}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{greeting}</h1>
        </div>
        <Pill color={statusColor}>{dict.coach.listingStatus}: {coachProfile.listingStatus}</Pill>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={dict.nav.athletes}
          value={coachProfile._count.athletes}
          href={`/${lang}/coach/athletes`}
          icon={<IconUsers />}
        />
        <StatCard
          label={dict.nav.programs}
          value={programCount}
          href={`/${lang}/coach/programs`}
          icon={<IconChart />}
        />
        <StatCard
          label={dict.nav.messages}
          value={convoCount}
          href={`/${lang}/messages`}
          icon={<IconChat />}
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-semibold">{dict.nav.athletes}</h2>
          <Link href={`/${lang}/coach/athletes`} className="text-sm text-[var(--primary)] hover:underline">{dict.coach.viewAll} →</Link>
        </div>
        {coachProfile.athletes.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--ink-muted)]">{dict.coach.noAthletes}</p>
            <div className="mt-3">
              <Link href={`/${lang}/coach/athletes`}>
                <Button>{dict.coach.addAthlete}</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coachProfile.athletes.map((a) => (
              <li key={a.id}>
                <Link href={`/${lang}/coach/athletes/${a.id}`} className="block">
                  <Card hover padded={false} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center font-semibold">
                      {a.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.fullName}</div>
                      <div className="text-xs text-[var(--ink-muted)] truncate">
                        {[a.sex, a.age ? `${a.age}` : null, a.division].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function IconUsers() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15 20c0-2.5 2-4.5 4.5-4.5"/></svg>; }
function IconChart() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 5-8"/></svg>; }
function IconChat() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 12a8 8 0 01-12.4 6.7L3 20l1.3-4.2A8 8 0 1121 12z"/></svg>; }
