import { execFile } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { requireHqOwner } from "@/lib/agon-hq-owner";
import { hqDrafts } from "@/lib/agon-hq";

export const runtime = "nodejs";
export const maxDuration = 180;
let rendering = false;
const run = promisify(execFile);

export async function POST(request: Request) {
  await requireHqOwner();
  if (request.headers.get("sec-fetch-site") !== "same-origin") return new Response("Forbidden", { status: 403 });
  if (process.env.AGON_HQ_RENDER_ENABLED !== "true") return new Response("Rendering is disabled until FFmpeg is installed and tested.", { status: 503 });
  if (rendering) return new Response("Another preview is rendering.", { status: 409 });
  const day = new URL(request.url).searchParams.get("day") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return new Response("Invalid day", { status: 400 });
  rendering = true;
  let dir: string | undefined;
  try {
    const draft = (await hqDrafts()).find(d => d.day === day);
    if (!draft?.copy || draft.format !== "Reel") return new Response("Reel draft not found", { status: 404 });
    dir = await mkdtemp(join(tmpdir(), "agon-preview-"));
    const source = join(dir, "draft.json");
    const output = join(dir, "preview.mp4");
    await writeFile(source, JSON.stringify(draft));
    await run(process.execPath, [join(process.cwd(), "scripts/render-agon-hq.mjs"), source, output], { timeout: 150000, maxBuffer: 1024 * 1024 });
    if ((await stat(output)).size > 25 * 1024 * 1024) return new Response("Preview too large", { status: 413 });
    const bytes = await readFile(output);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "video/mp4", "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="agon-' + day + '-storyboard.mp4"',
    } });
  } catch {
    return new Response("Preview failed. Check FFmpeg and renderer configuration.", { status: 503 });
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
    rendering = false;
  }
}
