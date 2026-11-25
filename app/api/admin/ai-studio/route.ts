import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isStudioOwner } from "@/lib/ai-studio-auth";
import { generateDailyDraft } from "@/lib/ai-studio";

export const runtime = "nodejs";
export const maxDuration = 200;

function cronAuthorized(request: Request): boolean {
  const secret = process.env.AGON_STUDIO_CRON_SECRET;
  if (process.env.AGON_STUDIO_AUTOMATION !== "true" || !secret || secret.length < 32) return false;
  const expected = Buffer.from("Bearer " + secret);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  try {
    if (!cronAuthorized(request)) {
      if (!request.headers.get("content-type")?.startsWith("application/json") ||
          request.headers.get("sec-fetch-site") !== "same-origin" ||
          !(await isStudioOwner())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const result = await generateDailyDraft();
    return NextResponse.json(result, { status: result.status === "FAILED" ? 503 : 200 });
  } catch {
    return NextResponse.json({ error: "Studio temporarily unavailable" }, { status: 503 });
  }
}
