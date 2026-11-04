import { unaccent } from "@/lib/text";
import { nutrientsForGrams, recipeNutrition, type Nutrients } from "@/lib/nutrition";
import { fieldErrors } from "@/lib/validation/auth";
import { recipeInputSchema, type RecipeInput } from "@/lib/validation/food";
import { db } from "@/server/db";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string; fields?: Record<string, string> };

export interface RecipeDto {
  id: string;
  name: string;
  servings: number;
  cookedWeightG: number | null;
  note: string | null;
  totalWeightG: number;
  gramsPerServing: number;
  perServing: Nutrients;
  total: Nutrients;
  ingredients: Array<{ id: string; foodId: string; foodName: string; quantity: number; servingLabel: string | null; grams: number }>;
}

interface Built {
  rows: Array<{ foodId: string; quantity: number; servingLabel: string; grams: number }>;
  calc: ReturnType<typeof recipeNutrition>;
}

/** Resolve ingredients against foods the user may see (system + own, not deleted); foods only — no nesting (US-23.4). */
async function build(userId: string, input: RecipeInput): Promise<R<{ built: Built }>> {
  const ids = [...new Set(input.ingredients.map((x) => x.foodId))];
  const foods = await db.food.findMany({
    where: { id: { in: ids }, deletedAt: null, OR: [{ ownerId: null }, { ownerId: userId }] },
    include: { servings: true },
  });
  const byId = new Map(foods.map((f) => [f.id, f]));
  const rows: Built["rows"] = [];
  const parts: Array<{ food: (typeof foods)[number]; grams: number }> = [];
  for (const [idx, ing] of input.ingredients.entries()) {
    const food = byId.get(ing.foodId);
    if (!food) return { ok: false, error: "Có nguyên liệu không còn tồn tại", fields: { [`ingredients.${idx}`]: "Nguyên liệu không tồn tại" } };
    let grams = ing.quantity;
    let label = "g";
    if (ing.servingId) {
      const s = food.servings.find((x) => x.id === ing.servingId);
      if (!s) return { ok: false, error: "Đơn vị không hợp lệ", fields: { [`ingredients.${idx}`]: "Đơn vị không hợp lệ" } };
      grams = ing.quantity * s.grams;
      label = s.label;
    }
    if (grams < 0.1 || grams > 5000) {
      return { ok: false, error: "Khối lượng mỗi nguyên liệu từ 0,1 đến 5.000 g", fields: { [`ingredients.${idx}`]: "Khối lượng từ 0,1 đến 5.000 g" } };
    }
    rows.push({ foodId: food.id, quantity: ing.quantity, servingLabel: label, grams });
    parts.push({ food, grams });
  }
  const calc = recipeNutrition({
    ingredients: parts.map((p) => ({ food: p.food, grams: p.grams })),
    servings: input.servings,
    cookedWeightG: input.cookedWeightG,
  });
  return { ok: true, built: { rows, calc } };
}

const cache = (b: Built) => ({
  totalWeightG: b.calc.totalWeightG,
  kcalPerServing: b.calc.perServing.kcal,
  proteinPerServing: b.calc.perServing.proteinG,
  carbPerServing: b.calc.perServing.carbG,
  fatPerServing: b.calc.perServing.fatG,
  fiberPerServing: b.calc.perServing.fiberG,
  sugarPerServing: b.calc.perServing.sugarG,
  sodiumPerServing: b.calc.perServing.sodiumMg,
});

export async function createRecipe(userId: string, raw: unknown): Promise<R<{ recipe: RecipeDto }>> {
  const p = recipeInputSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(p.error) };
  const b = await build(userId, p.data);
  if (!b.ok) return b;
  const r = await db.recipe.create({
    data: {
      userId,
      name: p.data.name,
      nameUnaccented: unaccent(p.data.name),
      servings: p.data.servings,
      cookedWeightG: p.data.cookedWeightG ?? null,
      note: p.data.note ?? null,
      ...cache(b.built),
      ingredients: { create: b.built.rows },
    },
  });
  return { ok: true, recipe: (await getRecipe(userId, r.id))! };
}

/** US-23.1: recompute per-serving values; existing FoodLogs keep their snapshots. */
export async function updateRecipe(userId: string, id: string, raw: unknown): Promise<R<{ recipe: RecipeDto }>> {
  const p = recipeInputSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(p.error) };
  const cur = await db.recipe.findFirst({ where: { id, userId, deletedAt: null }, select: { id: true } });
  if (!cur) return { ok: false, error: "Không tìm thấy công thức" };
  const b = await build(userId, p.data);
  if (!b.ok) return b;
  await db.$transaction([
    db.recipeIngredient.deleteMany({ where: { recipeId: id } }),
    db.recipe.update({
      where: { id },
      data: {
        name: p.data.name,
        nameUnaccented: unaccent(p.data.name),
        servings: p.data.servings,
        cookedWeightG: p.data.cookedWeightG ?? null,
        note: p.data.note ?? null,
        ...cache(b.built),
        ingredients: { create: b.built.rows },
      },
    }),
  ]);
  return { ok: true, recipe: (await getRecipe(userId, id))! };
}

/** US-23.2: soft delete; logged meals are untouched. */
export async function deleteRecipe(userId: string, id: string): Promise<R> {
  const r = await db.recipe.updateMany({ where: { id, userId, deletedAt: null }, data: { deletedAt: new Date() } });
  return r.count ? { ok: true } : { ok: false, error: "Không tìm thấy công thức" };
}

/** US-23.3 */
export async function duplicateRecipe(userId: string, id: string): Promise<R<{ recipe: RecipeDto }>> {
  const src = await db.recipe.findFirst({ where: { id, userId, deletedAt: null }, include: { ingredients: true } });
  if (!src) return { ok: false, error: "Không tìm thấy công thức" };
  const copy = await db.recipe.create({
    data: {
      userId,
      name: `${src.name} (bản sao)`.slice(0, 120),
      nameUnaccented: unaccent(`${src.name} (bản sao)`),
      servings: src.servings,
      cookedWeightG: src.cookedWeightG,
      note: src.note,
      totalWeightG: src.totalWeightG,
      kcalPerServing: src.kcalPerServing,
      proteinPerServing: src.proteinPerServing,
      carbPerServing: src.carbPerServing,
      fatPerServing: src.fatPerServing,
      fiberPerServing: src.fiberPerServing,
      sugarPerServing: src.sugarPerServing,
      sodiumPerServing: src.sodiumPerServing,
      ingredients: { create: src.ingredients.map((i) => ({ foodId: i.foodId, quantity: i.quantity, servingLabel: i.servingLabel, grams: i.grams })) },
    },
  });
  return { ok: true, recipe: (await getRecipe(userId, copy.id))! };
}

export async function getRecipe(userId: string, id: string): Promise<RecipeDto | null> {
  const r = await db.recipe.findFirst({ where: { id, userId, deletedAt: null }, include: { ingredients: { include: { food: true }, orderBy: { id: "asc" } } } });
  if (!r) return null;
  const total: Nutrients = r.ingredients.reduce<Nutrients>(
    (a, i) => {
      const n = nutrientsForGrams(i.food, i.grams);
      return { kcal: a.kcal + n.kcal, proteinG: a.proteinG + n.proteinG, carbG: a.carbG + n.carbG, fatG: a.fatG + n.fatG, fiberG: a.fiberG + n.fiberG, sugarG: a.sugarG + n.sugarG, sodiumMg: a.sodiumMg + n.sodiumMg };
    },
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 },
  );
  const weight = r.cookedWeightG && r.cookedWeightG > 0 ? r.cookedWeightG : r.totalWeightG;
  return {
    id: r.id,
    name: r.name,
    servings: r.servings,
    cookedWeightG: r.cookedWeightG,
    note: r.note,
    totalWeightG: r.totalWeightG,
    gramsPerServing: weight / r.servings,
    perServing: { kcal: r.kcalPerServing, proteinG: r.proteinPerServing, carbG: r.carbPerServing, fatG: r.fatPerServing, fiberG: r.fiberPerServing, sugarG: r.sugarPerServing, sodiumMg: r.sodiumPerServing },
    total,
    ingredients: r.ingredients.map((i) => ({ id: i.id, foodId: i.foodId, foodName: i.food.name, quantity: i.quantity, servingLabel: i.servingLabel, grams: i.grams })),
  };
}

export async function listRecipes(userId: string): Promise<Array<Pick<RecipeDto, "id" | "name" | "servings" | "perServing">>> {
  const rows = await db.recipe.findMany({ where: { userId, deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 200 });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    servings: r.servings,
    perServing: { kcal: r.kcalPerServing, proteinG: r.proteinPerServing, carbG: r.carbPerServing, fatG: r.fatPerServing, fiberG: r.fiberPerServing, sugarG: r.sugarPerServing, sodiumMg: r.sodiumPerServing },
  }));
}
