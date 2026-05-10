import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/sync-videos
 *
 * Admin endpoint to:
 * 1. Verify all locked videos are saved
 * 2. Verify all unlocked videos are saved
 * 3. Ensure all programs reference movements with videos
 *
 * Returns:
 * - Movement status (locked, with video, no video)
 * - Program sync status
 * - Summary of what needs action
 */

interface SyncResult {
  movements: {
    total: number;
    withVideo: number;
    locked: number;
    noVideo: number;
    details: Array<{
      code: string;
      name: string;
      status: "locked" | "has-video" | "no-video";
      videoUrl?: string;
    }>;
  };
  programs: {
    total: number;
    withSyncedVideos: number;
    withoutVideos: number;
    details: Array<{
      athleteName: string;
      programTitle: string;
      movementsWithVideo: number;
      movementsWithoutVideo: number;
      movements: Array<{
        code: string;
        status: "locked" | "has-video" | "no-video";
      }>;
    }>;
  };
  summary: {
    action_required: boolean;
    missing_videos: string[];
    recommendations: string[];
  };
}

export async function POST(req: Request): Promise<NextResponse<SyncResult | { error: string }>> {
  const session = await auth();

  // Only allow Jorge (the coach)
  if (!session?.user?.email || !session.user.email.includes("jorge")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Get all movements and their video status
    const movements = await prisma.movement.findMany({
      orderBy: [{ category: "asc" }, { nameEn: "asc" }],
    });

    let withVideo = 0;
    let locked = 0;
    let noVideo = 0;
    const movementDetails: SyncResult["movements"]["details"] = [];

    movements.forEach((m) => {
      let status: "locked" | "has-video" | "no-video";
      if (m.videoLocked) {
        status = "locked";
        locked++;
      } else if (m.videoUrl) {
        status = "has-video";
        withVideo++;
      } else {
        status = "no-video";
        noVideo++;
      }

      movementDetails.push({
        code: m.code,
        name: m.nameEn,
        status,
        videoUrl: m.videoUrl || undefined,
      });
    });

    // Step 2: Check all programs and their movement videos
    const programs = await prisma.program.findMany({
      include: {
        athlete: true,
        weeks: {
          include: {
            sessions: {
              include: {
                blocks: {
                  include: {
                    movements: {
                      include: {
                        movement: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const programDetails: SyncResult["programs"]["details"] = [];
    let programsWithSyncedVideos = 0;

    for (const program of programs) {
      const allMovements: Array<{
        code: string;
        status: "locked" | "has-video" | "no-video";
      }> = [];
      let movementsWithVideo = 0;
      let movementsWithoutVideo = 0;

      // Collect all movements from all blocks in all sessions
      for (const week of program.weeks) {
        for (const session of week.sessions) {
          for (const block of session.blocks) {
            for (const movement of block.movements) {
              if (!movement.movement) continue; // Custom movement

              let status: "locked" | "has-video" | "no-video";
              if (movement.movement.videoLocked) {
                status = "locked";
              } else if (movement.movement.videoUrl) {
                status = "has-video";
                movementsWithVideo++;
              } else {
                status = "no-video";
                movementsWithoutVideo++;
              }

              allMovements.push({
                code: movement.movement.code,
                status,
              });
            }
          }
        }
      }

      if (allMovements.length > 0) {
        programDetails.push({
          athleteName: program.athlete.displayName || program.athlete.fullName,
          programTitle: program.title,
          movementsWithVideo,
          movementsWithoutVideo,
          movements: allMovements,
        });

        if (movementsWithoutVideo === 0) {
          programsWithSyncedVideos++;
        }
      }
    }

    // Step 3: Generate recommendations
    const missing_videos = movementDetails
      .filter((m) => m.status === "no-video")
      .map((m) => m.code);
    const recommendations: string[] = [];

    if (missing_videos.length > 0) {
      recommendations.push(
        `${missing_videos.length} movements need videos: ${missing_videos.slice(0, 3).join(", ")}${missing_videos.length > 3 ? "..." : ""}`
      );
      recommendations.push("Run the movement video resolver script to auto-populate missing videos");
    }

    if (locked > 0) {
      recommendations.push(`${locked} movements are locked (protected from auto-update)`);
    }

    recommendations.push(
      `All ${programs.length} programs have movement references synced from Movement library`
    );

    const result: SyncResult = {
      movements: {
        total: movements.length,
        withVideo,
        locked,
        noVideo,
        details: movementDetails,
      },
      programs: {
        total: programs.length,
        withSyncedVideos: programsWithSyncedVideos,
        withoutVideos: programs.length - programsWithSyncedVideos,
        details: programDetails,
      },
      summary: {
        action_required: noVideo > 0 || movementDetails.filter(m => m.status === "no-video" && !m.status.includes("locked")).length > 0,
        missing_videos,
        recommendations,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync videos error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
