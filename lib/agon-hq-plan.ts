export function qatarDay(now = new Date()): string {
  return new Date(now.getTime() + 3 * 3600000).toISOString().slice(0, 10);
}
export function dailyPlan(day: string) {
  const date = new Date(day + "T12:00:00Z");
  const topics = [
    ["Reel", "Training education"], ["Carousel", "Catalog spotlight"],
    ["Reel", "Strength and conditioning"], ["Post", "Nutrition education"],
    ["Reel", "Catalog spotlight"], ["Reel", "Coaching and performance"],
    ["Carousel", "Recovery and lifestyle"],
  ] as const;
  const [format, topic] = topics[date.getUTCDay()];
  return { day, format, topic, plannedTime: "19:00 Asia/Qatar" };
}
export const prefix = "agon-hq-v1:";
export const pauseKey = prefix + "pause";
export const draftKey = (day: string) => prefix + "draft:" + day;
