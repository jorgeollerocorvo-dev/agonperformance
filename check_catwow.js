const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  // Find cat-cow movement
  const movement = await prisma.movement.findFirst({
    where: {
      nameEn: { contains: "cat-cow", mode: "insensitive" }
    }
  });
  
  if (movement) {
    console.log("=== CAT-COW MOVEMENT ===");
    console.log("ID:", movement.id);
    console.log("Name:", movement.nameEn);
    console.log("Video URL:", movement.videoUrl);
    console.log("");
    
    // Find all program movements using this exercise
    const programMovements = await prisma.programMovement.findMany({
      where: { movementId: movement.id },
      include: {
        programBlock: {
          include: {
            programSession: {
              include: {
                programWeek: {
                  include: { program: { include: { athlete: true } } }
                }
              }
            }
          }
        }
      }
    });
    
    console.log(`Found ${programMovements.length} uses of cat-cow in programs:`);
    programMovements.forEach((pm, idx) => {
      const prog = pm.programBlock.programSession.programWeek.program;
      const prescription = pm.prescription || {};
      console.log(`\n${idx + 1}. ${prog.athlete.fullName} - ${prog.title}`);
      console.log("   Prescription youtubeUrl:", prescription.youtubeUrl || "none");
      console.log("   Movement library URL:", movement.videoUrl);
      console.log("   Match:", prescription.youtubeUrl === movement.videoUrl ? "✓ YES" : "✗ NO");
    });
  } else {
    console.log("Cat-cow movement not found");
  }
  
  await prisma.$disconnect();
})();
