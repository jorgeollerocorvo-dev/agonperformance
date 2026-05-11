import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { Card } from "@/components/ui/Card";
import CoachAthleteDetail from "@/components/CoachAthleteDetail";

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ lang: string; coachId: string }>;
}) {
  const { lang, coachId } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const session = await auth();

  // Only Jorge can access the Coaches Area
  if (!isJorge(session)) {
    notFound();
  }

  // Fetch coach with all their data - Jorge can see complete athlete details including all profile fields
  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachId },
    include: {
      user: true,
      athletes: {
        include: {
          user: { select: { id: true, email: true, displayName: true, passwordHash: true } }, // Include password hash status
          programs: {
            include: {
              weeks: { select: { id: true } },
            },
            orderBy: { startDate: "desc" },
          },
        },
        orderBy: { fullName: "asc" },
      },
      movements: {
        where: { isActive: true },
        orderBy: { nameEn: "asc" },
      },
    },
  });

  if (!coach) notFound();

  return (
    <div className="space-y-8">
      {/* Coach Header */}
      <section>
        <h1 className="text-3xl font-bold">{coach.user.displayName || "Coach"}</h1>
        {coach.user.email && (
          <p className="text-[var(--ink-muted)] mt-1">{coach.user.email}</p>
        )}
        <div className="text-sm text-[var(--ink-subtle)] mt-2 flex gap-4">
          <span>👥 {coach.athletes.length} athlete(s)</span>
          <span>📋 {coach.athletes.reduce((sum, a) => sum + a.programs.length, 0)} program(s)</span>
          <span>🎬 {coach.movements.length} custom movement(s)</span>
        </div>
      </section>

      {/* Custom Movements Section */}
      {coach.movements.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Custom Movements</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coach.movements.map((movement) => (
              <Card key={movement.id}>
                <div className="font-semibold text-sm">{movement.nameEn}</div>
                {movement.nameEs && (
                  <div className="text-xs text-[var(--ink-muted)]">{movement.nameEs}</div>
                )}
                {movement.nameAr && (
                  <div className="text-xs text-[var(--ink-muted)]">{movement.nameAr}</div>
                )}
                <div className="text-xs text-[var(--ink-subtle)] mt-2">
                  <code className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded">{movement.code}</code>
                </div>
                {movement.videoUrl && (
                  <a
                    href={movement.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--primary)] hover:underline mt-2 block"
                  >
                    View Video →
                  </a>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Athletes & Programs Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Athletes & Programs</h2>
        {coach.athletes.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--ink-muted)]">No athletes yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {coach.athletes.map((athlete) => (
              <CoachAthleteDetail key={athlete.id} athlete={athlete} lang={lang} coachId={coachId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
