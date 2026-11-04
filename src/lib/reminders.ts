// Pure reminder scheduling logic (ADR-0001 §2.6, PRD US-24/25). Runs in the browser; unit-tested.

export interface ReminderLike {
  id: string;
  type: "water" | "meal";
  meal: "breakfast" | "lunch" | "dinner" | "snack" | null;
  enabled: boolean;
  times: string[];
  startTime: string | null;
  endTime: string | null;
  intervalHours: number | null;
  daysOfWeek: number[];
  snoozeUntil: string | null;
}

export const QUIET_START = "22:00";
export const QUIET_END = "06:00";
export const MAX_SNOOZES = 3;
export const SKIP_IF_LOGGED_WITHIN_MIN = 30;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return h * 60 + m;
};

/** Scheduled `HH:mm` slots of a reminder for any day it applies to. */
export function slotsOf(r: ReminderLike): string[] {
  if (r.type === "meal") return r.times;
  if (!r.startTime || !r.endTime || !r.intervalHours) return [];
  const out: string[] = [];
  for (let m = toMin(r.startTime); m <= toMin(r.endTime); m += r.intervalHours * 60) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

/** 22:00–06:00 is quiet unless the user explicitly set that slot (PRD §8.6) — explicit slots are always allowed. */
export function isQuietHour(hhmm: string): boolean {
  const m = toMin(hhmm);
  return m >= toMin(QUIET_START) || m < toMin(QUIET_END);
}

/** ISO weekday 1=Mon..7=Sun of a local `Date`. */
export function isoWeekday(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}

export interface DueInput {
  reminder: ReminderLike;
  /** Local wall-clock "now" in the user's timezone. */
  now: Date;
  /** Local minutes since midnight of the user's last water/meal log, or null. */
  lastLoggedMinAgo: number | null;
  /** Slot keys already shown today (`${id}@HH:mm`). */
  shown: ReadonlySet<string>;
}

/**
 * Returns the slot (HH:mm) that is due right now, or null. A slot is due from its time until 5 minutes later,
 * once per day, only on selected weekdays, not while snoozed, and not if the user logged the same thing within 30 min.
 */
export function dueSlot({ reminder: r, now, lastLoggedMinAgo, shown }: DueInput): string | null {
  if (!r.enabled || !r.daysOfWeek.includes(isoWeekday(now))) return null;
  if (r.snoozeUntil && new Date(r.snoozeUntil) > now) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const slot of slotsOf(r)) {
    const s = toMin(slot);
    if (nowMin < s || nowMin > s + 5) continue;
    if (shown.has(`${r.id}@${slot}`)) continue;
    if (lastLoggedMinAgo !== null && lastLoggedMinAgo <= SKIP_IF_LOGGED_WITHIN_MIN) continue;
    return slot;
  }
  return null;
}
