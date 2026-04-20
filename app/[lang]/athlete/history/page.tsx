import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";

export default async function AthleteHistory({ params }: PageProps<"/[lang]/athlete/history">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();

  const athlete = await prisma.athlete.findUnique({ where: { userId: session!.user.id } });
  const assignments = await prisma.assignment.findMany({
    where: { athleteId: athlete!.id },
    orderBy: { date: "desc" },
    include: { workout: true, log: true },
    take: 60,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{dict.nav.history}</h1>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {assignments.map((a) => (
          <li key={a.id} className="px-4 py-3 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{a.workout.title}</div>
              <div className="text-xs text-zinc-500">{a.date.toISOString().slice(0, 10)}</div>
            </div>
            <span className={a.log ? "text-green-600" : "text-zinc-500"}>
              {a.log ? dict.athlete.completed : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
