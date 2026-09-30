import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsPDF } from "jspdf";

/**
 * Program → PDF export. Renders each session as a block on a single flowing
 * page (portrait), 12pt title, 10pt body. Zero external service — jspdf runs
 * server-side, no fonts fetched.
 *
 * Access: any coach who owns the program, OR the athlete whose program it is.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      athlete: { select: { fullName: true, coachProfileId: true, userId: true } },
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          sessions: {
            orderBy: { date: "asc" },
            include: {
              blocks: {
                orderBy: { order: "asc" },
                include: { movements: { orderBy: { order: "asc" }, include: { movement: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!program) return new NextResponse("Not found", { status: 404 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id } });
  const isCoach = coach && coach.id === program.athlete.coachProfileId;
  const isOwner = program.athlete.userId === session.user.id;
  if (!isCoach && !isOwner) return new NextResponse("Forbidden", { status: 403 });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const ensureRoom = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(program.title, margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${program.athlete.fullName} · ${program.startDate.toISOString().slice(0, 10)}`, margin, y);
  doc.setTextColor(0);
  y += 8;

  for (const w of program.weeks) {
    ensureRoom(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(w.weekLabel ?? `Week ${w.weekNumber}`, margin, y);
    y += 6;

    for (const s of w.sessions) {
      ensureRoom(10 + s.blocks.length * 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const dateStr = s.date.toISOString().slice(0, 10);
      doc.text(`${dateStr}${s.focus ? ` — ${s.focus}` : ""}`, margin, y);
      y += 5;

      for (const b of s.blocks) {
        ensureRoom(6 + b.movements.length * 5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`${b.blockCode ?? "•"}${b.label ? " " + b.label : ""}`, margin + 2, y);
        y += 4.5;
        doc.setFont("helvetica", "normal");
        for (const m of b.movements) {
          ensureRoom(4.5);
          const name = m.movement?.nameEn ?? m.customName ?? "";
          const p = (m.prescription ?? {}) as Record<string, unknown>;
          const parts: string[] = [];
          if (p.sets) parts.push(`${p.sets} sets`);
          if (p.reps) parts.push(`${p.reps} reps`);
          if (p.load) parts.push(`@ ${p.load}`);
          if (p.rest) parts.push(`rest ${p.rest}`);
          const line = `  · ${name}${parts.length ? " — " + parts.join(", ") : ""}`;
          const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
          doc.text(lines, margin + 2, y);
          y += 4.5 * lines.length;
          if (p.notes) {
            const noteLines = doc.splitTextToSize(`    ${p.notes}`, pageWidth - margin * 2);
            doc.setTextColor(100);
            doc.text(noteLines, margin + 2, y);
            doc.setTextColor(0);
            y += 4 * noteLines.length;
          }
        }
        y += 1;
      }
      y += 2;
    }
    y += 3;
  }

  const buf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${program.title.replace(/[^a-z0-9]+/gi, "_")}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
