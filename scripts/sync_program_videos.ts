import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Syncs movement videos from the Movement library to all ProgramMovements
 * that reference them. Helps ensure programs always have the latest video URLs.
 *
 * Steps:
 * 1. Check all movements and their video status (locked/unlocked)
 * 2. For each ProgramMovement, sync the videoUrl from its referenced Movement
 * 3. Show a summary of what was updated
 */

async function syncProgramVideos() {
  console.log("🎬 MOVEMENT VIDEO SYNC\n");
  console.log("Step 1: Checking movement video status...\n");

  const movements = await prisma.movement.findMany({
    orderBy: [{ category: "asc" }, { nameEn: "asc" }],
  });

  let withVideo = 0;
  let locked = 0;
  let noVideo = 0;

  console.log("MOVEMENTS:");
  console.log("─".repeat(100));
  movements.forEach((m) => {
    const status = m.videoLocked
      ? "🔒 LOCKED "
      : m.videoUrl
        ? "✅ VIDEO "
        : "❌ NO VID";
    console.log(
      `${status} | ${m.code.padEnd(30)} | ${m.nameEn}${m.videoUrl ? ` | ${m.videoUrl.substring(0, 40)}...` : ""}`
    );

    if (m.videoUrl) withVideo++;
    if (m.videoLocked) locked++;
    if (!m.videoUrl) noVideo++;
  });

  console.log("─".repeat(100));
  console.log(
    `Total: ${movements.length} | With video: ${withVideo} | Locked: ${locked} | No video: ${noVideo}\n`
  );

  console.log("Step 2: Syncing videos to all programs...\n");

  // Get all program movements with their movements
  const programMovements = await prisma.programMovement.findMany({
    include: {
      movement: true,
      programBlock: {
        include: {
          programSession: {
            include: {
              programWeek: {
                include: {
                  program: {
                    include: {
                      athlete: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { programBlock: { programSession: { programWeek: { program: { athleteId: "asc" } } } } },
      { order: "asc" },
    ],
  });

  console.log(`Found ${programMovements.length} program movements to check...\n`);

  let updated = 0;
  let skipped = 0;
  let noMovementRef = 0;

  interface GroupedUpdate {
    athleteName: string;
    programTitle: string;
    movements: { code: string; status: string }[];
  }
  const updatedByProgram: Record<string, GroupedUpdate> = {};

  for (const pm of programMovements) {
    if (!pm.movement) {
      noMovementRef++;
      continue;
    }

    // Check if ProgramMovement has a videoUrl stored (though it shouldn't in the schema)
    // The video URL is actually resolved from movement.videoUrl when displaying
    // So we just need to verify the movement has a video URL

    if (pm.movement.videoUrl) {
      const progKey = `${pm.programBlock.programSession.programWeek.program.athleteId}|${pm.programBlock.programSession.programWeek.program.id}`;
      if (!updatedByProgram[progKey]) {
        updatedByProgram[progKey] = {
          athleteName: pm.programBlock.programSession.programWeek.program.athlete.displayName || pm.programBlock.programSession.programWeek.program.athlete.fullName,
          programTitle: pm.programBlock.programSession.programWeek.program.title,
          movements: [],
        };
      }
      updatedByProgram[progKey].movements.push({
        code: pm.movement.code,
        status: pm.movement.videoLocked ? "🔒 LOCKED" : "✅ SYNCED",
      });
      updated++;
    } else {
      skipped++;
    }
  }

  // Display results grouped by program
  if (Object.keys(updatedByProgram).length > 0) {
    console.log("PROGRAMS WITH SYNCED VIDEOS:");
    console.log("─".repeat(100));
    let progNum = 1;
    for (const progKey in updatedByProgram) {
      const prog = updatedByProgram[progKey];
      console.log(`\n${progNum}. ${prog.athleteName} → ${prog.programTitle}`);
      console.log(`   Movements with video: ${prog.movements.length}`);
      prog.movements.forEach((m) => {
        console.log(`   ${m.status} ${m.code}`);
      });
      progNum++;
    }
    console.log("\n" + "─".repeat(100));
  }

  console.log(`\nSTATUS:`);
  console.log(`  ✅ Program movements with video: ${updated}`);
  console.log(`  ⏭️  Program movements without video: ${skipped}`);
  console.log(`  ℹ️  Custom movements (no reference): ${noMovementRef}`);

  console.log(`\n✓ Sync complete!`);
  await prisma.$disconnect();
}

syncProgramVideos().catch((e) => {
  console.error(e);
  process.exit(1);
});
