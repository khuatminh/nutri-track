import { describe, expect, it } from "vitest";
import { dueSlot, isQuietHour, slotsOf, type ReminderLike } from "./reminders";

const water: ReminderLike = { id: "w", type: "water", meal: null, enabled: true, times: [], startTime: "08:00", endTime: "12:00", intervalHours: 2, daysOfWeek: [1, 2, 3, 4, 5, 6, 7], snoozeUntil: null };
const lunch: ReminderLike = { id: "m", type: "meal", meal: "lunch", enabled: true, times: ["12:00"], startTime: null, endTime: null, intervalHours: null, daysOfWeek: [3], snoozeUntil: null };
const at = (h: number, m: number) => new Date(2026, 10, 4, h, m); // Wed 2026-11-04

describe("reminders", () => {
  it("expands water slots", () => expect(slotsOf(water)).toEqual(["08:00", "10:00", "12:00"]));
  it("quiet hours", () => {
    expect(isQuietHour("22:00")).toBe(true);
    expect(isQuietHour("05:59")).toBe(true);
    expect(isQuietHour("06:00")).toBe(false);
  });
  it("fires within 5 minutes of the slot, once", () => {
    const base = { reminder: lunch, lastLoggedMinAgo: null, shown: new Set<string>() };
    expect(dueSlot({ ...base, now: at(12, 3) })).toBe("12:00");
    expect(dueSlot({ ...base, now: at(12, 6) })).toBeNull();
    expect(dueSlot({ ...base, now: at(11, 59) })).toBeNull();
    expect(dueSlot({ ...base, now: at(12, 3), shown: new Set(["m@12:00"]) })).toBeNull();
  });
  it("respects weekday, enabled, snooze and recent logging", () => {
    const base = { lastLoggedMinAgo: null, shown: new Set<string>(), now: at(12, 1) };
    expect(dueSlot({ ...base, reminder: { ...lunch, daysOfWeek: [1] } })).toBeNull();
    expect(dueSlot({ ...base, reminder: { ...lunch, enabled: false } })).toBeNull();
    expect(dueSlot({ ...base, reminder: { ...lunch, snoozeUntil: new Date(2026, 10, 4, 12, 30).toISOString() } })).toBeNull();
    expect(dueSlot({ ...base, reminder: lunch, lastLoggedMinAgo: 20 })).toBeNull();
    expect(dueSlot({ ...base, reminder: lunch, lastLoggedMinAgo: 45 })).toBe("12:00");
  });
  it("handles incomplete water config", () => expect(slotsOf({ ...water, intervalHours: null })).toEqual([]));
});
