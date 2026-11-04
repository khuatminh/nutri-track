import type { Meal } from "@prisma/client";

export const MEAL_LABEL: Record<Meal, string> = { breakfast: "Bữa sáng", lunch: "Bữa trưa", dinner: "Bữa tối", snack: "Bữa phụ" };
export const MEAL_EMOJI: Record<Meal, string> = { breakfast: "🍳", lunch: "🍚", dinner: "🍜", snack: "🍎" };
export const MEAL_ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

/** Suggest the meal for "now" (local hour) when adding from a generic entry point. */
export function mealForHour(hour: number): Meal {
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

export function isMeal(v: unknown): v is Meal {
  return typeof v === "string" && (MEAL_ORDER as string[]).includes(v);
}
