const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  console.log("🔄 Syncing movement library videos to program prescriptions...\n");
  
  // Get all program movements
  const programMovements = await prisma.programMovement.findMany({
    where: { movementId: { not: null } },
    include: { movement: true }
  });

  console.log(`Found ${programMovements.count? programMovements.count : programMovements.length} program movements to check\n`);

  let updateCount = 0;
  
  for (const pm of programMovements) {
    if (pm.movement && pm.movement.videoUrl) {
      const prescription = pm.prescription || {};
      
      // Only update if prescription doesn't have youtubeUrl but movement does
      if (!prescription.youtubeUrl || prescription.youtubeUrl !== pm.movement.videoUrl) {
        await prisma.programMovement.update({
          where: { id: pm.id },
          data: {
            prescription: {
              ...prescription,
              youtubeUrl: pm.movement.videoUrl
            }
          }
        });
        updateCount++;
        console.log(`✓ Updated ${pm.movement.nameEn}`);
      }
    }
  }
  
  console.log(`\n✅ Sync complete! Updated ${updateCount} movements`);
  
  await prisma.$disconnect();
})();
