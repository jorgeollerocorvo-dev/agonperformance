import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const users = await p.user.count();
  const coaches = await p.coachProfile.count();
  const athletes = await p.athlete.count();
  const programs = await p.program.findMany({
    include: {
      athlete: { select: { fullName: true } },
      _count: { select: { weeks: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const docs = await p.programDocument.findMany({
    select: { id: true, programId: true, filename: true, source: true, createdAt: true, rawText: true },
    orderBy: { createdAt: "desc" },
  });
  const inquiries = await p.inquiry.count();

  console.log(`Users: ${users}`);
  console.log(`CoachProfiles: ${coaches}`);
  console.log(`Athletes: ${athletes}`);
  console.log(`Programs: ${programs.length}`);
  for (const pr of programs) {
    console.log(`  - "${pr.title}" → ${pr.athlete.fullName} | weeks=${pr._count.weeks} | docs=${pr._count.documents} | created ${pr.createdAt.toISOString().slice(0,16)}`);
  }
  console.log(`ProgramDocuments: ${docs.length}`);
  for (const d of docs) {
    console.log(`  - prog=${d.programId.slice(0,8)} | file=${d.filename ?? "(paste)"} | source=${d.source} | bytes=${d.rawText.length} | ${d.createdAt.toISOString().slice(0,16)}`);
  }
  console.log(`Inquiries: ${inquiries}`);

  await p.$disconnect();
})();
