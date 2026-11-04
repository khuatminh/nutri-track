import { dateToIso, isoToDate, todayIn, addDays } from "@/lib/dates";
import { weightChange, weightTrend, type WeightChange, type WeightPoint } from "@/lib/nutrition";
import { fieldErrors } from "@/lib/validation/auth";
import { weightSchema } from "@/lib/validation/food";
import { db } from "@/server/db";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string; fields?: Record<string, string>; needsConfirm?: boolean };

export interface WeightDto {
  id: string;
  date: string;
  weightKg: number;
  note: string | null;
}

const dto = (w: { id: string; logDate: Date; weightKg: number; note: string | null }): WeightDto => ({
  id: w.id,
  date: dateToIso(w.logDate),
  weightKg: w.weightKg,
  note: w.note,
});

/**
 * US-16: one entry per day. When one exists, the caller must pass `overwrite: true` after confirming.
 * Future dates are rejected (US-16.3). Targets are NOT changed here — see profile `getRetargetSuggestion` (US-18).
 */
export async function saveWeight(userId: string, timezone: string, raw: unknown, opts: { overwrite?: boolean } = {}): Promise<R<{ log: WeightDto; replaced: boolean }>> {
  const p = weightSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Cân nặng chưa hợp lệ", fields: fieldErrors(p.error) };
  const { date, weightKg, note } = p.data;
  if (date > todayIn(timezone)) return { ok: false, error: "Không thể ghi cân nặng cho ngày tương lai", fields: { date: "Chọn ngày không muộn hơn hôm nay" } };
  const logDate = isoToDate(date);
  const existing = await db.weightLog.findUnique({ where: { userId_logDate: { userId, logDate } } });
  if (existing && !opts.overwrite) {
    return { ok: false, error: "Ngày này đã có cân nặng. Bạn muốn cập nhật?", needsConfirm: true };
  }
  const log = await db.weightLog.upsert({
    where: { userId_logDate: { userId, logDate } },
    create: { userId, logDate, weightKg, note: note ?? null },
    update: { weightKg, note: note ?? null },
  });
  return { ok: true, log: dto(log), replaced: !!existing };
}

export async function deleteWeight(userId: string, id: string): Promise<R<{ removed: WeightDto }>> {
  const cur = await db.weightLog.findFirst({ where: { id, userId } });
  if (!cur) return { ok: false, error: "Không tìm thấy bản ghi" };
  await db.weightLog.delete({ where: { id, userId } });
  return { ok: true, removed: dto(cur) };
}

export type WeightRange = 30 | 90 | "all";

export interface WeightChart {
  points: WeightDto[];
  trend: WeightPoint[];
  change: WeightChange;
  targetWeightKg: number | null;
  /** Fewer than 2 records → show the empty state (US-17.3). */
  isEmpty: boolean;
}

/** US-17: points for the chart (not interpolated), 7-day trend, deltas and goal weight. */
export async function getWeightChart(userId: string, timezone: string, range: WeightRange = 30): Promise<WeightChart> {
  const since = range === "all" ? undefined : isoToDate(addDays(todayIn(timezone), -range));
  const [rows, all, profile] = await Promise.all([
    db.weightLog.findMany({ where: { userId, ...(since ? { logDate: { gte: since } } : {}) }, orderBy: { logDate: "asc" } }),
    db.weightLog.findMany({ where: { userId }, orderBy: { logDate: "asc" }, select: { logDate: true, weightKg: true } }),
    db.profile.findUnique({ where: { userId }, select: { targetWeightKg: true } }),
  ]);
  const points = rows.map(dto);
  const asPoints = (xs: Array<{ date: string; weightKg: number }>): WeightPoint[] => xs.map((x) => ({ date: x.date, weightKg: x.weightKg }));
  return {
    points,
    trend: weightTrend(asPoints(points)),
    change: weightChange(all.map((r) => ({ date: dateToIso(r.logDate), weightKg: r.weightKg }))),
    targetWeightKg: profile?.targetWeightKg ?? null,
    isEmpty: all.length < 2,
  };
}

export async function latestWeight(userId: string): Promise<WeightDto | null> {
  const w = await db.weightLog.findFirst({ where: { userId }, orderBy: { logDate: "desc" } });
  return w && dto(w);
}

/** US-16.4: complete history, newest first. */
export async function listWeights(userId: string): Promise<WeightDto[]> {
  return (await db.weightLog.findMany({ where: { userId }, orderBy: { logDate: "desc" } })).map(dto);
}

export async function updateWeight(userId: string, timezone: string, id: string, raw: unknown): Promise<R<{ log: WeightDto }>> {
  const p = weightSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Cân nặng chưa hợp lệ", fields: fieldErrors(p.error) };
  const { date, weightKg, note } = p.data;
  if (date > todayIn(timezone)) return { ok: false, error: "Không thể ghi cân nặng cho ngày tương lai", fields: { date: "Chọn ngày không muộn hơn hôm nay" } };
  const cur = await db.weightLog.findFirst({ where: { id, userId } });
  if (!cur) return { ok: false, error: "Không tìm thấy bản ghi" };
  try {
    const log = await db.weightLog.update({ where: { id, userId }, data: { logDate: isoToDate(date), weightKg, note: note ?? null } });
    return { ok: true, log: dto(log) };
  } catch (e) {
    // The unique constraint also protects against concurrent writes to the target date.
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002")
      return { ok: false, error: "Ngày này đã có cân nặng. Bạn muốn cập nhật?", needsConfirm: true };
    throw e;
  }
}
