import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/fix-athlete-links
 *
 * For Jorge only. Finds all athletes with userId but no AthleteLink,
 * and creates the missing links. This is a maintenance endpoint to fix
 * athletes that were created before AthleteLink auto-creation was implemented.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isJorge(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Find all athletes with userId but no active AthleteLink
    const athletesWithoutLink = await prisma.athlete.findMany({
      where: {
        userId: { not: null },
      },
      include: {
        athleteLinks: {
          where: { active: true },
        },
      },
    });

    const athletesNeedingLink = athletesWithoutLink.filter(
      (a) => a.userId && a.athleteLinks.length === 0
    );

    // Create missing links
    let fixed = 0;
    for (const athlete of athletesNeedingLink) {
      if (!athlete.userId) continue; // Should not happen due to filter, but be safe

      try {
        await prisma.athleteLink.create({
          data: {
            userId: athlete.userId,
            athleteId: athlete.id,
            active: true,
          },
        });
        fixed++;
      } catch (error) {
        // Silently skip if link already exists (race condition)
        if ((error as Error).message.includes("Unique constraint")) {
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      fixed,
      total: athletesNeedingLink.length,
      message: `Created ${fixed} missing AthleteLink records for athletes`,
    });
  } catch (error) {
    console.error("Fix athlete links error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
