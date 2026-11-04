import { Prisma } from "@prisma/client";
import { escapeLike, normalizeQuery } from "@/lib/text";
import { db } from "@/server/db";

export interface ServingDto {
  id: string;
  label: string;
  grams: number;
  isDefault: boolean;
}

export interface FoodHit {
  kind: "food" | "recipe";
  id: string;
  name: string;
  category: string | null;
  isOwn: boolean;
  isFavorite: boolean;
  /** Per 100 g for foods; per serving for recipes. */
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  servings: ServingDto[];
}

interface Row {
  id: string;
  name: string;
  category: string | null;
  owner_id: string | null;
  energy_kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

export const SEARCH_LIMIT = 20;

/** Implicit "phần" serving of a recipe (US-22.3). */
export function recipeServing(recipe: { id: string; servings: number; cookedWeightG: number | null; totalWeightG: number }): ServingDto {
  const weight = recipe.cookedWeightG && recipe.cookedWeightG > 0 ? recipe.cookedWeightG : recipe.totalWeightG;
  return { id: `recipe:${recipe.id}`, label: "phần", grams: weight / recipe.servings, isDefault: true };
}

/**
 * ADR-0001 §2.5: accent-insensitive substring OR trigram similarity, prefix matches first,
 * own foods before system foods. Only the caller's own + system foods are visible.
 */
export async function searchFoods(userId: string, rawQuery: string, opts: { limit?: number } = {}): Promise<FoodHit[]> {
  const q = normalizeQuery(rawQuery);
  if (!q) return [];
  const limit = Math.min(opts.limit ?? SEARCH_LIMIT, 50);
  const like = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;

  const rows = await db.$queryRaw<Row[]>(Prisma.sql`
    SELECT id, name, category, owner_id, energy_kcal, protein_g, carb_g, fat_g
    FROM foods
    WHERE deleted_at IS NULL
      AND (owner_id IS NULL OR owner_id = ${userId})
      AND (name_unaccented ILIKE ${like} OR similarity(name_unaccented, ${q}) > 0.3)
    ORDER BY (name_unaccented ILIKE ${prefix}) DESC,
             (owner_id IS NOT NULL) DESC,
             similarity(name_unaccented, ${q}) DESC,
             length(name) ASC
    LIMIT ${limit}`);

  const recipes = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM recipes
    WHERE user_id = ${userId} AND deleted_at IS NULL
      AND (name_unaccented ILIKE ${like} OR similarity(name_unaccented, ${q}) > 0.3)
    ORDER BY (name_unaccented ILIKE ${prefix}) DESC, similarity(name_unaccented, ${q}) DESC
    LIMIT 5`);

  return hydrate(userId, rows.map((r) => r.id), recipes.map((r) => r.id));
}

/** Load display data for ids; preserves the order of `foodIds`, recipes first. */
export async function hydrate(userId: string, foodIds: string[], recipeIds: string[]): Promise<FoodHit[]> {
  const [foods, recipes, favs] = await Promise.all([
    foodIds.length
      ? db.food.findMany({
          where: { id: { in: foodIds }, deletedAt: null, OR: [{ ownerId: null }, { ownerId: userId }] },
          include: { servings: { orderBy: { isDefault: "desc" } } },
        })
      : [],
    recipeIds.length ? db.recipe.findMany({ where: { id: { in: recipeIds }, userId, deletedAt: null } }) : [],
    db.favorite.findMany({ where: { userId, foodId: { in: foodIds } }, select: { foodId: true } }),
  ]);
  const favSet = new Set(favs.map((f) => f.foodId));
  const byId = new Map(foods.map((f) => [f.id, f]));
  const foodHits: FoodHit[] = foodIds.flatMap((id) => {
    const f = byId.get(id);
    if (!f) return [];
    return [
      {
        kind: "food" as const,
        id: f.id,
        name: f.name,
        category: f.category,
        isOwn: f.ownerId === userId,
        isFavorite: favSet.has(f.id),
        kcal: f.energyKcal,
        proteinG: f.proteinG,
        carbG: f.carbG,
        fatG: f.fatG,
        fiberG: f.fiberG,
        sugarG: f.sugarG,
        sodiumMg: f.sodiumMg,
        servings: f.servings.map((s) => ({ id: s.id, label: s.label, grams: s.grams, isDefault: s.isDefault })),
      },
    ];
  });
  const recipeHits: FoodHit[] = recipes.map((r) => ({
    kind: "recipe" as const,
    id: r.id,
    name: r.name,
    category: "Công thức của tôi",
    isOwn: true,
    isFavorite: false,
    kcal: r.kcalPerServing,
    proteinG: r.proteinPerServing,
    carbG: r.carbPerServing,
    fatG: r.fatPerServing,
    fiberG: r.fiberPerServing,
    sugarG: r.sugarPerServing,
    sodiumMg: r.sodiumPerServing,
    servings: [recipeServing(r)],
  }));
  return [...recipeHits, ...foodHits];
}
