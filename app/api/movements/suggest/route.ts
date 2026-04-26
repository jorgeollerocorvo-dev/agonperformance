import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 1) return NextResponse.json([]);

  // Match on any of the localized names + the snake_case code.
  // Postgres ILIKE is case-insensitive, fast on small tables.
  const matches = await prisma.movement.findMany({
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
    select: { id: true, code: true, nameEn: true, nameEs: true, nameAr: true, category: true },
  });

  return NextResponse.json(
    matches.map((m) => ({
      id: m.id,
      code: m.code,
      label: m.nameEn,
      labelEs: m.nameEs,
      labelAr: m.nameAr,
      category: m.category,
    })),
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
