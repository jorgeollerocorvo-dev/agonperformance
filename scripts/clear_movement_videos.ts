import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  // Reset cached YouTube URLs so the new <=45s + trusted-channel filter picks fresh ones.
  // This only clears the Movement.videoUrl column; coach-pinned URLs in program movements
  // are stored on ProgramMovement.prescription.youtubeUrl and are NOT touched.
  const r = await p.movement.updateMany({
    where: { videoUrl: { not: null } },
    data: { videoUrl: null },
  });
  console.log(`✓ cleared cached videoUrl on ${r.count} Movement rows`);
  await p.$disconnect();
})();
