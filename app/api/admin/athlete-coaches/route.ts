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
      coachProfile: {
        select: {
          id: true,
          user: { select: { fullName: true, displayName: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({
    count: athletes.length,
    athletes: athletes.map((a) => ({
      id: a.id,
      name: a.fullName,
      email: a.email,
      coach: {
        id: a.coachProfile?.id ?? null,
        name: a.coachProfile?.user.displayName ?? a.coachProfile?.user.fullName ?? null,
        email: a.coachProfile?.user.email ?? null,
      },
    })),
  });
}
