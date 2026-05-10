import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { findBestYoutubeVideo } from "@/lib/youtube-search";

/**
 * POST /api/admin/resolve-videos
 *
 * Admin endpoint to resolve missing movement videos.
 * Walks through each movement without a videoUrl and finds the best YouTube video.
 * Skips locked movements (videoLocked: true).
 *
 * Query params:
 * - ?dryRun=true — just report what would be updated, don't actually save
 * - ?limit=10 — limit to first N movements
 */

const DELAY_MS = 1000; // Delay between YouTube API calls to avoid rate limiting
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface ResolveResult {
  total_checked: number;
  resolved: number;
  skipped: number;
  missed: number;
  locked_skipped: number;
  duration_seconds: number;
  movements: Array<{
    code: string;
    name: string;
    status: "resolved" | "skipped" | "missed" | "locked";
    videoUrl?: string;
  }>;
  dry_run: boolean;
}

export async function POST(req: Request): Promise<NextResponse<ResolveResult | { error: string }>> {
  const session = await auth();

  // Only allow Jorge (the coach)
  if (!session?.user?.email || !session.user.email.includes("jorge")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "true";
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit") as string) : undefined;

  const startTime = Date.now();

  try {
    // Get movements that need videos (not locked, no videoUrl)
    let query = prisma.movement.findMany({
      where: { isActive: true, videoUrl: null, videoLocked: false },
      orderBy: [{ category: "asc" }, { nameEn: "asc" }],
    });

    const todo = limit ? await (query as any).then((items: any[]) => items.slice(0, limit)) : await query;

    const movements: ResolveResult["movements"] = [];
    let resolved = 0;
    let missed = 0;

    for (let i = 0; i < todo.length; i++) {
      const m = todo[i];
      const t0 = Date.now();

      // Rotate User-Agent to avoid rate limiting
      process.env.YT_USER_AGENT = USER_AGENTS[i % USER_AGENTS.length];

      try {
        const url = await findBestYoutubeVideo(`${m.nameEn} exercise demo`);

        if (url) {
          if (!dryRun) {
            await prisma.movement.update({
              where: { id: m.id },
              data: { videoUrl: url },
            });
          }
          resolved++;
          movements.push({
            code: m.code,
            name: m.nameEn,
            status: "resolved",
            videoUrl: url,
          });
        } else {
          missed++;
          movements.push({
            code: m.code,
            name: m.nameEn,
            status: "missed",
          });
        }
      } catch (error) {
        missed++;
        movements.push({
          code: m.code,
          name: m.nameEn,
          status: "missed",
        });
      }

      // Rate limit the YouTube API calls
      const tookThisRow = Date.now() - t0;
      if (tookThisRow < DELAY_MS) {
        await sleep(DELAY_MS - tookThisRow);
      }
    }

    // Get count of locked movements
    const locked = await prisma.movement.count({
      where: { videoLocked: true },
    });

    const duration = (Date.now() - startTime) / 1000;

    const result: ResolveResult = {
      total_checked: todo.length,
      resolved,
      skipped: 0,
      missed,
      locked_skipped: locked,
      duration_seconds: duration,
      movements,
      dry_run: dryRun,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Resolve videos error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
