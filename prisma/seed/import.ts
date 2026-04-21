/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();

const SEED_ROOT = path.join(__dirname, "data");

function readJson(p: string) {
  return JSON.parse(readFileSync(path.join(SEED_ROOT, p), "utf-8"));
}

async function seedMovements() {
  const raw = readJson("reference/movements.json");
  const entries = Object.entries<any>(raw.movements ?? {});
  for (const [code, data] of entries) {
    await prisma.movement.upsert({
      where: { code },
      update: {
        nameEn: data.display_name ?? code,
        category: data.category ?? null,
        attributes: data,
      },
      create: {
        code,
        nameEn: data.display_name ?? code,
        category: data.category ?? null,
        attributes: data,
      },
    });
  }
  console.log(`✓ seeded ${entries.length} movements`);
}

async function seedSpecialties() {
  const rows = [
    { code: "crossfit", labelEn: "CrossFit", labelEs: "CrossFit", category: "TRAINING" as const },
    { code: "weight_loss", labelEn: "Weight Loss", labelEs: "Pérdida de peso", category: "TRAINING" as const },
    { code: "bodybuilding", labelEn: "Bodybuilding", labelEs: "Culturismo", category: "TRAINING" as const },
    { code: "women_glutes_abs_legs", labelEn: "Women (glutes/abs/legs)", labelEs: "Mujer (glúteo/abdomen/pierna)", category: "TRAINING" as const },
    { code: "masters_athlete", labelEn: "Masters Athletes (50+)", labelEs: "Atletas Masters (50+)", category: "SPECIALTY" as const },
    { code: "pregnancy_postpartum", labelEn: "Pregnancy / Postpartum", labelEs: "Embarazo y posparto", category: "WELLNESS" as const },
    { code: "strength_conditioning", labelEn: "Strength & Conditioning", labelEs: "Fuerza y acondicionamiento", category: "TRAINING" as const },
    { code: "olympic_lifting", labelEn: "Olympic Weightlifting", labelEs: "Halterofilia", category: "TRAINING" as const },
    { code: "sports_rehab", labelEn: "Sports Rehab", labelEs: "Rehabilitación deportiva", category: "REHAB" as const },
    { code: "nutrition_coaching", labelEn: "Nutrition Coaching", labelEs: "Asesoramiento nutricional", category: "NUTRITION" as const },
  ];
  for (const r of rows) {
    await prisma.specialty.upsert({
      where: { code: r.code },
      update: r,
      create: r,
    });
  }
  console.log(`✓ seeded ${rows.length} specialties`);
}

async function ensureDemoCoach() {
  const email = "jorge@agonperformance.com";
  const existing = await prisma.user.findUnique({ where: { email }, include: { coachProfile: true } });
  if (existing?.coachProfile) return existing.coachProfile;

  const passwordHash = await bcrypt.hash("changeme123", 10);
  const user = existing ?? await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: "Jorge Ollero",
      displayName: "Jorge",
      preferredLanguage: "ES",
      countryCode: "ES",
      timezone: "Europe/Madrid",
      roles: { create: [{ role: "COACH" }] },
    },
  });

  const coachProfile = await prisma.coachProfile.create({
    data: {
      userId: user.id,
      handle: "jorge-ollero",
      providerType: "CROSSFIT_COACH",
      listingStatus: "APPROVED",
      headline: "CrossFit and strength coach",
      bioEs: "Entrenador de CrossFit y fuerza con enfoque en atletas Masters, mujer y culturismo.",
      bioEn: "CrossFit and strength coach focused on Masters athletes, women's training and bodybuilding.",
      languagesSpoken: ["es", "en"],
      currency: "EUR",
      pricePerSessionMin: 30,
      pricePerSessionMax: 60,
      trainsOppositeGender: true,
    },
  });

  // Attach specialties
  const specialtyCodes = ["crossfit", "women_glutes_abs_legs", "bodybuilding", "masters_athlete"];
  for (const code of specialtyCodes) {
    const s = await prisma.specialty.findUnique({ where: { code } });
    if (s) {
      await prisma.coachProfileSpecialty.upsert({
        where: { coachProfileId_specialtyId: { coachProfileId: coachProfile.id, specialtyId: s.id } },
        update: {},
        create: { coachProfileId: coachProfile.id, specialtyId: s.id },
      });
    }
  }

  console.log(`✓ demo coach ready — email: ${email} / password: changeme123`);
  return coachProfile;
}

async function seedAthlete(key: "ravi" | "wasmiya", coachProfileId: string) {
  const raw = readJson(`athletes/${key}.json`);
  const athlete = await prisma.athlete.upsert({
    where: { athleteKey: raw.athlete_id },
    update: {
      fullName: raw.name,
      sex: raw.sex ?? null,
      age: raw.age ?? null,
      dob: raw.dob ? new Date(raw.dob) : null,
      division: raw.division ?? null,
      competitiveGoal: raw.competitive_goal ?? null,
      injuryHistory: raw.injury_history ?? null,
      trainingFrequency: raw.training_frequency ?? null,
      current1rms: raw.current_1rms ?? null,
      currentBenchmarks: raw.current_benchmarks ?? null,
      targetsByCompetition: raw.targets_by_competition ?? null,
      priorityGaps: raw.priority_gaps ?? null,
      programmingNotes: raw.programming_notes ?? null,
      activeProgramId: raw.active_program_id ?? null,
      coachProfileId,
    },
    create: {
      athleteKey: raw.athlete_id,
      fullName: raw.name,
      sex: raw.sex ?? null,
      age: raw.age ?? null,
      dob: raw.dob ? new Date(raw.dob) : null,
      division: raw.division ?? null,
      competitiveGoal: raw.competitive_goal ?? null,
      injuryHistory: raw.injury_history ?? null,
      trainingFrequency: raw.training_frequency ?? null,
      current1rms: raw.current_1rms ?? null,
      currentBenchmarks: raw.current_benchmarks ?? null,
      targetsByCompetition: raw.targets_by_competition ?? null,
      priorityGaps: raw.priority_gaps ?? null,
      programmingNotes: raw.programming_notes ?? null,
      activeProgramId: raw.active_program_id ?? null,
      coachProfileId,
    },
  });
  console.log(`✓ athlete ${raw.name}`);
  return athlete.id;
}

async function seedProgram(fileName: string, athleteId: string) {
  const raw = readJson(`programs/${fileName}`);

  // Delete cascade for clean re-seed
  await prisma.program.deleteMany({ where: { programKey: raw.program_id } });

  const program = await prisma.program.create({
    data: {
      programKey: raw.program_id,
      athleteId,
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
        const movements = blockRaw.movements ?? [];
        for (const mRaw of movements) {
          // Handle nested pattern (QF3: "3 rounds" containing movements)
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

  console.log(`✓ program ${raw.program_id}`);
}

async function seedSubscriptionPlans() {
  const plans = [
    { code: "free", nameEn: "Free", nameEs: "Gratis", price: 0, currency: "EUR", interval: "FREE" as const, features: { max_conversations: 3 } },
    { code: "premium_monthly", nameEn: "Premium", nameEs: "Premium", price: 29, currency: "EUR", interval: "MONTHLY" as const, features: { max_conversations: null, gallery_max: 10, verified_badge_eligible: true } },
    { code: "pro_monthly", nameEn: "Pro", nameEs: "Pro", price: 59, currency: "EUR", interval: "MONTHLY" as const, features: { max_conversations: null, gallery_max: 20, intro_video: true, top_of_search: true } },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }
  console.log(`✓ seeded ${plans.length} subscription plans`);
}

async function main() {
  await seedMovements();
  await seedSpecialties();
  await seedSubscriptionPlans();
  const coachProfile = await ensureDemoCoach();
  const raviId = await seedAthlete("ravi", coachProfile.id);
  const wasmiyaId = await seedAthlete("wasmiya", coachProfile.id);
  await seedProgram("ravi_3wk_2026-04-21.json", raviId);
  await seedProgram("wasmiya_12wk_2026-04-22.json", wasmiyaId);
  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
