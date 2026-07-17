import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";

/**
 * GET /api/admin/program-detail?id=<programId>
 *   → Full tree for a single program (weeks → sessions → blocks → movements)
 *     so we can diagnose 'my workout doesn't appear'.
 * Jorge-only, read-only.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const programId = (url.searchParams.get("id") ?? "").trim();
  if (!programId) {
    return NextResponse.json({ error: "missing ?id=" }, { status: 400 });
  }

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      athlete: { select: { id: true, fullName: true } },
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          sessions: {
            orderBy: { date: "asc" },
            include: {
              blocks: {
                orderBy: { order: "asc" },
                include: {
                  movements: {
                    orderBy: { order: "asc" },
                    include: { movement: { select: { nameEn: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!program) {
    return NextResponse.json({ error: "program not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: program.id,
    title: program.title,
    goal: program.goal,
    athlete: program.athlete,
    startDate: program.startDate.toISOString().slice(0, 10),
    endDate: program.endDate ? program.endDate.toISOString().slice(0, 10) : null,
    durationWeeks: program.durationWeeks,
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
    weeks: program.weeks.map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      weekLabel: w.weekLabel,
      sessionsCount: w.sessions.length,
      sessions: w.sessions.map((s) => ({
        id: s.id,
        date: s.date.toISOString().slice(0, 10),
        day: s.day,
        focus: s.focus,
        intensity: s.intensity,
        notes: s.notes,
        coJointKey: s.coJointKey,
        blocksCount: s.blocks.length,
        blocks: s.blocks.map((b) => ({
          blockCode: b.blockCode,
          label: b.label,
          format: b.format,
          movementsCount: b.movements.length,
          movements: b.movements.map((m) => {
            const p = (m.prescription ?? {}) as Record<string, unknown>;
            return {
              name: m.customName ?? m.movement?.nameEn ?? "(unnamed)",
              sets: p.sets ?? null,
              reps: p.reps ?? null,
              load: p.load ?? null,
              rest: p.rest ?? null,
              notes: p.notes ?? null,
            };
          }),
        })),
      })),
    })),
  });
}
