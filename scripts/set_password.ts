import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const p = new PrismaClient();
const email = process.argv[2];
const pw = process.argv[3];
if (!email || !pw) { console.error("usage: tsx scripts/set_password.ts <email> <password>"); process.exit(1); }
(async () => {
  const hash = await bcrypt.hash(pw, 10);
  const r = await p.user.updateMany({ where: { email }, data: { passwordHash: hash } });
  console.log(`updated ${r.count} user(s) for ${email}`);
  await p.$disconnect();
})();
