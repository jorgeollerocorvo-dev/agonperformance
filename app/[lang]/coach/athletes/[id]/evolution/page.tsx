import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../../../../dictionaries";
import { Card } from "@/components/ui/Card";
import EvolutionChart from "@/components/EvolutionChart";
import { loadAthleteEvolution } from "@/lib/athlete-evolution";

export default async function AthleteEvolutionPage({ params }: PageProps<"/[lang]/coach/athletes/[id]/evolution">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session!.user.id } });
  if (!coach) notFound();

  const athlete = await prisma.athlete.findFirst({
    where: { id, coachProfileId: coach.id },
    select: { id: true, fullName: true },
  });
  if (!athlete) notFound();

  const series = await loadAthleteEvolution(id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">{athlete.fullName}</h1>
          <p className="text-sm text-[var(--ink-muted)]">Evolución de movimientos</p>
        </div>
        <Link href={`/${lang}/coach/athletes/${id}`} className="text-sm text-[var(--primary)] hover:underline">← Perfil</Link>
      </header>

      <Card>
        <div className="text-xs text-[var(--ink-muted)] mb-3">
          Pesos levantados y tiempos de los movimientos más comunes de CrossFit. Las pestañas organizan los benchmarks estándar (The Girls, Heroes, lifts olímpicos, cardio, gimnasia) y "Otros" muestra todo lo demás que el atleta ha registrado.
        </div>
        <EvolutionChart series={series} />
      </Card>
    </div>
  );
}
