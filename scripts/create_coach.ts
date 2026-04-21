import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] ?? "Coach";
const handle = process.argv[5] ?? null;

if (!email || !password) {
  console.error("Usage: tsx scripts/create_coach.ts <email> <password> [fullName] [handle]");
  process.exit(1);
}

(async () => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`user ${email} already exists (id=${existing.id}) — skipping create`);
    process.exit(0);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      displayName: fullName,
      preferredLanguage: "EN",
      timezone: "Europe/Madrid",
      roles: { create: [{ role: "COACH" }] },
      coachProfile: {
        create: {
          handle,
          providerType: "PERSONAL_TRAINER",
          listingStatus: "DRAFT",
        },
      },
    },
  });
  console.log(`created coach ${email} (id=${user.id})`);
  await prisma.$disconnect();
})();
