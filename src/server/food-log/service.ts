import type { FoodLog, Meal } from "@prisma/client";
import { addDays, isoToDate, dateToIso, todayIn } from "@/lib/dates";
import { RANGES } from "@/lib/nutrition/constants";
import { hasMissingMicro, nutrientsForGrams, scaleNutrients, snapshot, type Nutrients } from "@/lib/nutrition";
import { addLogSchema, quickLogSchema, updateLogSchema } from "@/lib/validation/food";
import { fieldErrors } from "@/lib/validation/auth";
import { db } from "@/server/db";
import { hydrate, recipeServing, type FoodHit } from "@/server/foods/search";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; fields?: Record<string, string> };

export interface LogDto {
  id: string;
  date: string;
  meal: Meal;
  foodId: string | null;
  recipeId: string | null;
  name: string;
  quantity: number;
  servingLabel: string | null;
  grams: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  missingMicro: boolean;
}

export const toDto = (l: FoodLog): LogDto => ({
  id: l.id,
  date: dateToIso(l.logDate),
  meal: l.meal,
  foodId: l.foodId,
  recipeId: l.recipeId,
  name: l.nameSnapshot,
  quantity: l.quantity,
  servingLabel: l.servingLabel,
  grams: l.grams,
  kcal: l.kcal,
  proteinG: l.proteinG,
  carbG: l.carbG,
  fatG: l.fatG,
  fiberG: l.fiberG ?? 0,
  sugarG: l.sugarG ?? 0,
  sodiumMg: l.sodiumMg ?? 0,
  missingMicro: l.missingMicro,
});

const nutrientCols = (n: Nutrients) => ({
  kcal: n.kcal,
  proteinG: n.proteinG,
  carbG: n.carbG,
  fatG: n.fatG,
  fiberG: n.fiberG,
  sugarG: n.sugarG,
  sodiumMg: n.sodiumMg,
});

const MEAL_ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

/** PRD §8.3: future dates allowed up to +1 day. */
export function isTooFarInFuture(date: string, timezone: string): boolean {
  return date > addDays(todayIn(timezone), 1);
}

interface Resolved {
  name: string;
  foodId: string | null;
  recipeId: string | null;
  servingLabel: string;
  grams: number;
  nutrients: Nutrients;
  missingMicro: boolean;
}

async function resolveItem(
  userId: string,
  kind: "food" | "recipe",
  itemId: string,
  servingId: string | undefined,
  quantity: number,
): Promise<Resolved | { error: string; field?: string }> {
  if (kind === "recipe") {
    const r = await db.recipe.findFirst({ where: { id: itemId, userId, deletedAt: null } });
    if (!r) return { error: "Không tìm thấy công thức" };
    const gps = recipeServing(r).grams;
    return {
      name: r.name,
      foodId: null,
      recipeId: r.id,
      servingLabel: "phần",
      grams: quantity * gps,
      nutrients: scaleNutrients(
        { kcal: r.kcalPerServing, proteinG: r.proteinPerServing, carbG: r.carbPerServing, fatG: r.fatPerServing, fiberG: r.fiberPerServing, sugarG: r.sugarPerServing, sodiumMg: r.sodiumPerServing },
        quantity,
      ),
      missingMicro: false,
    };
  }
  const food = await db.food.findFirst({
    where: { id: itemId, deletedAt: null, OR: [{ ownerId: null }, { ownerId: userId }] },
    include: { servings: true },
  });
  if (!food) return { error: "Không tìm thấy món ăn" };
  let grams = quantity;
  let label = "g";
  if (servingId) {
    const s = food.servings.find((x) => x.id === servingId);
    if (!s) return { error: "Khẩu phần không hợp lệ", field: "servingId" };
    grams = quantity * s.grams;
    label = s.label;
  }
  return {
    name: food.name,
    foodId: food.id,
    recipeId: null,
    servingLabel: label,
    grams,
    nutrients: nutrientsForGrams(food, grams),
    missingMicro: hasMissingMicro(food),
  };
}

function gramsError(grams: number): string | null {
  const { min, max } = RANGES.servingGrams;
  return grams < min || grams > max ? "Khối lượng mỗi dòng phải từ 0,1 đến 5.000 g" : null;
}

/** US-07: add a food/recipe to a meal with a nutrition snapshot (PRD §8.4). */
export async function addLog(userId: string, timezone: string, raw: unknown, opts: { allowFuture?: boolean } = {}): Promise<Result<{ log: LogDto }>> {
  const p = addLogSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(p.error) };
  const i = p.data;
  if (!opts.allowFuture && isTooFarInFuture(i.date, timezone)) {
    return { ok: false, error: "Ngày này ở tương lai xa. Bạn có chắc muốn ghi vào ngày này?", fields: { date: "future" } };
  }
  const r = await resolveItem(userId, i.kind, i.itemId, i.servingId, i.quantity);
  if ("error" in r) return { ok: false, error: r.error, fields: r.field ? { [r.field]: r.error } : undefined };
  const ge = gramsError(r.grams);
  if (ge) return { ok: false, error: ge, fields: { quantity: ge } };
  const log = await db.foodLog.create({
    data: {
      userId,
      logDate: isoToDate(i.date),
      meal: i.meal,
      foodId: r.foodId,
      recipeId: r.recipeId,
      nameSnapshot: r.name,
      quantity: i.quantity,
      servingLabel: r.servingLabel,
      grams: r.grams,
      ...nutrientCols(snapshot(r.nutrients)),
      missingMicro: r.missingMicro,
      source: i.source,
    },
  });
  return { ok: true, log: toDto(log) };
}

/** US-12: quick-add calories without a food. */
export async function addQuickLog(userId: string, timezone: string, raw: unknown): Promise<Result<{ log: LogDto }>> {
  const p = quickLogSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(p.error) };
  const i = p.data;
  if (isTooFarInFuture(i.date, timezone)) return { ok: false, error: "Ngày này ở tương lai xa", fields: { date: "future" } };
  const log = await db.foodLog.create({
    data: {
      userId,
      logDate: isoToDate(i.date),
      meal: i.meal,
      nameSnapshot: i.name?.trim() || "Ghi nhanh",
      quantity: 1,
      servingLabel: "lần",
      grams: 0,
      kcal: i.kcal,
      proteinG: i.proteinG ?? 0,
      carbG: i.carbG ?? 0,
      fatG: i.fatG ?? 0,
      source: "quick",
    },
  });
  return { ok: true, log: toDto(log) };
}

/** US-08.1: change quantity/serving/meal/date. Snapshot is recomputed from the source when it still exists. */
export async function updateLog(userId: string, timezone: string, logId: string, raw: unknown): Promise<Result<{ log: LogDto }>> {
  const p = updateLogSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(p.error) };
  const i = p.data;
  const cur = await db.foodLog.findFirst({ where: { id: logId, userId } });
  if (!cur) return { ok: false, error: "Không tìm thấy mục nhật ký" };
  if (i.date && isTooFarInFuture(i.date, timezone)) return { ok: false, error: "Ngày này ở tương lai xa", fields: { date: "future" } };

  const data: Record<string, unknown> = {};
  if (i.meal) data.meal = i.meal;
  if (i.date) data.logDate = isoToDate(i.date);
  if (i.quantity !== undefined || i.servingId) {
    const qty = i.quantity ?? cur.quantity;
    const kind = cur.recipeId ? "recipe" : "food";
    const itemId = cur.recipeId ?? cur.foodId;
    let servingId = i.servingId;
    if (!servingId && kind === "food" && itemId && cur.servingLabel && cur.servingLabel !== "g") {
      // Quantity edit keeps the serving unit the entry was logged with.
      servingId = (await db.foodServing.findFirst({ where: { foodId: itemId, label: cur.servingLabel }, select: { id: true } }))?.id;
    }
    const r = itemId ? await resolveItem(userId, kind, itemId, servingId, qty) : null;
    if (r && !("error" in r)) {
      const ge = gramsError(r.grams);
      if (ge) return { ok: false, error: ge, fields: { quantity: ge } };
      Object.assign(data, { quantity: qty, servingLabel: r.servingLabel, grams: r.grams, ...nutrientCols(snapshot(r.nutrients)), missingMicro: r.missingMicro });
    } else if (cur.grams > 0 && cur.quantity > 0 && !i.servingId) {
      // Source food was deleted: scale the stored snapshot proportionally (history stays intact).
      const f = qty / cur.quantity;
      const base: Nutrients = { kcal: cur.kcal, proteinG: cur.proteinG, carbG: cur.carbG, fatG: cur.fatG, fiberG: cur.fiberG ?? 0, sugarG: cur.sugarG ?? 0, sodiumMg: cur.sodiumMg ?? 0 };
      Object.assign(data, { quantity: qty, grams: cur.grams * f, ...nutrientCols(snapshot(scaleNutrients(base, f))) });
    } else if (cur.grams === 0) {
      return { ok: false, error: "Mục ghi nhanh không có khẩu phần để sửa" };
    } else {
      return { ok: false, error: "Món gốc không còn tồn tại" };
    }
  }
  const log = await db.foodLog.update({ where: { id: cur.id }, data });
  return { ok: true, log: toDto(log) };
}

/** US-08.2: delete and return the removed entry so the client can offer Undo via `restoreLog`. */
export async function deleteLog(userId: string, logId: string): Promise<Result<{ removed: LogDto }>> {
  const cur = await db.foodLog.findFirst({ where: { id: logId, userId } });
  if (!cur) return { ok: false, error: "Không tìm thấy mục nhật ký" };
  await db.foodLog.delete({ where: { id: cur.id } });
  return { ok: true, removed: toDto(cur) };
}

/** Undo for delete/copy: re-create entries from a DTO. The owner is always the session user. */
export async function restoreLog(userId: string, dto: LogDto): Promise<Result<{ log: LogDto }>> {
  const foodId = dto.foodId ? ((await db.food.findFirst({ where: { id: dto.foodId, OR: [{ ownerId: null }, { ownerId: userId }] }, select: { id: true } }))?.id ?? null) : null;
  const recipeId = dto.recipeId ? ((await db.recipe.findFirst({ where: { id: dto.recipeId, userId }, select: { id: true } }))?.id ?? null) : null;
  const log = await db.foodLog.create({
    data: {
      userId,
      logDate: isoToDate(dto.date),
      meal: dto.meal,
      foodId,
      recipeId,
      nameSnapshot: dto.name,
      quantity: dto.quantity,
      servingLabel: dto.servingLabel,
      grams: dto.grams,
      kcal: dto.kcal,
      proteinG: dto.proteinG,
      carbG: dto.carbG,
      fatG: dto.fatG,
      fiberG: dto.fiberG,
      sugarG: dto.sugarG,
      sodiumMg: dto.sodiumMg,
      missingMicro: dto.missingMicro,
      source: "search",
    },
  });
  return { ok: true, log: toDto(log) };
}

/** Undo for copy: remove entries by id, only the caller's. */
export async function deleteLogs(userId: string, ids: string[]): Promise<number> {
  return (await db.foodLog.deleteMany({ where: { userId, id: { in: ids } } })).count;
}

/** All of the day's entries, ordered by meal then creation time. */
export async function listDay(userId: string, date: string): Promise<LogDto[]> {
  const logs = await db.foodLog.findMany({ where: { userId, logDate: isoToDate(date) }, orderBy: { createdAt: "asc" } });
  return logs.sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal)).map(toDto);
}

/**
 * US-11: copy a meal (or, when `fromMeal` is omitted, a whole day — US-11.4) into the target.
 * Entries are appended; nutrition is refreshed from the source food when it still exists, else the old snapshot is kept.
 */
export async function copyMeal(
  userId: string,
  timezone: string,
  input: { fromDate: string; fromMeal?: Meal; toDate: string; toMeal?: Meal },
): Promise<Result<{ created: LogDto[] }>> {
  if (isTooFarInFuture(input.toDate, timezone)) return { ok: false, error: "Ngày này ở tương lai xa" };
  const src = await db.foodLog.findMany({
    where: { userId, logDate: isoToDate(input.fromDate), ...(input.fromMeal ? { meal: input.fromMeal } : {}) },
    orderBy: { createdAt: "asc" },
  });
  if (src.length === 0) return { ok: false, error: input.fromMeal ? "Bữa nguồn chưa có món nào" : "Ngày nguồn chưa có món nào" };

  const created = await db.$transaction(async (tx) => {
    const out: FoodLog[] = [];
    for (const l of src) {
      let nutrition: Nutrients = { kcal: l.kcal, proteinG: l.proteinG, carbG: l.carbG, fatG: l.fatG, fiberG: l.fiberG ?? 0, sugarG: l.sugarG ?? 0, sodiumMg: l.sodiumMg ?? 0 };
      let missingMicro = l.missingMicro;
      let foodId = l.foodId;
      let recipeId = l.recipeId;
      if (l.foodId) {
        const f = await tx.food.findFirst({ where: { id: l.foodId, deletedAt: null, OR: [{ ownerId: null }, { ownerId: userId }] } });
        if (f) {
          nutrition = snapshot(nutrientsForGrams(f, l.grams));
          missingMicro = hasMissingMicro(f);
        } else foodId = null;
      } else if (l.recipeId) {
        const r = await tx.recipe.findFirst({ where: { id: l.recipeId, userId, deletedAt: null } });
        if (r) {
          nutrition = snapshot(scaleNutrients({ kcal: r.kcalPerServing, proteinG: r.proteinPerServing, carbG: r.carbPerServing, fatG: r.fatPerServing, fiberG: r.fiberPerServing, sugarG: r.sugarPerServing, sodiumMg: r.sodiumPerServing }, l.quantity));
        } else recipeId = null;
      }
      out.push(
        await tx.foodLog.create({
          data: {
            userId,
            logDate: isoToDate(input.toDate),
            meal: input.toMeal && input.fromMeal ? input.toMeal : l.meal,
            foodId,
            recipeId,
            nameSnapshot: l.nameSnapshot,
            quantity: l.quantity,
            servingLabel: l.servingLabel,
            grams: l.grams,
            ...nutrientCols(nutrition),
            missingMicro,
            source: "copy",
          },
        }),
      );
    }
    return out;
  });
  return { ok: true, created: created.map(toDto) };
}

/** US-10.1: up to 20 distinct recent foods with the last used serving. */
export async function recentFoods(userId: string, limit = 20): Promise<Array<FoodHit & { lastQuantity: number; lastServingLabel: string | null }>> {
  const logs = await db.foodLog.findMany({
    where: { userId, OR: [{ foodId: { not: null } }, { recipeId: { not: null } }] },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const seen = new Set<string>();
  const picked: FoodLog[] = [];
  for (const l of logs) {
    const key = l.foodId ?? `r:${l.recipeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(l);
    if (picked.length >= limit) break;
  }
  return attach(userId, picked);
}

/** US-10.2: foods logged ≥ 3 times, most frequent first, preferring the given meal. */
export async function frequentFoods(userId: string, meal?: Meal, limit = 20) {
  const groups = await db.foodLog.groupBy({
    by: ["foodId", "meal"],
    where: { userId, foodId: { not: null } },
    _count: { _all: true },
  });
  const total = new Map<string, number>();
  const inMeal = new Map<string, number>();
  for (const g of groups) {
    if (!g.foodId) continue;
    total.set(g.foodId, (total.get(g.foodId) ?? 0) + g._count._all);
    if (g.meal === meal) inMeal.set(g.foodId, g._count._all);
  }
  const ids = [...total.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => (inMeal.get(b[0]) ?? 0) - (inMeal.get(a[0]) ?? 0) || b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  const last = await db.foodLog.findMany({ where: { userId, foodId: { in: ids } }, orderBy: { createdAt: "desc" } });
  const lastBy = new Map<string, FoodLog>();
  for (const l of last) if (l.foodId && !lastBy.has(l.foodId)) lastBy.set(l.foodId, l);
  return attach(userId, ids.flatMap((id) => (lastBy.has(id) ? [lastBy.get(id)!] : [])));
}

async function attach(userId: string, logs: FoodLog[]) {
  const foodIds = logs.flatMap((l) => (l.foodId ? [l.foodId] : []));
  const recipeIds = logs.flatMap((l) => (l.recipeId ? [l.recipeId] : []));
  const hits = await hydrate(userId, foodIds, recipeIds);
  const byKey = new Map(hits.map((h) => [`${h.kind}:${h.id}`, h]));
  return logs.flatMap((l) => {
    const h = byKey.get(l.foodId ? `food:${l.foodId}` : `recipe:${l.recipeId}`);
    return h ? [{ ...h, lastQuantity: l.quantity, lastServingLabel: l.servingLabel }] : [];
  });
}

/** Favorites tab. */
export async function listFavorites(userId: string): Promise<FoodHit[]> {
  const favs = await db.favorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  const hits = await hydrate(userId, favs.map((f) => f.foodId), []);
  return hits;
}

export async function setFavorite(userId: string, foodId: string, on: boolean): Promise<Result> {
  if (!on) {
    await db.favorite.deleteMany({ where: { userId, foodId } });
    return { ok: true };
  }
  const food = await db.food.findFirst({ where: { id: foodId, deletedAt: null, OR: [{ ownerId: null }, { ownerId: userId }] }, select: { id: true } });
  if (!food) return { ok: false, error: "Không tìm thấy món ăn" };
  await db.favorite.upsert({ where: { userId_foodId: { userId, foodId } }, create: { userId, foodId }, update: {} });
  return { ok: true };
}
