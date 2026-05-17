import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  // Check if Jorge's coach profile exists
  const jorge = await prisma.user.findUnique({
    where: { email: "jorge@agonperformance.com" },
    include: { coachProfile: true },
  });

  console.log("=== JORGE USER ===");
  console.log("User ID:", jorge?.id);
  console.log("Coach Profile ID:", jorge?.coachProfile?.id);
  console.log("");

  // Check Ravi athlete
  const ravi = await prisma.athlete.findUnique({
    where: { athleteKey: "ravi" },
    include: { coachProfile: { include: { user: true } } },
  });

  console.log("=== RAVI ATHLETE ===");
  console.log("Ravi ID:", ravi?.id);
  console.log("Ravi athleteKey:", ravi?.athleteKey);
  console.log("Ravi coachProfileId:", ravi?.coachProfileId);
  console.log("Ravi coach email:", ravi?.coachProfile?.user?.email);
  console.log("Should be Jorge?", ravi?.coachProfile?.user?.email === "jorge@agonperformance.com");
  console.log("");

  // Check Wasmiya athlete
  const wasmiya = await prisma.athlete.findUnique({
    where: { athleteKey: "wasmiya" },
    include: { coachProfile: { include: { user: true } } },
  });

  console.log("=== WASMIYA ATHLETE ===");
  console.log("Wasmiya ID:", wasmiya?.id);
  console.log("Wasmiya athleteKey:", wasmiya?.athleteKey);
  console.log("Wasmiya coachProfileId:", wasmiya?.coachProfileId);
  console.log("Wasmiya coach email:", wasmiya?.coachProfile?.user?.email);
  console.log("Should be Jorge?", wasmiya?.coachProfile?.user?.email === "jorge@agonperformance.com");
  console.log("");

  // Check if they appear in Jorge's athlete list
  if (jorge?.coachProfile) {
    const athletesInJorgeList = await prisma.athlete.findMany({
      where: { coachProfileId: jorge.coachProfile.id },
    });
    console.log("=== JORGE'S ATHLETES ===");
    console.log("Total athletes:", athletesInJorgeList.length);
    athletesInJorgeList.forEach((a) => {
      console.log(`- ${a.fullName} (${a.athleteKey}) - ID: ${a.id}`);
    });
  }
} catch (error) {
  console.error("Error:", error.message);
}

await prisma.$disconnect();
