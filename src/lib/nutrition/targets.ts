import { ageFromBirthDate, bmi, bmr, tdee } from "./bmr";
import {
  ADJUSTMENT_ROUND_STEP,
  BMI_NO_GAIN,
  BMI_NO_LOSE,
  CARB_MIN_G,
  DEFAULT_RATE,
  FAT_KCAL_FRACTION,
  FAT_MIN_G_PER_KG,
  FAT_MIN_KCAL_FRACTION,
  GOAL_RATES,
  KCAL_FLOOR,
  KCAL_HARD_MIN,
  KCAL_PER_G,
  KCAL_PER_KG,
  KCAL_ROUND_STEP,
  MAX_DEFICIT_FRACTION,
  MAX_DEFICIT_KCAL,
  PROTEIN_G_PER_KG,
  PROTEIN_MAX_KCAL_FRACTION,
  PROTEIN_MIN_G_PER_KG,
  WATER_CUSTOM_MAX,
  WATER_CUSTOM_MIN,
  WATER_DEFAULT_MAX,
  WATER_DEFAULT_MIN,
  WATER_ML_PER_KG,
  WATER_ROUND_STEP,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "./constants";
import { clamp, roundHalfUp, roundToStep } from "./math";

export interface CalorieTargetResult {
  kcal: number;
  /** Signed kcal/day adjustment actually applied vs TDEE (after caps/floor). */
  adjustment: number;
  /** Weekly rate (kg) actually achieved by the applied adjustment. */
  effectiveRateKgPerWeek: number;
  rateReduced: boolean;
  flooredToMin: boolean;
}

/** kcal/day adjustment for a weekly rate: rate × 7700 ÷ 7, rounded to a multiple of 5. */
export function adjustmentForRate(rateKgPerWeek: number): number {
  return roundToStep((rateKgPerWeek * KCAL_PER_KG) / 7, ADJUSTMENT_ROUND_STEP);
}

/** PRD §5.4–5.5: calorie target for a goal; applies deficit cap and sex-based floor. */
export function calorieTarget(input: {
  tdee: number;
  goal: Goal;
  rateKgPerWeek?: number;
  sex: Sex;
}): CalorieTargetResult {
  const { tdee: t, goal, sex } = input;
  const requested = goal === "maintain" ? 0 : (input.rateKgPerWeek ?? DEFAULT_RATE[goal]);
  let adjustment = goal === "maintain" ? 0 : adjustmentForRate(requested);
  let rateReduced = false;

  if (goal === "lose") {
    const cap = Math.min(t * MAX_DEFICIT_FRACTION, MAX_DEFICIT_KCAL);
    if (adjustment > cap) {
      const valid = [...GOAL_RATES.lose].filter((r) => adjustmentForRate(r) <= cap);
      const best = valid.length ? Math.max(...valid) : 0;
      adjustment = best ? adjustmentForRate(best) : 0;
      rateReduced = true;
    }
    adjustment = -adjustment;
  }

  let kcal = roundToStep(t + adjustment, KCAL_ROUND_STEP);
  let flooredToMin = false;
  const floor = KCAL_FLOOR[sex];
  if (goal === "lose" && kcal < floor) {
    kcal = floor;
    flooredToMin = true;
    rateReduced = true;
  }
  const applied = kcal - t;
  return {
    kcal,
    adjustment: applied,
    effectiveRateKgPerWeek: Math.abs(applied * 7) / KCAL_PER_KG,
    rateReduced,
    flooredToMin,
  };
}

export interface MacroTargets {
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** PRD §5.6 default macro split for a kcal target. */
export function macroTargets(input: { kcal: number; weightKg: number; goal: Goal }): MacroTargets {
  const { kcal, weightKg: w, goal } = input;
  let protein = Math.min(PROTEIN_G_PER_KG[goal] * w, (PROTEIN_MAX_KCAL_FRACTION * kcal) / KCAL_PER_G.protein);
  let fat = Math.max((FAT_KCAL_FRACTION * kcal) / KCAL_PER_G.fat, FAT_MIN_G_PER_KG * w);
  const carbKcal = () => kcal - KCAL_PER_G.protein * protein - KCAL_PER_G.fat * fat;

  let shortfall = CARB_MIN_G * KCAL_PER_G.carb - carbKcal();
  if (shortfall > 0) {
    const proteinRoom = Math.max(0, protein - PROTEIN_MIN_G_PER_KG * w);
    const cutP = Math.min(proteinRoom, shortfall / KCAL_PER_G.protein);
    protein -= cutP;
    shortfall -= cutP * KCAL_PER_G.protein;
  }
  if (shortfall > 0) {
    const fatMin = Math.max((FAT_MIN_KCAL_FRACTION * kcal) / KCAL_PER_G.fat, FAT_MIN_G_PER_KG * w);
    const cutF = Math.min(Math.max(0, fat - fatMin), shortfall / KCAL_PER_G.fat);
    fat -= cutF;
  }
  const carb = Math.max(CARB_MIN_G, carbKcal() / KCAL_PER_G.carb);
  return { proteinG: roundHalfUp(protein), carbG: roundHalfUp(carb), fatG: roundHalfUp(fat) };
}

/** PRD §5.7: default water target in ml. */
export function waterTarget(weightKg: number): number {
  return clamp(roundToStep(WATER_ML_PER_KG * weightKg, WATER_ROUND_STEP), WATER_DEFAULT_MIN, WATER_DEFAULT_MAX);
}

export function isValidCustomWater(ml: number): boolean {
  return Number.isFinite(ml) && ml >= WATER_CUSTOM_MIN && ml <= WATER_CUSTOM_MAX;
}

export type GoalAdvice = "ok" | "suggest_maintain_high_bmi" | "suggest_maintain_low_bmi";

/** PRD §5.5: no gain when BMI ≥ 30, no loss when BMI < 18.5 (user may still override). */
export function goalAdvice(goal: Goal, bmiValue: number): GoalAdvice {
  if (goal === "gain" && bmiValue >= BMI_NO_GAIN) return "suggest_maintain_high_bmi";
  if (goal === "lose" && bmiValue < BMI_NO_LOSE) return "suggest_maintain_low_bmi";
  return "ok";
}

export type CustomKcalCheck = "ok" | "needs_confirm" | "blocked";

/** PRD §5.5: manual kcal < floor needs double confirm; < 800 is blocked. */
export function checkCustomKcal(kcal: number, sex: Sex): CustomKcalCheck {
  if (!Number.isFinite(kcal) || kcal < KCAL_HARD_MIN) return "blocked";
  return kcal < KCAL_FLOOR[sex] ? "needs_confirm" : "ok";
}

export interface ComputedTargets {
  bmr: number;
  tdee: number;
  bmi: number;
  age: number;
  calories: CalorieTargetResult;
  macros: MacroTargets;
  waterMl: number;
  advice: GoalAdvice;
}

/** One-call pipeline used by onboarding / profile edits (US-05). */
export function computeTargets(input: {
  sex: Sex;
  birthDate: string;
  today: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  rateKgPerWeek?: number;
}): ComputedTargets {
  const age = ageFromBirthDate(input.birthDate, input.today);
  const b = bmr({ sex: input.sex, weightKg: input.weightKg, heightCm: input.heightCm, age });
  const t = tdee(b, input.activityLevel);
  const calories = calorieTarget({ tdee: t, goal: input.goal, rateKgPerWeek: input.rateKgPerWeek, sex: input.sex });
  const bmiValue = bmi(input.weightKg, input.heightCm);
  return {
    bmr: b,
    tdee: t,
    bmi: bmiValue,
    age,
    calories,
    macros: macroTargets({ kcal: calories.kcal, weightKg: input.weightKg, goal: input.goal }),
    waterMl: waterTarget(input.weightKg),
    advice: goalAdvice(input.goal, bmiValue),
  };
}

/** US-18: suggest recomputing targets when weight drifted ≥ threshold. */
export function shouldSuggestRetarget(currentWeightKg: number, targetsWeightKg: number, thresholdKg = 1): boolean {
  return Math.abs(currentWeightKg - targetsWeightKg) >= thresholdKg - 1e-9;
}
