import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";

export default async function ProgramsPage({ params }: PageProps<"/[lang]/coach/programs">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: session!.user.id } });

  const programs = await prisma.program.findMany({
    where: { athlete: { coachProfileId: coachProfile!.id } },
    include: { athlete: true, _count: { select: { weeks: true } } },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">{dict.nav.programs}</h1>
        <Link href={`/${lang}/coach/programs/new`}>
          <Button>+ {dict.coach.newProgram}</Button>
        </Link>
      </header>
      {programs.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--ink-muted)]">No programs yet.</p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <li key={p.id}>
              <Link href={`/${lang}/coach/programs/${p.id}`}>
                <Card hover>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-[var(--ink-muted)] mt-1">
                    {p.athlete.fullName} · {p.durationWeeks ?? p._count.weeks} weeks
                  </div>
                  <div className="text-xs text-[var(--ink-subtle)] mt-0.5">
                    starts {p.startDate.toISOString().slice(0, 10)}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
