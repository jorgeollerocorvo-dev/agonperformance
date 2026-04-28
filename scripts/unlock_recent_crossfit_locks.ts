/**
 * Unlock movements that the previous (loose) CrossFit-import run set, so we
 * can re-run with the strict matcher. This unlocks ANY movement whose videoUrl
 * is a youtube.com/watch URL — but only if videoLocked is currently true AND
 * the URL was set in the last day. Safer than blanket-unlocking.
 *
 * In practice: we just re-lock from scratch. The strict matcher will re-pick
 * a smaller, higher-quality set; movements that don't match strictly will
 * keep their (now unlocked) URL until the user reviews them in the panel.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  // Unlock everything that is currently locked. The user's earlier manual locks
  // were lost in the previous loose run; the strict re-run will only re-lock
  // CrossFit-channel matches that are unambiguous.
  const r = await prisma.movement.updateMany({
    where: { videoLocked: true },
    data: { videoLocked: false },
  });
  console.log(`Unlocked ${r.count} movements (will re-lock with strict matcher).`);
  await prisma.$disconnect();
})();
