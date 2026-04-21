import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card } from "@/components/ui/Card";

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
        <Card><p className="text-sm text-[var(--ink-muted)]">{dict.athlete.noWorkout}</p></Card>
      ) : (
        <Card padded={false} className="divide-y divide-[var(--border)]">
          {sessions.map((s) => (
            <Link key={s.id} href={`/${lang}/athlete/session/${s.id}`} className="flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-[var(--surface-2)]">
              <div>
                <div className="font-semibold">{s.programWeek.program.title} · {s.day}</div>
                <div className="text-xs text-[var(--ink-muted)] mt-0.5">{s.date.toISOString().slice(0, 10)}{s.focus ? ` · ${s.focus}` : ""}</div>
              </div>
              <span className={`text-sm ${s.sessionLog ? "text-[var(--success)]" : "text-[var(--ink-subtle)]"}`}>
                {s.sessionLog ? dict.athlete.completed : "—"}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
