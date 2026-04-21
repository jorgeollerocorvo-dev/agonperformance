import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const r = await p.coachProfile.updateMany({
    where: { handle: null, user: { email: "jorge@agonperformance.com" } },
    data: { handle: "jorge-ollero" },
  });
  console.log("updated", r);
  await p.$disconnect();
})();
