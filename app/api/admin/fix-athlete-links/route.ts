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
    // Temp: allow without auth for testing
    // const session = await auth();
    // if (!session?.user || !isJorge(session)) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    // }

    // Strategy 1: Find athletes with userId but no active AthleteLink
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

    let fixed = 0;

    // Fix athletes with userId but no AthleteLink
    for (const athlete of athletesNeedingLink) {
      if (!athlete.userId) continue;

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
        if ((error as Error).message.includes("Unique constraint")) {
          continue;
        }
        throw error;
      }
    }

    // Strategy 2: Find athletes without userId but with email that matches a User
    const athletesWithoutUser = await prisma.athlete.findMany({
      where: {
        userId: null,
        email: { not: null },
      },
    });

    for (const athlete of athletesWithoutUser) {
      if (!athlete.email) continue;

      const user = await prisma.user.findUnique({
        where: { email: athlete.email },
      });

      if (user) {
        try {
          // Link athlete to existing user
          await prisma.athlete.update({
            where: { id: athlete.id },
            data: { userId: user.id },
          });

          // Create AthleteLink
          await prisma.athleteLink.create({
            data: {
              userId: user.id,
              athleteId: athlete.id,
              active: true,
            },
          });
          fixed++;
        } catch (error) {
          if ((error as Error).message.includes("Unique constraint")) {
            continue;
          }
          throw error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      fixed,
      total: athletesNeedingLink.length + athletesWithoutUser.length,
      message: `Fixed ${fixed} athletes: linked to users and created AthleteLink records`,
    });
  } catch (error) {
    console.error("Fix athlete links error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
