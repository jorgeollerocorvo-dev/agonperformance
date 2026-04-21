import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  // Madrid center: ~40.4168, -3.7038. 20km radius.
  const r = await p.coachProfile.updateMany({
    where: { user: { email: "jorge.ollero.corvo@gmail.com" } },
    data: {
      homeBaseLat: 40.4168,
      homeBaseLng: -3.7038,
      homeBaseCity: "Madrid",
      serviceAreaRadiusKm: 20,
      listingStatus: "APPROVED",
    },
  });
  // Demo coach Jorge too
  const r2 = await p.coachProfile.updateMany({
    where: { user: { email: "jorge@agonperformance.com" } },
    data: {
      homeBaseLat: 40.4381,
      homeBaseLng: -3.6795,
      homeBaseCity: "Madrid",
      serviceAreaRadiusKm: 15,
      listingStatus: "APPROVED",
    },
  });
  console.log("updated", { jorge_owner: r.count, demo_jorge: r2.count });
  await p.$disconnect();
})();
