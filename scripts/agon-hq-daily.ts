import { prisma } from "../lib/prisma";
import { runHqDraft } from "../lib/agon-hq";
async function main() {
  try { console.log("AGON HQ daily:", await runHqDraft()); }
  finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("AGON HQ daily job failed"); process.exitCode = 1; });
