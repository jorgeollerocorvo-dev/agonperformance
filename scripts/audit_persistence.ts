import { PrismaClient } from "@prisma/client";

/**
 * Persistence audit — counts every row of user data and prints a snapshot.
 * Run before/after a deploy to confirm nothing was lost.
 *
 *   railway run -- npx tsx scripts/audit_persistence.ts
 *   # or pass DATABASE_URL directly:
 *   DATABASE_URL=postgres://… npx tsx scripts/audit_persistence.ts
 */

const prisma = new PrismaClient();

(async () => {
  const counts = {
    users: await prisma.user.count(),
    coachProfiles: await prisma.coachProfile.count(),
    athletes: await prisma.athlete.count(),
    athleteLinks: await prisma.athleteLink.count(),
    programs: await prisma.program.count(),
    programWeeks: await prisma.programWeek.count(),
    programSessions: await prisma.programSession.count(),
    programBlocks: await prisma.programBlock.count(),
    programMovements: await prisma.programMovement.count(),
    sessionLogs: await prisma.sessionLog.count(),
    testResults: await prisma.testResult.count(),
    conversations: await prisma.conversation.count(),
    messages: await prisma.message.count(),
    inquiries: await prisma.inquiry.count(),
    reviews: await prisma.review.count(),
    subscriptions: await prisma.subscription.count(),
    movements: await prisma.movement.count(),
    movementsWithVideo: await prisma.movement.count({ where: { videoUrl: { not: null } } }),
    movementsLocked: await prisma.movement.count({ where: { videoLocked: true } }),
  };

  console.log("=== Persistence audit ===");
  console.log(`Run at: ${new Date().toISOString()}\n`);
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }

  // Sample latest activity so it's easy to spot truncation
  const lastUser = await prisma.user.findFirst({ orderBy: { createdAt: "desc" }, select: { email: true, createdAt: true } });
  const lastInquiry = await prisma.inquiry.findFirst({ orderBy: { createdAt: "desc" }, select: { contactName: true, createdAt: true, source: true } });
  const lastMessage = await prisma.message.findFirst({ orderBy: { createdAt: "desc" }, select: { body: true, createdAt: true } });
  const lastSessionLog = await prisma.sessionLog.findFirst({ orderBy: { completedAt: "desc" }, select: { completedAt: true } });

  console.log(`\nLatest user:        ${lastUser?.email ?? "—"} (${lastUser?.createdAt.toISOString() ?? "—"})`);
  console.log(`Latest inquiry:     ${lastInquiry?.contactName ?? "—"} via ${lastInquiry?.source ?? "—"} (${lastInquiry?.createdAt.toISOString() ?? "—"})`);
  console.log(`Latest message:     ${lastMessage?.body?.slice(0, 50) ?? "—"} (${lastMessage?.createdAt.toISOString() ?? "—"})`);
  console.log(`Latest sessionLog:  ${lastSessionLog?.completedAt.toISOString() ?? "—"}`);

  await prisma.$disconnect();
})();
