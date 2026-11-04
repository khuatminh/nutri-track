import { unaccent } from "@/lib/text";
import { kcalMismatch } from "@/lib/nutrition";
import { fieldErrors } from "@/lib/validation/auth";
import { customFoodSchema } from "@/lib/validation/food";
import { db } from "@/server/db";
import { hydrate, type FoodHit } from "./search";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string; fields?: Record<string, string> };

function servingsData(input: { servings: Array<{ label: string; grams: number; isDefault?: boolean }> }) {
  const list = input.servings.length ? input.servings : [{ label: "100 g", grams: 100, isDefault: true }];
  const defIdx = Math.max(0, list.findIndex((s) => s.isDefault));
  return list.map((s, i) => ({ label: s.label, grams: s.grams, isDefault: i === defIdx }));
}

/** US-09.1/09.2: create a private food. Returns `warnKcalMismatch` (soft warning, still saved). */
export async function createCustomFood(userId: string, raw: unknown): Promise<R<{ food: FoodHit; warnKcalMismatch: boolean }>> {
  const p = customFoodSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(p.error) };
  const i = p.data;
  const created = await db.food.create({
    data: {
      ownerId: userId,
      name: i.name,
      nameUnaccented: unaccent(i.name),
      category: i.category || "Món của tôi",
      isVietnamese: false,
      energyKcal: i.energyKcal,
      proteinG: i.proteinG,
      carbG: i.carbG,
      fatG: i.fatG,
      fiberG: i.fiberG ?? null,
      sugarG: i.sugarG ?? null,
      sodiumMg: i.sodiumMg ?? null,
      servings: { create: servingsData(i) },
    },
  });
  const [food] = await hydrate(userId, [created.id], []);
  return { ok: true, food: food!, warnKcalMismatch: kcalMismatch({ kcal: i.energyKcal, proteinG: i.proteinG, carbG: i.carbG, fatG: i.fatG }) };
}

/** US-09.3: edit own food; past FoodLogs keep their snapshot. */
export async function updateCustomFood(userId: string, foodId: string, raw: unknown): Promise<R<{ food: FoodHit; warnKcalMismatch: boolean }>> {
  const p = customFoodSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(p.error) };
  const i = p.data;
  const cur = await db.food.findFirst({ where: { id: foodId, ownerId: userId, deletedAt: null }, select: { id: true } });
  if (!cur) return { ok: false, error: "Không tìm thấy món của bạn" };
  await db.$transaction([
    db.foodServing.deleteMany({ where: { foodId } }),
    db.food.update({
      where: { id: foodId },
      data: {
        name: i.name,
        nameUnaccented: unaccent(i.name),
        category: i.category || "Món của tôi",
        energyKcal: i.energyKcal,
        proteinG: i.proteinG,
        carbG: i.carbG,
        fatG: i.fatG,
        fiberG: i.fiberG ?? null,
        sugarG: i.sugarG ?? null,
        sodiumMg: i.sodiumMg ?? null,
        servings: { create: servingsData(i) },
      },
    }),
  ]);
  const [food] = await hydrate(userId, [foodId], []);
  return { ok: true, food: food!, warnKcalMismatch: kcalMismatch({ kcal: i.energyKcal, proteinG: i.proteinG, carbG: i.carbG, fatG: i.fatG }) };
}

/** Soft delete: disappears from search, existing logs/recipes unaffected. */
export async function deleteCustomFood(userId: string, foodId: string): Promise<R> {
  const r = await db.food.updateMany({ where: { id: foodId, ownerId: userId, deletedAt: null }, data: { deletedAt: new Date() } });
  return r.count ? { ok: true } : { ok: false, error: "Không tìm thấy món của bạn" };
}

export async function listMyFoods(userId: string): Promise<FoodHit[]> {
  const rows = await db.food.findMany({ where: { ownerId: userId, deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true }, take: 200 });
  return hydrate(userId, rows.map((r) => r.id), []);
}
