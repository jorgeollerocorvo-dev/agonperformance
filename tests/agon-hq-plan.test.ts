import { test } from "node:test";
import assert from "node:assert/strict";
import { qatarDay, dailyPlan, draftKey } from "../lib/agon-hq-plan";
test("Qatar date rolls over at 21:00 UTC", () => {
  assert.equal(qatarDay(new Date("2026-11-25T20:59:59Z")), "2026-11-25");
  assert.equal(qatarDay(new Date("2026-11-25T21:00:00Z")), "2026-11-26");
});
test("four reels and three other posts per week", () => {
  const plans = Array.from({length: 7}, (_, i) => dailyPlan("2026-11-" + (22+i)));
  assert.equal(plans.filter(p => p.format === "Reel").length, 4);
  assert.equal(new Set(plans.map(p => draftKey(p.day))).size, 7);
});
