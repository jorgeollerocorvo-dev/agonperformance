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

  const coach = await prisma.coach.findUnique({
    where: { userId: session!.user.id },
    include: {
      athletes: { include: { user: true } },
      programs: true,
    },
  });

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-2xl font-semibold">{dict.coach.dashboard}</h1>
          <p className="text-xs text-zinc-500">
            Invite code: <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{coach?.id}</code>
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">{dict.nav.athletes}</h2>
        </div>
        {coach?.athletes.length === 0 ? (
          <p className="text-sm text-zinc-500">{dict.coach.noAthletes}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            {coach?.athletes.map((a) => (
              <li key={a.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.user.name ?? a.user.email}</div>
                  <div className="text-xs text-zinc-500">{a.specialty}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">{dict.nav.programs}</h2>
          <Link
            href={`/${lang}/coach/programs`}
            className="text-sm rounded-md bg-zinc-900 text-white px-3 py-1.5 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
          >
            {dict.coach.newProgram}
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {coach?.programs.map((p) => (
            <li key={p.id}>
              <Link
                href={`/${lang}/coach/programs/${p.id}`}
                className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-400"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-zinc-500">{p.specialty}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
