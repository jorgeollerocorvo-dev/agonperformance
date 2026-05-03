import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Check if any athletes were created from the intake form
const athletes = await prisma.athlete.findMany({
  include: {
    coachProfile: { include: { user: { select: { email: true } } } }
  },
  orderBy: { createdAt: "desc" },
  take: 10,
});

console.log("Total athletes:", athletes.length);
console.log("\nRecent athletes:");
athletes.forEach(a => {
  console.log(`- ${a.fullName} (${a.email}) - Coach: ${a.coachProfile.user.email}`);
});

await prisma.$disconnect();
