import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !session.user.roles?.includes("COACH")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  if (!coach) return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  const program = await prisma.program.findFirst({
    where: { id, athlete: { coachProfileId: coach.id } },
    include: { documents: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!program || program.documents.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const doc = program.documents[0];
  // Always serve as plain text — original bytes aren't stored, just the extracted plain text.
  const filename = (doc.filename ?? `program-${id}`).replace(/\.[^.]+$/, "") + ".txt";

  return new NextResponse(doc.rawText, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
