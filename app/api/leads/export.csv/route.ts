import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge, JORGE_INQUIRY_SOURCE } from "@/lib/jorge";

function csvEscape(v: string | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await auth();
  if (!isJorge(session)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const inquiries = await prisma.inquiry.findMany({
    where: { source: { startsWith: JORGE_INQUIRY_SOURCE } },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "createdAt", "status", "source",
    "name", "email", "phone", "instagram", "marketingConsent",
    "goal", "frequencyCurrent", "frequencyDesired", "ageRange", "gender",
    "preferredLocation", "preferredDaysAndTimes", "urgency", "budget",
    "injuryOrConcern", "notes",
  ];

  const lines = [headers.join(",")];
  for (const q of inquiries) {
    lines.push([
      q.createdAt.toISOString(),
      q.status,
      q.source ?? "",
      q.contactName ?? "",
      q.anonymousEmail ?? "",
      q.anonymousPhone ?? "",
      q.contactInstagram ?? "",
      q.marketingConsent ? "yes" : "no",
      q.goal ?? "",
      q.frequencyCurrent ?? "",
      q.frequencyDesired ?? "",
      q.ageRange ?? "",
      q.gender ?? "",
      q.preferredLocation ?? "",
      q.preferredDaysAndTimes ?? "",
      q.urgency ?? "",
      q.budget ?? "",
      q.injuryOrConcern ?? "",
      q.notes ?? "",
    ].map(csvEscape).join(","));
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${today}.csv"`,
    },
  });
}
