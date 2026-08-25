import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";

/**
 * GET /api/admin/athlete-coaches
 *   → JSON list of every athlete with their assigned coach.
 *
 * GET /api/admin/athlete-coaches?name=shaima
 *   → Filter by athlete name (case-insensitive contains match).
 *
 * Jorge-only. Read-only. Used to confirm assignments and spot orphans
 * or misassignments.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "").trim();

  const athletes = await prisma.athlete.findMany({
    where: name
      ? { fullName: { contains: name, mode: "insensitive" } }
      : undefined,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      userId: true,
      activeProgramId: true,
      coachProfile: {
        select: {
          id: true,
          user: { select: { fullName: true, displayName: true, email: true } },
        },
      },
      user: { select: { id: true, email: true } },
      athleteLinks: { select: { userId: true, active: true } },
      programs: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          durationWeeks: true,
          createdAt: true,
          _count: { select: { weeks: true, documents: true } },
        },
      },
    },
  });

  return NextResponse.json({
    count: athletes.length,
    athletes: athletes.map((a) => {
      const activeLink = a.athleteLinks.some((l) => l.active && l.userId === a.userId);
      return {
      id: a.id,
      name: a.fullName,
      email: a.email,
      activeProgramId: a.activeProgramId,
      // Status flags — one glance to see if the athlete can log in and see workouts
      login: {
        hasUserRow: !!a.user,
        userEmail: a.user?.email ?? null,
        hasActiveAthleteLink: activeLink,
        canSeeWorkouts: !!a.user && activeLink,  // both must be true
      },
      coach: {
        id: a.coachProfile?.id ?? null,
        name: a.coachProfile?.user.displayName ?? a.coachProfile?.user.fullName ?? null,
        email: a.coachProfile?.user.email ?? null,
      },
      programs: a.programs.map((p) => ({
        id: p.id,
        title: p.title,
        startDate: p.startDate.toISOString().slice(0, 10),
        endDate: p.endDate ? p.endDate.toISOString().slice(0, 10) : null,
        durationWeeks: p.durationWeeks,
        weeksCount: p._count.weeks,
        documentsCount: p._count.documents,
        createdAt: p.createdAt.toISOString(),
      })),
      programsCount: a.programs.length,
    };
    }),
  });
}
