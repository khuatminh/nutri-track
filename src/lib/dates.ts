import { formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TZ = "Asia/Ho_Chi_Minh";
const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** Today's date as `YYYY-MM-DD` in the user's timezone (day changes at local 00:00, PRD §8.3). */
export function todayIn(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  return formatInTimeZone(now, tz, "yyyy-MM-dd");
}

/** ISO date `YYYY-MM-DD` → UTC-midnight Date (for Prisma `@db.Date` columns). */
export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToIso(d);
}

/** "Thứ Ba, 04/11/2026" (US-13.6). */
export function fmtLongDate(iso: string): string {
  const d = isoToDate(iso);
  const [y, m, day] = iso.split("-");
  return `${WEEKDAYS[d.getUTCDay()]}, ${day}/${m}/${y}`;
}

export function fmtShortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Monday of the week containing `iso` (weeks run Mon–Sun, PRD §8.3). */
export function startOfWeek(iso: string): string {
  const dow = isoToDate(iso).getUTCDay();
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}
