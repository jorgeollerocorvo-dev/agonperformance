import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { email: "jorge.ollero.corvo@gmail.com" } });
  if (!u?.passwordHash) { console.log("NO HASH"); process.exit(1); }
  const ok = await bcrypt.compare("@Qatar2026", u.passwordHash);
  const oldOk = await bcrypt.compare("L5fzN4eBOR25", u.passwordHash);
  console.log(`new password matches: ${ok}, old password still works: ${oldOk}`);
  console.log(`hash prefix: ${u.passwordHash.slice(0, 20)}...`);
  await p.$disconnect();
})();
