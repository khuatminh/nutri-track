import { fieldErrors } from "@/lib/validation/auth";
import { reminderSchema } from "@/lib/validation/food";
import { db } from "@/server/db";
import type { Meal, ReminderType } from "@prisma/client";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string; fields?: Record<string, string> };

export interface ReminderDto {
  id: string;
  type: ReminderType;
  meal: Meal | null;
  enabled: boolean;
  times: string[];
  startTime: string | null;
  endTime: string | null;
  intervalHours: number | null;
  daysOfWeek: number[];
  snoozeUntil: string | null;
}

const dto = (r: Awaited<ReturnType<typeof db.reminder.findFirstOrThrow>>): ReminderDto => ({
  id: r.id,
  type: r.type,
  meal: r.meal,
  enabled: r.enabled,
  times: r.times,
  startTime: r.startTime,
  endTime: r.endTime,
  intervalHours: r.intervalHours,
  daysOfWeek: r.daysOfWeek,
  snoozeUntil: r.snoozeUntil?.toISOString() ?? null,
});

export async function listReminders(userId: string): Promise<ReminderDto[]> {
  return (await db.reminder.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { meal: "asc" }] })).map(dto);
}

/** US-24: one water reminder and one per meal — saving replaces the existing config of that kind. */
export async function saveReminder(userId: string, raw: unknown): Promise<R<{ reminder: ReminderDto }>> {
  const p = reminderSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Cấu hình nhắc nhở chưa hợp lệ", fields: fieldErrors(p.error) };
  const i = p.data;
  const data = {
    enabled: i.enabled,
    times: i.type === "meal" ? i.times : [],
    startTime: i.type === "water" ? (i.startTime ?? null) : null,
    endTime: i.type === "water" ? (i.endTime ?? null) : null,
    intervalHours: i.type === "water" ? (i.intervalHours ?? null) : null,
    daysOfWeek: [...new Set(i.daysOfWeek)].sort(),
  };
  const meal = i.type === "meal" ? (i.meal ?? null) : null;
  const existing = await db.reminder.findFirst({ where: { userId, type: i.type, meal } });
  const row = existing
    ? await db.reminder.update({ where: { id: existing.id }, data })
    : await db.reminder.create({ data: { userId, type: i.type, meal, ...data } });
  return { ok: true, reminder: dto(row) };
}

export async function setReminderEnabled(userId: string, id: string, enabled: boolean): Promise<R> {
  const r = await db.reminder.updateMany({ where: { id, userId }, data: { enabled } });
  return r.count ? { ok: true } : { ok: false, error: "Không tìm thấy nhắc nhở" };
}

/** US-25.1: snooze 30 minutes. */
export async function snoozeReminder(userId: string, id: string, minutes = 30): Promise<R> {
  const r = await db.reminder.updateMany({ where: { id, userId }, data: { snoozeUntil: new Date(Date.now() + minutes * 60_000) } });
  return r.count ? { ok: true } : { ok: false, error: "Không tìm thấy nhắc nhở" };
}

export async function deleteReminder(userId: string, id: string): Promise<R> {
  const r = await db.reminder.deleteMany({ where: { id, userId } });
  return r.count ? { ok: true } : { ok: false, error: "Không tìm thấy nhắc nhở" };
}
