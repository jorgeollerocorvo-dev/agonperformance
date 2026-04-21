import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const demo = await p.user.findUnique({ where: { email: "jorge@agonperformance.com" }, include: { coachProfile: true } });
  const main = await p.user.findUnique({ where: { email: "jorge.ollero.corvo@gmail.com" }, include: { coachProfile: true } });
  if (!main?.coachProfile) { console.log("main coach not found"); process.exit(1); }

  if (demo?.coachProfile) {
    const moved = await p.athlete.updateMany({
      where: { coachProfileId: demo.coachProfile.id },
      data: { coachProfileId: main.coachProfile.id },
    });
    console.log(`transferred ${moved.count} athletes to main coach`);
    await p.user.delete({ where: { id: demo.id } });
    console.log("deleted demo user jorge@agonperformance.com");
  } else {
    console.log("demo user already gone");
  }

  await p.coachProfile.update({
    where: { id: main.coachProfile.id },
    data: {
      homeBaseLat: null,
      homeBaseLng: null,
      homeBaseCity: null,
      serviceAreaRadiusKm: null,
    },
  });
  console.log("cleared Madrid coords on main coach");

  await p.$disconnect();
})();
