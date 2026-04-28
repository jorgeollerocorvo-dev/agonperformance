import { generateProgramFromBrief } from "../lib/ai-generate-program";

(async () => {
  const t0 = Date.now();
  const program = await generateProgramFromBrief({
    athleteName: "Ravi",
    athleteContext: "Sex: M\nAge: 57\nDivision: Masters 55-59 CrossFit\nStanding goals: Improve strict HSPU, peak deadlift to 110 kg.\nTraining frequency: 6 days/week, rest Friday.",
    goalOverride: "Build a 2-week deload + retest block",
    needs: "Light volume, technique focus, end with retesting Back Squat 3RM and Strict HSPU max UB.",
    durationWeeks: 2,
    daysPerWeek: 6,
    style: "crossfit",
    equipment: "full gym",
  });
  console.log(`✓ ${Date.now() - t0}ms`);
  console.log(`Title: ${program.title}`);
  console.log(`Weeks: ${program.weeks?.length ?? 0}`);
  for (const w of program.weeks ?? []) {
    const trainingDays = w.days.filter((d) => !d.isRest).length;
    console.log(`  Week ${w.weekNumber}: ${trainingDays} training days, ${w.days.filter((d) => d.isRest).length} rest`);
  }
})();
