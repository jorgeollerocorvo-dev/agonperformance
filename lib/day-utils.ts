/**
 * Calculate the day of week name from a date string (YYYY-MM-DD)
 * This is timezone-safe and doesn't rely on Date object's locale behavior
 */
export function getDayNameFromDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeekIndex = date.getDay();
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return daysOfWeek[dayOfWeekIndex];
}

/**
 * Calculate the day of week name from a Date object
 * Uses the date's year, month, day without timezone conversion
 */
export function getDayNameFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const calculatedDate = new Date(year, month, day);
  const dayOfWeekIndex = calculatedDate.getDay();
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return daysOfWeek[dayOfWeekIndex];
}
