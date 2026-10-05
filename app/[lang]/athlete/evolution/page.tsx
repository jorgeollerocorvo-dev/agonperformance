import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../../dictionaries";
import { Card } from "@/components/ui/Card";
import EvolutionChart from "@/components/EvolutionChart";
import { loadAthleteEvolution } from "@/lib/athlete-evolution";

export default async function AthleteEvolutionPage({ params }: PageProps<"/[lang]/athlete/evolution">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login?next=${encodeURIComponent(`/${lang}/athlete/evolution`)}`);

  // Same resolution as session actions — direct relation OR active link.
  let athleteId: string | null = null;
  const direct = await prisma.athlete.findUnique({ where: { userId: session.user.id }, select: { id: true, fullName: true } });
  let athleteName = "";
  if (direct) {
    athleteId = direct.id;
    athleteName = direct.fullName;
  } else {
    const link = await prisma.athleteLink.findFirst({
      where: { userId: session.user.id, active: true },
      include: { athlete: { select: { id: true, fullName: true } } },
    });
    if (link?.athlete) {
      athleteId = link.athlete.id;
      athleteName = link.athlete.fullName;
    }
  }
  if (!athleteId) notFound();

  const series = await loadAthleteEvolution(athleteId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <header>
        <h1 className="text-2xl font-bold">Tu evolución</h1>
        <p className="text-sm text-[var(--ink-muted)]">PRs y tiempos de {athleteName}</p>
      </header>

      <Card>
        <div className="text-xs text-[var(--ink-muted)] mb-3">
          Tus pesos y tiempos en los movimientos de CrossFit. Para que aparezcan aquí, anótalos en el formulario "Lo que has hecho" dentro de cada sesión.
        </div>
        <EvolutionChart series={series} />
      </Card>

      <div className="text-xs text-center text-[var(--ink-muted)]">
        <Link href={`/${lang}/athlete`} className="hover:underline">← Calendario</Link>
      </div>
    </div>
  );
}
