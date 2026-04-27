import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = { code: string; nameEn: string; nameEs?: string; nameAr?: string; category: string };

// Single-muscle stretches. Idempotent (upsert by code). Auto-resolver picks
// a YouTube video for each on first athlete view.
const ROWS: Row[] = [
  // Upper back / lats
  { code: "lat_stretch_overhead", nameEn: "Lat stretch (overhead)", nameEs: "Estiramiento de dorsal (overhead)", category: "stretch" },
  { code: "lat_stretch_kneeling", nameEn: "Kneeling lat stretch", nameEs: "Estiramiento de dorsal de rodillas", category: "stretch" },
  { code: "lat_stretch_band", nameEn: "Band-assisted lat stretch", nameEs: "Estiramiento de dorsal con banda", category: "stretch" },
  { code: "rhomboid_stretch", nameEn: "Rhomboid stretch", nameEs: "Estiramiento de romboides", category: "stretch" },
  { code: "trap_stretch", nameEn: "Upper trap stretch", nameEs: "Estiramiento de trapecio superior", category: "stretch" },
  { code: "neck_lateral_stretch", nameEn: "Lateral neck stretch", nameEs: "Estiramiento lateral del cuello", category: "stretch" },

  // Chest / shoulders
  { code: "chest_stretch_doorway", nameEn: "Doorway chest stretch", nameEs: "Estiramiento pectoral en puerta", category: "stretch" },
  { code: "chest_stretch_floor", nameEn: "Floor chest stretch", nameEs: "Estiramiento pectoral en suelo", category: "stretch" },
  { code: "chest_stretch_band", nameEn: "Band chest stretch", nameEs: "Estiramiento pectoral con banda", category: "stretch" },
  { code: "shoulder_cross_body_stretch", nameEn: "Cross-body shoulder stretch", nameEs: "Estiramiento de hombro cruzado", category: "stretch" },
  { code: "shoulder_sleeper_stretch", nameEn: "Sleeper stretch (shoulder)", nameEs: "Sleeper stretch (hombro)", category: "stretch" },
  { code: "shoulder_external_rotation_stretch", nameEn: "Shoulder external-rotation stretch", nameEs: "Estiramiento rotación externa hombro", category: "stretch" },
  { code: "tricep_stretch_overhead", nameEn: "Overhead tricep stretch", nameEs: "Estiramiento de tríceps overhead", category: "stretch" },
  { code: "bicep_stretch_wall", nameEn: "Wall bicep stretch", nameEs: "Estiramiento de bíceps en pared", category: "stretch" },
  { code: "wrist_flexor_stretch", nameEn: "Wrist flexor stretch", nameEs: "Estiramiento de flexores de muñeca", category: "stretch" },
  { code: "wrist_extensor_stretch", nameEn: "Wrist extensor stretch", nameEs: "Estiramiento de extensores de muñeca", category: "stretch" },
  { code: "forearm_stretch", nameEn: "Forearm stretch", nameEs: "Estiramiento de antebrazo", category: "stretch" },

  // Hips / glutes
  { code: "hip_flexor_stretch_kneeling", nameEn: "Kneeling hip-flexor stretch", nameEs: "Estiramiento de psoas de rodillas", category: "stretch" },
  { code: "hip_flexor_stretch_couch", nameEn: "Couch stretch (hip flexor)", nameEs: "Couch stretch (flexor de cadera)", category: "stretch" },
  { code: "glute_stretch_figure_4", nameEn: "Figure-4 glute stretch", nameEs: "Estiramiento de glúteo (figura-4)", category: "stretch" },
  { code: "glute_stretch_seated", nameEn: "Seated glute stretch", nameEs: "Estiramiento de glúteo sentado", category: "stretch" },
  { code: "piriformis_stretch", nameEn: "Piriformis stretch", nameEs: "Estiramiento de piriforme", category: "stretch" },
  { code: "adductor_stretch_butterfly", nameEn: "Butterfly adductor stretch", nameEs: "Estiramiento de aductores (mariposa)", category: "stretch" },
  { code: "adductor_stretch_lunge", nameEn: "Cossack adductor stretch", nameEs: "Estiramiento de aductores (cossack)", category: "stretch" },

  // Hamstrings / quads
  { code: "hamstring_stretch_standing", nameEn: "Standing hamstring stretch", nameEs: "Estiramiento de isquiotibiales de pie", category: "stretch" },
  { code: "hamstring_stretch_seated", nameEn: "Seated hamstring stretch", nameEs: "Estiramiento de isquiotibiales sentado", category: "stretch" },
  { code: "hamstring_stretch_supine", nameEn: "Supine hamstring stretch", nameEs: "Estiramiento de isquiotibiales tumbado", category: "stretch" },
  { code: "quad_stretch_standing", nameEn: "Standing quad stretch", nameEs: "Estiramiento de cuádriceps de pie", category: "stretch" },
  { code: "quad_stretch_kneeling", nameEn: "Kneeling quad stretch", nameEs: "Estiramiento de cuádriceps de rodillas", category: "stretch" },

  // Calf / ankle
  { code: "calf_stretch_wall", nameEn: "Wall calf stretch", nameEs: "Estiramiento de gemelo en pared", category: "stretch" },
  { code: "calf_stretch_step", nameEn: "Step calf stretch", nameEs: "Estiramiento de gemelo en escalón", category: "stretch" },
  { code: "soleus_stretch", nameEn: "Soleus stretch", nameEs: "Estiramiento de sóleo", category: "stretch" },
  { code: "ankle_dorsiflexion_stretch", nameEn: "Ankle dorsiflexion stretch", nameEs: "Estiramiento de dorsiflexión de tobillo", category: "stretch" },
  { code: "achilles_stretch", nameEn: "Achilles stretch", nameEs: "Estiramiento de Aquiles", category: "stretch" },

  // Lower back / spine
  { code: "lumbar_rotation_stretch", nameEn: "Lumbar rotation stretch", nameEs: "Estiramiento de rotación lumbar", category: "stretch" },
  { code: "qL_stretch_side_bend", nameEn: "Quadratus lumborum side-bend stretch", nameEs: "Estiramiento de cuadrado lumbar (inclinación lateral)", category: "stretch" },
  { code: "spinal_twist_supine", nameEn: "Supine spinal twist", nameEs: "Torsión espinal supina", category: "stretch" },
  { code: "tspine_extension_foam_roller", nameEn: "T-spine extension over foam roller", nameEs: "Extensión torácica sobre foam roller", category: "stretch" },
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
