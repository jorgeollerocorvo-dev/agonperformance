import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const logs = await prisma.sessionLog.findMany({
    include: { 
      programSession: { include: { programWeek: { include: { program: { include: { athlete: true } } } } } },
      athlete: true 
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (logs.length === 0) {
    console.log('No SessionLog entries found');
  } else {
    console.log(`Found ${logs.length} SessionLog entries:\n`);
    logs.forEach(log => {
      const athlete = log.athlete?.fullName || log.programSession.programWeek.program.athlete.fullName;
      const date = log.programSession.date.toISOString().slice(0, 10);
      const emoji = log.intensityFeedback ? ['😊', '😐', '😓', '💪', '😤'][log.intensityFeedback - 1] : 'none';
      console.log(`${athlete} | ${date} | Intensity: ${emoji} | Review: ${log.intensityReview ? log.intensityReview.substring(0, 50) + '...' : 'none'}`);
    });
  }
} catch(e) {
  console.error('Error:', e.message);
}

await prisma.$disconnect();
