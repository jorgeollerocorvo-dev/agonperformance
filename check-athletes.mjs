import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const athletes = await prisma.athlete.findMany({
  where: {
    fullName: { in: ["Wasmiya", "Ravi"] }
  },
  select: {
    id: true,
    fullName: true,
    coachProfileId: true
  }
});

console.log("Athletes found:");
console.log(JSON.stringify(athletes, null, 2));

if (athletes.length === 0) {
  console.log("\nNo athletes with those names. Checking all athletes:");
  const all = await prisma.athlete.findMany({ 
    select: { id: true, fullName: true, coachProfileId: true },
    take: 5 
  });
  console.log(JSON.stringify(all, null, 2));
}

await prisma.$disconnect();
