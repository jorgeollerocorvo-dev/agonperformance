import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// Qatar timezone (UTC+3)
const QATAR_TIMEZONE = "Asia/Qatar";

/**
 * Format a date in Qatar timezone for display
 * @param date - The date to format
 * @param formatStr - The format string (date-fns format)
 * @returns Formatted date string in Qatar timezone
 */
export function formatInQatarTime(
  date: Date | string,
  formatStr: string = "PPpp"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const zonedDate = toZonedTime(dateObj, QATAR_TIMEZONE);
  return format(zonedDate, formatStr);
}

/**
 * Format for consultation display (weekday, month day, hour:minute)
 * Example: "Mon, May 6, 11:00 AM"
 */
export function formatConsultationTime(date: Date | string): string {
  return formatInQatarTime(date, "EEE, MMM d, h:mm a");
}

/**
 * Format for slot display (short weekday, month day, hour:minute)
 * Example: "Mon, May 6, 11:00 AM"
 */
export function formatSlotTime(date: Date | string): string {
  return formatInQatarTime(date, "EEE, MMM d, h:mm a");
}

/**
 * Format for end time only (hour:minute)
 * Example: "11:00 AM"
 */
export function formatEndTime(date: Date | string): string {
  return formatInQatarTime(date, "h:mm a");
}

/**
 * Format for detailed booking display (full date and time)
 * Example: "Monday, May 6, 2025 at 11:00 AM"
 */
export function formatBookingTime(date: Date | string): string {
  return formatInQatarTime(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
}
