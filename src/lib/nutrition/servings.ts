import { KCAL_MISMATCH_TOLERANCE, KCAL_PER_G } from "./constants";
import { roundHalfUp } from "./math";

export interface Nutrients {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

/** Nutrition of a food per 100 g; fiber/sugar/sodium may be missing on user foods (PRD §7). */
export interface FoodPer100g {
  energyKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG?: number | null;
  sugarG?: number | null;
  sodiumMg?: number | null;
}

export const ZERO_NUTRIENTS: Nutrients = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 };

/** quantity × serving grams (e.g. 1.5 bát × 200 g = 300 g). */
export function gramsForServing(quantity: number, servingGrams: number): number {
  return quantity * servingGrams;
}

/** Unrounded nutrition for an amount in grams. Missing micro values count as 0 (PRD §8.5). */
export function nutrientsForGrams(food: FoodPer100g, grams: number): Nutrients {
  const k = grams / 100;
  return {
    kcal: food.energyKcal * k,
    proteinG: food.proteinG * k,
    carbG: food.carbG * k,
    fatG: food.fatG * k,
    fiberG: (food.fiberG ?? 0) * k,
    sugarG: (food.sugarG ?? 0) * k,
    sodiumMg: (food.sodiumMg ?? 0) * k,
  };
}

export function hasMissingMicro(food: FoodPer100g): boolean {
  return food.fiberG == null || food.sugarG == null || food.sodiumMg == null;
}

/** Snapshot precision stored in FoodLog: 2 decimals (PRD §8.2). */
export function snapshot(n: Nutrients): Nutrients {
  return {
    kcal: roundHalfUp(n.kcal, 2),
    proteinG: roundHalfUp(n.proteinG, 2),
    carbG: roundHalfUp(n.carbG, 2),
    fatG: roundHalfUp(n.fatG, 2),
    fiberG: roundHalfUp(n.fiberG, 2),
    sugarG: roundHalfUp(n.sugarG, 2),
    sodiumMg: roundHalfUp(n.sodiumMg, 2),
  };
}

export function sumNutrients(items: readonly Nutrients[]): Nutrients {
  return items.reduce<Nutrients>(
    (a, n) => ({
      kcal: a.kcal + n.kcal,
      proteinG: a.proteinG + n.proteinG,
      carbG: a.carbG + n.carbG,
      fatG: a.fatG + n.fatG,
      fiberG: a.fiberG + n.fiberG,
      sugarG: a.sugarG + n.sugarG,
      sodiumMg: a.sodiumMg + n.sodiumMg,
    }),
    ZERO_NUTRIENTS,
  );
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  return {
    kcal: n.kcal * factor,
    proteinG: n.proteinG * factor,
    carbG: n.carbG * factor,
    fatG: n.fatG * factor,
    fiberG: n.fiberG * factor,
    sugarG: n.sugarG * factor,
    sodiumMg: n.sodiumMg * factor,
  };
}

export interface RecipeIngredientInput {
  food: FoodPer100g;
  grams: number;
}

export interface RecipeNutrition {
  total: Nutrients;
  perServing: Nutrients;
  totalWeightG: number;
  /** Weight of one serving; uses cooked weight when provided (US-22.3). */
  gramsPerServing: number;
}

/** US-22.2/22.3: total and per-serving nutrition of a recipe. */
export function recipeNutrition(input: {
  ingredients: readonly RecipeIngredientInput[];
  servings: number;
  cookedWeightG?: number | null;
}): RecipeNutrition {
  if (!(input.servings > 0)) throw new RangeError("servings must be > 0");
  const total = sumNutrients(input.ingredients.map((i) => nutrientsForGrams(i.food, i.grams)));
  const totalWeightG = input.ingredients.reduce((s, i) => s + i.grams, 0);
  const weight = input.cookedWeightG && input.cookedWeightG > 0 ? input.cookedWeightG : totalWeightG;
  return {
    total,
    perServing: scaleNutrients(total, 1 / input.servings),
    totalWeightG,
    gramsPerServing: weight / input.servings,
  };
}

/** US-09.2: true when kcal differs > 20% from 4P+4C+9F (soft warning). */
export function kcalMismatch(n: Pick<Nutrients, "kcal" | "proteinG" | "carbG" | "fatG">): boolean {
  const calc = n.proteinG * KCAL_PER_G.protein + n.carbG * KCAL_PER_G.carb + n.fatG * KCAL_PER_G.fat;
  if (calc === 0) return n.kcal > 0;
  return Math.abs(n.kcal - calc) / calc > KCAL_MISMATCH_TOLERANCE;
}
