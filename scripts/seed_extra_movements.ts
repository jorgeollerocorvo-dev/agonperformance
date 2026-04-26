import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = { code: string; nameEn: string; nameEs?: string; nameAr?: string; category: string };

// Curated catalog. Add/edit freely — re-running is idempotent (upsert by code).
const ROWS: Row[] = [
  // ── Yoga / mobility ──────────────────────────────────────
  { code: "pigeon_pose", nameEn: "Pigeon pose", nameEs: "Postura de la paloma", category: "mobility" },
  { code: "pigeon_pose_supine", nameEn: "Supine pigeon pose", nameEs: "Paloma supina", category: "mobility" },
  { code: "downward_dog", nameEn: "Downward dog", nameEs: "Perro boca abajo", category: "mobility" },
  { code: "upward_dog", nameEn: "Upward dog", nameEs: "Perro boca arriba", category: "mobility" },
  { code: "cobra_pose", nameEn: "Cobra pose", nameEs: "Postura de la cobra", category: "mobility" },
  { code: "child_pose", nameEn: "Child's pose", nameEs: "Postura del niño", category: "mobility" },
  { code: "warrior_1", nameEn: "Warrior I", nameEs: "Guerrero I", category: "mobility" },
  { code: "warrior_2", nameEn: "Warrior II", nameEs: "Guerrero II", category: "mobility" },
  { code: "warrior_3", nameEn: "Warrior III", nameEs: "Guerrero III", category: "mobility" },
  { code: "triangle_pose", nameEn: "Triangle pose", nameEs: "Postura del triángulo", category: "mobility" },
  { code: "tree_pose", nameEn: "Tree pose", nameEs: "Postura del árbol", category: "mobility" },
  { code: "bridge_pose", nameEn: "Bridge pose (yoga)", nameEs: "Postura del puente (yoga)", category: "mobility" },
  { code: "happy_baby", nameEn: "Happy baby", nameEs: "Bebé feliz", category: "mobility" },
  { code: "thread_the_needle", nameEn: "Thread the needle", nameEs: "Enhebrar la aguja", category: "mobility" },
  { code: "couch_stretch", nameEn: "Couch stretch", nameEs: "Estiramiento de sofá", category: "mobility" },
  { code: "world_greatest_stretch", nameEn: "World's greatest stretch", nameEs: "El mejor estiramiento", category: "mobility" },
  { code: "deep_squat_hold", nameEn: "Deep squat hold (Asian squat)", nameEs: "Sentadilla profunda mantenida", category: "mobility" },
  { code: "ninety_ninety", nameEn: "90/90 hip stretch", nameEs: "90/90 de cadera", category: "mobility" },
  { code: "spiderman_lunge", nameEn: "Spiderman lunge", nameEs: "Zancada Spiderman", category: "mobility" },
  { code: "hip_flexor_stretch", nameEn: "Half-kneeling hip flexor stretch", nameEs: "Estiramiento de flexor de cadera", category: "mobility" },
  { code: "thoracic_open_book", nameEn: "T-spine open book", nameEs: "Apertura torácica (libro abierto)", category: "mobility" },
  { code: "cat_cow", nameEn: "Cat-cow", nameEs: "Gato-vaca", category: "mobility" },
  { code: "scorpion_stretch", nameEn: "Scorpion stretch", nameEs: "Estiramiento del escorpión", category: "mobility" },
  { code: "pancake_stretch", nameEn: "Pancake stretch", nameEs: "Pancake / estiramiento en tortita", category: "mobility" },
  { code: "frog_stretch", nameEn: "Frog stretch", nameEs: "Estiramiento de rana", category: "mobility" },

  // ── Women / glutes-abs-legs ──────────────────────────────
  { code: "glute_bridge", nameEn: "Glute bridge", nameEs: "Puente de glúteo", category: "accessory" },
  { code: "single_leg_glute_bridge", nameEn: "Single-leg glute bridge", nameEs: "Puente de glúteo a una pierna", category: "accessory" },
  { code: "hip_thrust", nameEn: "Hip thrust", nameEs: "Hip thrust (empuje de cadera)", category: "accessory" },
  { code: "barbell_hip_thrust", nameEn: "Barbell hip thrust", nameEs: "Hip thrust con barra", category: "accessory" },
  { code: "kas_glute_bridge", nameEn: "KAS glute bridge", nameEs: "KAS glute bridge", category: "accessory" },
  { code: "cable_kickback", nameEn: "Cable kickback", nameEs: "Patada con polea", category: "accessory" },
  { code: "cable_glute_kick", nameEn: "Cable glute kick", nameEs: "Patada de glúteo en polea", category: "accessory" },
  { code: "banded_lateral_walk", nameEn: "Banded lateral walk", nameEs: "Paseo lateral con banda", category: "accessory" },
  { code: "banded_clamshell", nameEn: "Banded clamshell", nameEs: "Almeja con banda", category: "accessory" },
  { code: "banded_glute_bridge", nameEn: "Banded glute bridge", nameEs: "Puente con banda", category: "accessory" },
  { code: "fire_hydrant", nameEn: "Fire hydrant", nameEs: "Hidrante", category: "accessory" },
  { code: "donkey_kick", nameEn: "Donkey kick", nameEs: "Patada de burro", category: "accessory" },
  { code: "bulgarian_split_squat", nameEn: "Bulgarian split squat", nameEs: "Sentadilla búlgara", category: "squat" },
  { code: "rear_foot_elevated_split_squat", nameEn: "Rear-foot-elevated split squat", nameEs: "Split squat con pie elevado", category: "squat" },
  { code: "step_up", nameEn: "Step-up", nameEs: "Subida al cajón", category: "accessory" },
  { code: "lateral_step_up", nameEn: "Lateral step-up", nameEs: "Subida lateral", category: "accessory" },
  { code: "reverse_lunge", nameEn: "Reverse lunge", nameEs: "Zancada inversa", category: "accessory" },
  { code: "walking_lunge", nameEn: "Walking lunge", nameEs: "Zancada caminando", category: "accessory" },
  { code: "curtsy_lunge", nameEn: "Curtsy lunge", nameEs: "Zancada cruzada", category: "accessory" },
  { code: "sumo_squat", nameEn: "Sumo squat", nameEs: "Sentadilla sumo", category: "squat" },
  { code: "good_morning", nameEn: "Good morning", nameEs: "Buenos días (good morning)", category: "deadlift" },
  { code: "hyperextension", nameEn: "Hyperextension", nameEs: "Hiperextensión", category: "accessory" },
  { code: "back_extension", nameEn: "Back extension", nameEs: "Extensión lumbar", category: "accessory" },

  // ── Abs / core ───────────────────────────────────────────
  { code: "plank", nameEn: "Plank", nameEs: "Plancha", category: "accessory" },
  { code: "side_plank", nameEn: "Side plank", nameEs: "Plancha lateral", category: "accessory" },
  { code: "plank_shoulder_tap", nameEn: "Plank with shoulder tap", nameEs: "Plancha con toque de hombro", category: "accessory" },
  { code: "hollow_hold", nameEn: "Hollow hold", nameEs: "Hollow hold", category: "accessory" },
  { code: "dead_bug", nameEn: "Dead bug", nameEs: "Dead bug", category: "accessory" },
  { code: "bird_dog", nameEn: "Bird dog", nameEs: "Bird dog", category: "accessory" },
  { code: "russian_twist", nameEn: "Russian twist", nameEs: "Giros rusos", category: "accessory" },
  { code: "weighted_russian_twist", nameEn: "Weighted Russian twist", nameEs: "Giros rusos con peso", category: "accessory" },
  { code: "bicycle_crunch", nameEn: "Bicycle crunch", nameEs: "Bicicleta abdominal", category: "accessory" },
  { code: "leg_raise", nameEn: "Lying leg raise", nameEs: "Elevación de piernas tumbado", category: "accessory" },
  { code: "hanging_leg_raise", nameEn: "Hanging leg raise", nameEs: "Elevación de piernas colgado", category: "accessory" },
  { code: "hanging_knee_raise", nameEn: "Hanging knee raise", nameEs: "Elevación de rodillas colgado", category: "accessory" },
  { code: "ab_wheel", nameEn: "Ab wheel rollout", nameEs: "Rueda abdominal", category: "accessory" },
  { code: "cable_crunch", nameEn: "Cable crunch", nameEs: "Crunch en polea", category: "accessory" },
  { code: "windshield_wiper", nameEn: "Windshield wiper", nameEs: "Limpiaparabrisas", category: "accessory" },
  { code: "v_up", nameEn: "V-up", nameEs: "V-up", category: "accessory" },

  // ── Bodybuilding / hypertrophy classics ──────────────────
  { code: "lat_pulldown", nameEn: "Lat pulldown", nameEs: "Jalón al pecho", category: "pulling" },
  { code: "seated_cable_row", nameEn: "Seated cable row", nameEs: "Remo en polea sentado", category: "pulling" },
  { code: "chest_supported_row", nameEn: "Chest-supported row", nameEs: "Remo con apoyo de pecho", category: "pulling" },
  { code: "barbell_row", nameEn: "Barbell row", nameEs: "Remo con barra", category: "pulling" },
  { code: "pendlay_row", nameEn: "Pendlay row", nameEs: "Pendlay row", category: "pulling" },
  { code: "incline_db_press", nameEn: "Incline DB press", nameEs: "Press inclinado con mancuerna", category: "pressing" },
  { code: "incline_bench_press", nameEn: "Incline bench press", nameEs: "Press inclinado con barra", category: "pressing" },
  { code: "decline_bench_press", nameEn: "Decline bench press", nameEs: "Press declinado", category: "pressing" },
  { code: "close_grip_bench", nameEn: "Close-grip bench press", nameEs: "Press cerrado", category: "pressing" },
  { code: "db_lateral_raise", nameEn: "DB lateral raise", nameEs: "Elevaciones laterales", category: "pressing" },
  { code: "db_front_raise", nameEn: "DB front raise", nameEs: "Elevaciones frontales", category: "pressing" },
  { code: "db_rear_delt_fly", nameEn: "DB rear-delt fly", nameEs: "Pájaros (rear delt)", category: "pulling" },
  { code: "barbell_curl", nameEn: "Barbell curl", nameEs: "Curl con barra", category: "accessory" },
  { code: "db_bicep_curl", nameEn: "DB bicep curl", nameEs: "Curl con mancuerna", category: "accessory" },
  { code: "hammer_curl", nameEn: "Hammer curl", nameEs: "Curl martillo", category: "accessory" },
  { code: "preacher_curl", nameEn: "Preacher curl", nameEs: "Curl en banco scott", category: "accessory" },
  { code: "tricep_pushdown", nameEn: "Tricep pushdown", nameEs: "Extensión de tríceps en polea", category: "accessory" },
  { code: "skull_crusher", nameEn: "Skull crusher", nameEs: "Press francés", category: "accessory" },
  { code: "leg_press", nameEn: "Leg press", nameEs: "Prensa de piernas", category: "squat" },
  { code: "hack_squat", nameEn: "Hack squat", nameEs: "Hack squat", category: "squat" },
  { code: "leg_curl", nameEn: "Lying leg curl", nameEs: "Curl femoral tumbado", category: "accessory" },
  { code: "seated_leg_curl", nameEn: "Seated leg curl", nameEs: "Curl femoral sentado", category: "accessory" },
  { code: "leg_extension", nameEn: "Leg extension", nameEs: "Extensión de cuádriceps", category: "accessory" },
  { code: "calf_raise_standing", nameEn: "Standing calf raise", nameEs: "Elevación de talones de pie", category: "accessory" },
  { code: "calf_raise_seated", nameEn: "Seated calf raise", nameEs: "Elevación de talones sentado", category: "accessory" },

  // ── Conditioning / running misc ──────────────────────────
  { code: "running_outdoor", nameEn: "Outdoor run", nameEs: "Carrera al aire libre", category: "monostructural" },
  { code: "treadmill_run", nameEn: "Treadmill run", nameEs: "Carrera en cinta", category: "monostructural" },
  { code: "incline_walk", nameEn: "Incline treadmill walk", nameEs: "Caminata inclinada en cinta", category: "monostructural" },
  { code: "stair_climber", nameEn: "Stair climber", nameEs: "Escaladora", category: "monostructural" },
  { code: "ski_erg", nameEn: "SkiErg", nameEs: "SkiErg", category: "monostructural" },
  { code: "row_erg", nameEn: "Rower (Concept2)", nameEs: "Remoergómetro", category: "monostructural" },
  { code: "echo_bike", nameEn: "Echo bike", nameEs: "Echo bike", category: "monostructural" },
  { code: "jump_rope_single", nameEn: "Single-unders", nameEs: "Comba simples", category: "monostructural" },
  { code: "jump_rope_double", nameEn: "Double-unders", nameEs: "Dobles con la comba", category: "monostructural" },
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
  console.log(`✓ ${created} created, ${updated} updated. Total movements now: ${await prisma.movement.count()}`);
  await prisma.$disconnect();
})();
