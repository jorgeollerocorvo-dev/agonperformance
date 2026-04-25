import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const all = await p.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  console.log(`Total inquiries in DB: ${all.length}`);
  for (const i of all) {
    console.log(`  ${i.createdAt.toISOString().slice(0,16)} | source=${i.source ?? "—"} | name=${i.contactName ?? "—"} | email=${i.anonymousEmail ?? "—"} | phone=${i.anonymousPhone ?? "—"} | ig=${i.contactInstagram ?? "—"} | status=${i.status}`);
  }
  await p.$disconnect();
})();
