import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { requireHqOwner } from "@/lib/agon-hq-owner";
import { hqDrafts } from "@/lib/agon-hq";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireHqOwner();
  const url = new URL(request.url);
  const day = url.searchParams.get("day") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return new Response("Invalid date", { status: 400 });
  const draft = (await hqDrafts()).find(d => d.day === day);
  if (!draft?.copy) return new Response("Draft not available", { status: 404 });
  const kind = url.searchParams.get("kind");
  const headers = { "Cache-Control": "private, no-store" };
  if (kind === "json") return NextResponse.json(draft, { headers: {
    ...headers, "Content-Disposition": 'attachment; filename="agon-' + day + '.json"',
  } });
  if (kind !== "cover") return new Response("Invalid format", { status: 400 });
  const hook = draft.copy.hook;
  const reel = draft.format === "Reel";
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#1F3A5F", color: "#E8E1D6", padding: 84, justifyContent: "space-between", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: 4 }}>AGON PERFORMANCE</div>
        <div style={{ height: 12, width: 160, marginTop: 24, background: "#6B8F71" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ fontSize: 35, color: "#C6DAC8", textTransform: "uppercase" }}>{draft.topic}</div>
        <div style={{ fontSize: hook.length > 85 ? 64 : 84, fontWeight: 700, lineHeight: 1.14, overflowWrap: "break-word" }}>{hook}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ width: "100%", height: 3, background: "#6B8F71" }} />
        <div style={{ fontSize: 34, color: "#C6DAC8" }}>Train smarter. · Link in bio</div>
      </div>
    </div>,
    { width: 1080, height: reel ? 1920 : 1350, headers: {
      ...headers, "Content-Disposition": 'attachment; filename="agon-' + day + '-cover.png"',
    } }
  );
}
