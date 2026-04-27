import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const total = await p.movement.count();
  const withVideo = await p.movement.count({ where: { videoUrl: { not: null } } });
  console.log(`Movements with cached videoUrl: ${withVideo} / ${total}`);

  // Sample what's in programs vs library
  const programMovements = await p.programMovement.count();
  const sample = await p.programMovement.findMany({
    take: 8,
    include: { movement: true },
    orderBy: { id: "desc" },
  });
  console.log(`\nLast ${sample.length} program movements:`);
  for (const m of sample) {
    const p = (m.prescription ?? {}) as Record<string, unknown>;
    const userUrl = typeof p.youtubeUrl === "string" ? p.youtubeUrl : null;
    console.log(`  - ${m.movement?.nameEn ?? m.customName}`);
    console.log(`      library.videoUrl = ${m.movement?.videoUrl ?? "null"}`);
    console.log(`      prescription.youtubeUrl = ${userUrl ?? "null"}`);
  }
  console.log(`\nTotal program movements: ${programMovements}`);
  await p.$disconnect();
})();
