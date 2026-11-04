import { dateToIso, isoToDate, todayIn } from "@/lib/dates";
import { fieldErrors } from "@/lib/validation/auth";
import { waterSchema } from "@/lib/validation/food";
import { db } from "@/server/db";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string; fields?: Record<string, string> };

export interface WaterDto {
  id: string;
  loggedAt: string;
  date: string;
  amountMl: number;
}

const dto = (w: { id: string; loggedAt: Date; logDate: Date; amountMl: number }): WaterDto => ({
  id: w.id,
  loggedAt: w.loggedAt.toISOString(),
  date: dateToIso(w.logDate),
  amountMl: w.amountMl,
});

/** US-15.1/15.2 */
export async function addWater(userId: string, timezone: string, raw: unknown): Promise<R<{ log: WaterDto; totalMl: number }>> {
  const p = waterSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Lượng nước chưa hợp lệ", fields: fieldErrors(p.error) };
  const date = p.data.date ?? todayIn(timezone);
  const log = await db.waterLog.create({ data: { userId, loggedAt: new Date(), logDate: isoToDate(date), amountMl: p.data.amountMl } });
  return { ok: true, log: dto(log), totalMl: await waterTotal(userId, date) };
}

export async function listWater(userId: string, date: string): Promise<WaterDto[]> {
  const rows = await db.waterLog.findMany({ where: { userId, logDate: isoToDate(date) }, orderBy: { loggedAt: "asc" } });
  return rows.map(dto);
}

export async function waterTotal(userId: string, date: string): Promise<number> {
  const r = await db.waterLog.aggregate({ where: { userId, logDate: isoToDate(date) }, _sum: { amountMl: true } });
  return r._sum.amountMl ?? 0;
}

/** US-15.3 */
export async function updateWater(userId: string, id: string, amountMl: number): Promise<R<{ log: WaterDto }>> {
  const p = waterSchema.pick({ amountMl: true }).safeParse({ amountMl });
  if (!p.success) return { ok: false, error: "Lượng nước chưa hợp lệ", fields: fieldErrors(p.error) };
  const r = await db.waterLog.updateMany({ where: { id, userId }, data: { amountMl: p.data.amountMl } });
  if (!r.count) return { ok: false, error: "Không tìm thấy lần uống" };
  return { ok: true, log: dto(await db.waterLog.findFirstOrThrow({ where: { id, userId } })) };
}

/** Returns the removed entry so the client can offer Undo via `restoreWater`. */
export async function deleteWater(userId: string, id: string): Promise<R<{ removed: WaterDto }>> {
  const cur = await db.waterLog.findFirst({ where: { id, userId } });
  if (!cur) return { ok: false, error: "Không tìm thấy lần uống" };
  await db.waterLog.delete({ where: { id } });
  return { ok: true, removed: dto(cur) };
}

export async function restoreWater(userId: string, w: WaterDto): Promise<R<{ log: WaterDto }>> {
  const log = await db.waterLog.create({ data: { userId, loggedAt: new Date(w.loggedAt), logDate: isoToDate(w.date), amountMl: w.amountMl } });
  return { ok: true, log: dto(log) };
}
