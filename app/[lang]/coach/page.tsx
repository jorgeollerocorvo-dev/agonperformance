import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";

export default async function CoachDashboard({ params }: PageProps<"/[lang]/coach">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: session!.user.id },
    include: {
      athletes: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { athletes: true } },
    },
  });

  if (!coachProfile) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{dict.coach.dashboard}</h1>
        <p className="text-sm text-zinc-500">Coach profile not found.</p>
      </div>
    );
  }

  const programCount = await prisma.program.count({
    where: { athlete: { coachProfileId: coachProfile.id } },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold">{dict.coach.dashboard}</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card label={dict.nav.athletes} value={coachProfile._count.athletes} href={`/${lang}/coach/athletes`} />
        <Card label={dict.nav.programs} value={programCount} href={`/${lang}/coach/programs`} />
        <Card label={dict.coach.listingStatus} value={coachProfile.listingStatus} small />
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-medium">{dict.nav.athletes}</h2>
          <Link href={`/${lang}/coach/athletes`} className="text-sm text-zinc-500 hover:underline">{dict.coach.viewAll} →</Link>
        </div>
        {coachProfile.athletes.length === 0 ? (
          <p className="text-sm text-zinc-500">{dict.coach.noAthletes}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            {coachProfile.athletes.map((a) => (
              <li key={a.id}>
                <Link href={`/${lang}/coach/athletes/${a.id}`} className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <div className="font-medium">{a.fullName}</div>
                  <div className="text-xs text-zinc-500">
                    {[a.sex, a.age ? `${a.age} y/o` : null, a.division].filter(Boolean).join(" · ")}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ label, value, href, small }: { label: string; value: string | number; href?: string; small?: boolean }) {
  const body = (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={small ? "text-sm font-medium mt-1" : "text-3xl font-semibold mt-1"}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
