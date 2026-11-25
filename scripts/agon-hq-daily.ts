import { prisma } from "../lib/prisma";
import { runHqDraft } from "../lib/agon-hq";
import { pauseKey } from "../lib/agon-hq-plan";

async function main() {
  try {
    // Initial enablement is explicit in service config. Preserve any later owner pause.
    if (process.env.AGON_HQ_AUTOMATION_ENABLED === "true") {
      await prisma.aiCache.upsert({
        where: { promptHash: pauseKey },
        create: { promptHash: pauseKey, response: "running", provider: "agon-hq-control" },
        update: {},
      });
    }
    const result = await runHqDraft();
    console.log("AGON HQ daily:", result);
    if (result === "failed") process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("AGON HQ daily job failed"); process.exitCode = 1; });
