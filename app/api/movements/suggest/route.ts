import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCoachProfile } from "@/lib/get-coach-profile";
import { searchMovementsForCoach } from "@/lib/coach-movements";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 1) return NextResponse.json([]);

  // Get coach profile if user is a coach
  const coach = await getCoachProfile(session);

  let matches;

  if (coach) {
    // Coach logged in: search hybrid (coach-specific + global)
    matches = await searchMovementsForCoach(coach.id, q);
  } else {
    // Athlete or unauthenticated: global only
    matches = await prisma.movement.findMany({
      where: {
        isActive: true,
        OR: [
          { nameEn: { contains: q, mode: "insensitive" } },
          { nameEs: { contains: q, mode: "insensitive" } },
          { nameAr: { contains: q, mode: "insensitive" } },
          { code: { contains: q.replace(/\s+/g, "_"), mode: "insensitive" } },
        ],
      },
      take: 12,
      orderBy: [{ category: "asc" }, { nameEn: "asc" }],
    });
  }

  return NextResponse.json(
    matches.slice(0, 12).map((m) => ({
      id: m.id,
      code: m.code,
      label: m.nameEn,
      labelEs: m.nameEs ?? undefined,
      labelAr: m.nameAr ?? undefined,
      category: m.category ?? undefined,
      source: (m as any)._type || "global", // indicate if coach-specific or global
    })),
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
