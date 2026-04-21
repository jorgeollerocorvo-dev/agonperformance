import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";

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
      <h1 className="text-2xl font-semibold">{dict.nav.programs}</h1>
      {programs.length === 0 ? (
        <p className="text-sm text-zinc-500">No programs yet. Import a JSON or create one from an athlete's page.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {programs.map((p) => (
            <li key={p.id}>
              <Link href={`/${lang}/coach/programs/${p.id}`} className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-400">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {p.athlete.fullName} · {p.durationWeeks ?? p._count.weeks} weeks · starts {p.startDate.toISOString().slice(0, 10)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
