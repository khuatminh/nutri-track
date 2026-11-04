import { CUSTOM_MACRO_MISMATCH_FRACTION, KCAL_PER_G } from "./constants";
import { roundHalfUp } from "./math";
import type { MacroTargets } from "./targets";

type CustomMacros = MacroTargets & { kcal: number };

/** US-05.6: warn only above 5% of the calorie target; zero macros also count. */
export function hasMacroMismatch({ kcal, proteinG, carbG, fatG }: CustomMacros): boolean {
  if (![kcal, proteinG, carbG, fatG].every(Number.isFinite) || kcal <= 0 || Math.min(proteinG, carbG, fatG) < 0) return false;
  const macroKcal = proteinG * KCAL_PER_G.protein + carbG * KCAL_PER_G.carb + fatG * KCAL_PER_G.fat;
  return Math.abs(macroKcal - kcal) > kcal * CUSTOM_MACRO_MISMATCH_FRACTION;
}

/** Balance only carbs, clamped at zero and rounded to whole grams (PRD §5.6). */
export function balanceCarb({ kcal, proteinG, fatG }: Omit<CustomMacros, "carbG">): number {
  return roundHalfUp(Math.max(0, (kcal - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat) / KCAL_PER_G.carb));
}
