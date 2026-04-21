import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";

export default async function AthleteHistory({ params }: PageProps<"/[lang]/athlete/history">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();

  const link = await prisma.athleteLink.findFirst({
    where: { userId: session!.user.id, active: true },
  });

  const sessions = link
    ? await prisma.programSession.findMany({
        where: { programWeek: { program: { athleteId: link.athleteId } } },
        include: { programWeek: { include: { program: true } }, sessionLog: true },
        orderBy: { date: "desc" },
        take: 60,
      })
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{dict.nav.history}</h1>
      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-500">{dict.athlete.noWorkout}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {sessions.map((s) => (
            <li key={s.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{s.programWeek.program.title} · {s.day}</div>
                <div className="text-xs text-zinc-500">{s.date.toISOString().slice(0, 10)} · {s.focus}</div>
              </div>
              <span className={s.sessionLog ? "text-green-600" : "text-zinc-500"}>
                {s.sessionLog ? dict.athlete.completed : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
