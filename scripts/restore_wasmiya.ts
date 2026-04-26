import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const raw = JSON.parse(
    readFileSync(path.join(__dirname, "..", "prisma", "seed", "data", "programs", "wasmiya_12wk_2026-04-22.json"), "utf-8"),
  );

  const wasmiya = await prisma.athlete.findUnique({ where: { athleteKey: "wasmiya" } });
  if (!wasmiya) throw new Error("Wasmiya athlete not found");

  // Wipe any existing program with this key first (will cascade weeks/sessions/blocks/movements)
  await prisma.program.deleteMany({ where: { programKey: raw.program_id } });

  const program = await prisma.program.create({
    data: {
      programKey: raw.program_id,
      athleteId: wasmiya.id,
      title: raw.title,
      goal: raw.goal ?? null,
      startDate: new Date(raw.start_date),
      endDate: raw.end_date ? new Date(raw.end_date) : null,
      durationWeeks: raw.duration_weeks ?? null,
      weeklyStructure: raw.weekly_structure ?? null,
      targets: raw.targets ?? null,
      schemaVersion: raw.schema_version ?? "1.0",
    },
  });

  for (const weekRaw of raw.weeks ?? []) {
    const week = await prisma.programWeek.create({
      data: {
        programId: program.id,
        weekNumber: weekRaw.week_number,
        weekLabel: weekRaw.week_label ?? null,
        startDate: weekRaw.start_date ? new Date(weekRaw.start_date) : null,
        endDate: weekRaw.end_date ? new Date(weekRaw.end_date) : null,
      },
    });

    for (const sessionRaw of weekRaw.sessions ?? []) {
      const session = await prisma.programSession.create({
        data: {
          programWeekId: week.id,
          sessionKey: sessionRaw.session_id ?? null,
          date: new Date(sessionRaw.date),
          day: sessionRaw.day ?? null,
          focus: sessionRaw.focus ?? null,
          intensity: sessionRaw.intensity ?? null,
          notes: sessionRaw.notes ?? null,
        },
      });

      let blockOrder = 0;
      for (const blockRaw of sessionRaw.blocks ?? []) {
        const block = await prisma.programBlock.create({
          data: {
            programSessionId: session.id,
            blockCode: blockRaw.block_id ?? String.fromCharCode(65 + blockOrder),
            label: blockRaw.label ?? null,
            format: blockRaw.format ?? null,
            restSec: blockRaw.rest_sec ?? null,
            timeCapSec: blockRaw.time_cap_sec ?? null,
            notes: blockRaw.notes ?? null,
            order: blockOrder++,
          },
        });

        let moveOrder = 0;
        for (const mRaw of blockRaw.movements ?? []) {
          if (mRaw.pattern && Array.isArray(mRaw.movements)) {
            for (const innerM of mRaw.movements) {
              const movementId = innerM.movement_id
                ? (await prisma.movement.findUnique({ where: { code: innerM.movement_id } }))?.id
                : undefined;
              await prisma.programMovement.create({
                data: {
                  programBlockId: block.id,
                  movementId: movementId ?? null,
                  customName: movementId ? null : (innerM.movement_id ?? innerM.name ?? null),
                  prescription: innerM,
                  order: moveOrder++,
                  pattern: mRaw.pattern,
                  altGroup: innerM.alt ?? null,
                  isTest: !!innerM.test,
                },
              });
            }
          } else {
            const movementId = mRaw.movement_id
              ? (await prisma.movement.findUnique({ where: { code: mRaw.movement_id } }))?.id
              : undefined;
            await prisma.programMovement.create({
              data: {
                programBlockId: block.id,
                movementId: movementId ?? null,
                customName: movementId ? null : (mRaw.movement_id ?? mRaw.name ?? null),
                prescription: mRaw,
                order: moveOrder++,
                altGroup: mRaw.alt ?? null,
                isTest: !!mRaw.test,
              },
            });
          }
        }
      }
    }
  }

  console.log(`✓ restored ${raw.program_id} for Wasmiya`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
