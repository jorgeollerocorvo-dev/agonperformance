import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = { code: string; nameEn: string; nameEs?: string; nameAr?: string; category: string };

// Round 2: more CrossFit + standard gym training. Idempotent (upsert by code).
const ROWS: Row[] = [
  // CrossFit gymnastics
  { code: "ring_dip", nameEn: "Ring dip", nameEs: "Fondos en anillas", category: "gymnastics_push" },
  { code: "bar_dip", nameEn: "Bar dip", nameEs: "Fondos en barra", category: "gymnastics_push" },
  { code: "ring_muscle_up", nameEn: "Ring muscle-up", nameEs: "Muscle-up en anillas", category: "gymnastics_pull" },
  { code: "strict_bar_muscle_up", nameEn: "Strict bar muscle-up", nameEs: "Muscle-up estricto en barra", category: "gymnastics_pull" },
  { code: "toes_to_bar", nameEn: "Toes to bar", nameEs: "Pies a la barra", category: "gymnastics_pull" },
  { code: "knees_to_elbows", nameEn: "Knees to elbows", nameEs: "Rodillas a los codos", category: "gymnastics_pull" },
  { code: "rope_climb", nameEn: "Rope climb", nameEs: "Trepa de cuerda", category: "gymnastics_pull" },
  { code: "legless_rope_climb", nameEn: "Legless rope climb", nameEs: "Trepa sin piernas", category: "gymnastics_pull" },
  { code: "wall_walk", nameEn: "Wall walk", nameEs: "Wall walk", category: "gymnastics_push" },
  { code: "pistol_squat", nameEn: "Pistol squat", nameEs: "Sentadilla pistol", category: "squat" },
  { code: "shrimp_squat", nameEn: "Shrimp squat", nameEs: "Shrimp squat", category: "squat" },
  { code: "ghd_situp", nameEn: "GHD sit-up", nameEs: "GHD abdominal", category: "accessory" },
  { code: "ghd_back_extension", nameEn: "GHD back extension", nameEs: "Extensión lumbar GHD", category: "accessory" },
  { code: "l_sit", nameEn: "L-sit", nameEs: "L-sit", category: "gymnastics_push" },
  { code: "l_sit_pull_up", nameEn: "L-sit pull-up", nameEs: "Dominada en L", category: "gymnastics_pull" },
  { code: "skin_the_cat", nameEn: "Skin the cat", nameEs: "Skin the cat", category: "gymnastics_pull" },

  // CrossFit conditioning / WOD essentials
  { code: "kettlebell_swing", nameEn: "Kettlebell swing", nameEs: "Swing con kettlebell", category: "monostructural" },
  { code: "american_kb_swing", nameEn: "American KB swing (overhead)", nameEs: "Swing americano (KB)", category: "monostructural" },
  { code: "russian_kb_swing", nameEn: "Russian KB swing", nameEs: "Swing ruso (KB)", category: "monostructural" },
  { code: "burpee", nameEn: "Burpee", nameEs: "Burpee", category: "monostructural" },
  { code: "burpee_box_jump_over", nameEn: "Burpee box jump-over", nameEs: "Burpee con salto al cajón", category: "monostructural" },
  { code: "burpee_pull_up", nameEn: "Burpee pull-up", nameEs: "Burpee con dominada", category: "monostructural" },
  { code: "box_jump", nameEn: "Box jump", nameEs: "Salto al cajón", category: "monostructural" },
  { code: "box_step_up", nameEn: "Box step-up", nameEs: "Subida al cajón", category: "monostructural" },
  { code: "thruster_with_dumbbell", nameEn: "DB thruster", nameEs: "Thruster con mancuerna", category: "pressing" },
  { code: "wall_ball_shot", nameEn: "Wall ball shot", nameEs: "Wall ball", category: "monostructural" },
  { code: "med_ball_clean", nameEn: "Med-ball clean", nameEs: "Clean con balón medicinal", category: "olympic_lifting" },
  { code: "sled_push", nameEn: "Sled push", nameEs: "Empuje de trineo", category: "monostructural" },
  { code: "sled_pull", nameEn: "Sled pull", nameEs: "Tirón de trineo", category: "monostructural" },
  { code: "farmer_carry", nameEn: "Farmer's carry", nameEs: "Paseo del granjero", category: "monostructural" },
  { code: "suitcase_carry", nameEn: "Suitcase carry", nameEs: "Paseo de la maleta", category: "monostructural" },
  { code: "overhead_carry", nameEn: "Overhead carry", nameEs: "Paseo overhead", category: "monostructural" },
  { code: "yoke_carry", nameEn: "Yoke carry", nameEs: "Yoke carry", category: "monostructural" },
  { code: "sandbag_carry", nameEn: "Sandbag bear-hug carry", nameEs: "Bear hug con sandbag", category: "monostructural" },
  { code: "sandbag_clean", nameEn: "Sandbag clean", nameEs: "Clean con sandbag", category: "olympic_lifting" },
  { code: "atlas_stone", nameEn: "Atlas stone over yoke", nameEs: "Atlas stone sobre yoke", category: "monostructural" },
  { code: "tire_flip", nameEn: "Tire flip", nameEs: "Volteo de neumático", category: "monostructural" },
  { code: "echo_bike_calorie", nameEn: "Echo bike calories", nameEs: "Echo bike (calorías)", category: "monostructural" },
  { code: "assault_bike_calorie", nameEn: "Assault bike calories", nameEs: "Assault bike (calorías)", category: "monostructural" },
  { code: "row_meter", nameEn: "Row (meters)", nameEs: "Remoergómetro (metros)", category: "monostructural" },
  { code: "ski_erg_calorie", nameEn: "SkiErg calories", nameEs: "SkiErg (calorías)", category: "monostructural" },
  { code: "shuttle_run", nameEn: "Shuttle run", nameEs: "Carrera ida-y-vuelta", category: "monostructural" },
  { code: "broad_jump", nameEn: "Broad jump", nameEs: "Salto horizontal", category: "monostructural" },
  { code: "lateral_box_jump", nameEn: "Lateral box jump-over", nameEs: "Salto lateral al cajón", category: "monostructural" },

  // Olympic lifting variants
  { code: "snatch_grip_deadlift", nameEn: "Snatch-grip deadlift", nameEs: "Peso muerto agarre snatch", category: "deadlift" },
  { code: "clean_pull_to_knee", nameEn: "Clean pull to knee", nameEs: "Tirón a la rodilla (clean)", category: "olympic_lifting" },
  { code: "snatch_pull", nameEn: "Snatch pull", nameEs: "Tirón snatch", category: "olympic_lifting" },
  { code: "muscle_clean", nameEn: "Muscle clean", nameEs: "Muscle clean", category: "olympic_lifting" },
  { code: "muscle_snatch", nameEn: "Muscle snatch", nameEs: "Muscle snatch", category: "olympic_lifting" },
  { code: "high_pull_clean", nameEn: "High pull (clean grip)", nameEs: "High pull (clean)", category: "olympic_lifting" },
  { code: "high_pull_snatch", nameEn: "High pull (snatch grip)", nameEs: "High pull (snatch)", category: "olympic_lifting" },
  { code: "behind_neck_press", nameEn: "Behind-the-neck press", nameEs: "Press tras nuca", category: "pressing" },
  { code: "behind_neck_jerk", nameEn: "Behind-the-neck jerk", nameEs: "Jerk tras nuca", category: "pressing" },
  { code: "front_rack_lunge", nameEn: "Front-rack lunge", nameEs: "Zancada front rack", category: "squat" },
  { code: "back_rack_lunge", nameEn: "Back-rack lunge", nameEs: "Zancada back rack", category: "squat" },
  { code: "ohs_overhead_lunge", nameEn: "Overhead lunge", nameEs: "Zancada overhead", category: "squat" },

  // Standard gym staples
  { code: "deficit_deadlift", nameEn: "Deficit deadlift", nameEs: "Peso muerto con déficit", category: "deadlift" },
  { code: "block_pull", nameEn: "Block pull", nameEs: "Peso muerto desde bloques", category: "deadlift" },
  { code: "trap_bar_deadlift", nameEn: "Trap bar deadlift", nameEs: "Peso muerto con trap bar", category: "deadlift" },
  { code: "tempo_back_squat", nameEn: "Tempo back squat", nameEs: "Sentadilla con tempo", category: "squat" },
  { code: "pause_back_squat", nameEn: "Pause back squat", nameEs: "Sentadilla con pausa", category: "squat" },
  { code: "box_squat", nameEn: "Box squat", nameEs: "Sentadilla al cajón", category: "squat" },
  { code: "smith_squat", nameEn: "Smith machine squat", nameEs: "Sentadilla en multipower", category: "squat" },
  { code: "front_foot_elevated_split_squat", nameEn: "Front-foot-elevated split squat", nameEs: "Split squat con pie delantero elevado", category: "squat" },
  { code: "single_arm_db_row", nameEn: "Single-arm DB row", nameEs: "Remo a una mano con mancuerna", category: "pulling" },
  { code: "meadows_row", nameEn: "Meadows row", nameEs: "Remo Meadows", category: "pulling" },
  { code: "t_bar_row", nameEn: "T-bar row", nameEs: "Remo T-bar", category: "pulling" },
  { code: "chest_fly_machine", nameEn: "Chest fly (machine)", nameEs: "Aperturas en máquina", category: "pressing" },
  { code: "cable_chest_fly", nameEn: "Cable chest fly", nameEs: "Aperturas en polea", category: "pressing" },
  { code: "pec_dec", nameEn: "Pec deck", nameEs: "Contractor de pecho", category: "pressing" },
  { code: "shrug", nameEn: "Barbell shrug", nameEs: "Encogimientos con barra", category: "pulling" },
  { code: "db_shrug", nameEn: "DB shrug", nameEs: "Encogimientos con mancuerna", category: "pulling" },
  { code: "face_pull", nameEn: "Face pull", nameEs: "Face pull", category: "pulling" },
  { code: "reverse_pec_dec", nameEn: "Reverse pec deck", nameEs: "Pec deck inverso", category: "pulling" },
  { code: "lateral_raise_machine", nameEn: "Lateral raise (machine)", nameEs: "Elevaciones laterales en máquina", category: "pressing" },
  { code: "arnold_press", nameEn: "Arnold press", nameEs: "Press Arnold", category: "pressing" },
  { code: "landmine_press", nameEn: "Landmine press", nameEs: "Press landmine", category: "pressing" },
  { code: "landmine_row", nameEn: "Landmine row", nameEs: "Remo landmine", category: "pulling" },
  { code: "ez_bar_curl", nameEn: "EZ-bar curl", nameEs: "Curl con barra Z", category: "accessory" },
  { code: "incline_db_curl", nameEn: "Incline DB curl", nameEs: "Curl inclinado con mancuerna", category: "accessory" },
  { code: "concentration_curl", nameEn: "Concentration curl", nameEs: "Curl concentrado", category: "accessory" },
  { code: "rope_pushdown", nameEn: "Rope pushdown", nameEs: "Pushdown con cuerda", category: "accessory" },
  { code: "tricep_dip_bench", nameEn: "Bench tricep dip", nameEs: "Fondos de tríceps en banco", category: "accessory" },
  { code: "overhead_tricep_extension", nameEn: "Overhead tricep extension", nameEs: "Extensión de tríceps overhead", category: "accessory" },
  { code: "single_leg_press", nameEn: "Single-leg press", nameEs: "Prensa a una pierna", category: "squat" },
  { code: "nordic_curl", nameEn: "Nordic hamstring curl", nameEs: "Nordic hamstring", category: "accessory" },
  { code: "stiff_legged_deadlift", nameEn: "Stiff-legged deadlift", nameEs: "Peso muerto con piernas rígidas", category: "deadlift" },

  // Cardio variations
  { code: "intervals_400m", nameEn: "400m intervals", nameEs: "Intervalos 400m", category: "monostructural" },
  { code: "intervals_800m", nameEn: "800m intervals", nameEs: "Intervalos 800m", category: "monostructural" },
  { code: "tempo_run", nameEn: "Tempo run", nameEs: "Carrera ritmo umbral", category: "monostructural" },
  { code: "long_slow_run", nameEn: "Long slow run", nameEs: "Carrera larga suave", category: "monostructural" },
  { code: "hill_sprints", nameEn: "Hill sprints", nameEs: "Sprints en cuesta", category: "monostructural" },
];

(async () => {
  let created = 0;
  let updated = 0;
  for (const r of ROWS) {
    const existing = await prisma.movement.findUnique({ where: { code: r.code } });
    await prisma.movement.upsert({
      where: { code: r.code },
      update: {
        nameEn: r.nameEn,
        nameEs: r.nameEs ?? null,
        nameAr: r.nameAr ?? null,
        category: r.category,
      },
      create: {
        code: r.code,
        nameEn: r.nameEn,
        nameEs: r.nameEs ?? null,
        nameAr: r.nameAr ?? null,
        category: r.category,
      },
    });
    if (existing) updated++; else created++;
  }
  console.log(`✓ ${created} created, ${updated} updated. Total movements: ${await prisma.movement.count()}`);
  await prisma.$disconnect();
})();
