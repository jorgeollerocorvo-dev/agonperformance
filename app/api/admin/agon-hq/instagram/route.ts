import { NextResponse } from "next/server";
import { requireHqOwner } from "@/lib/agon-hq-owner";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await requireHqOwner();
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const token = process.env.AGON_HQ_INSTAGRAM_TOKEN?.trim();
  if (!token) return reply({ connected: false, message: "Authorize the AGON professional account in Meta and configure its token in Railway." });
  const version = process.env.AGON_HQ_INSTAGRAM_API_VERSION ?? "v27.0";
  if (!/^v\d{2}\.\d$/.test(version)) return reply({ connected: false, message: "Invalid Instagram API version." }, 503);
  try {
    const res = await fetch("https://graph.instagram.com/" + version + "/me?fields=user_id,username", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return reply({ connected: false, message: "Meta rejected the profile request; verify token, permissions and API version.", metaStatus: res.status }, 503);
    const data = await res.json() as { username?: string; user_id?: string };
    if (data.username?.toLowerCase() !== "agonperformanceqa" || !data.user_id) return reply({ connected: false, message: "The token does not verify the expected AGON account." }, 409);
    return reply({ connected: true, username: data.username, message: "Profile access verified. Publishing permission and media delivery are not tested." });
  } catch {
    return reply({ connected: false, message: "Instagram connection could not be verified." }, 503);
  }
}
