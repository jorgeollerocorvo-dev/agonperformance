const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking video synchronization...\n');

  // Get all movements with videos
  const movements = await prisma.movement.findMany({
    where: { videoUrl: { not: null } },
    select: { id: true, nameEn: true, videoUrl: true },
    take: 5,
  });

  console.log(`Found ${movements.length} movements with videos:`);
  movements.forEach(m => {
    console.log(`  - ${m.nameEn}: ${m.videoUrl}`);
  });

  // Get a sample program movement to see if movementId is set
  console.log('\nChecking ProgramMovement records...');
  const programMovements = await prisma.programMovement.findMany({
    where: { movementId: { not: null } },
    include: { movement: true, programBlock: true },
    take: 5,
  });

  console.log(`Found ${programMovements.length} ProgramMovements with movementId:`);
  programMovements.forEach(pm => {
    console.log(`  - Movement: ${pm.movement?.nameEn}, Saved videoUrl in prescription: ${pm.prescription?.youtubeUrl}`);
  });

  // Check how many movements DON'T have movementId
  const noMovementId = await prisma.programMovement.findMany({
    where: { movementId: null },
    include: { movement: true },
    take: 3,
  });

  console.log(`\nFound ${noMovementId.length} ProgramMovements WITHOUT movementId:`);
  noMovementId.forEach(pm => {
    console.log(`  - CustomName: ${pm.customName}, Saved videoUrl: ${pm.prescription?.youtubeUrl}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
