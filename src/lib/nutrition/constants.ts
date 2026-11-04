// Single source of truth for all nutrition constants (PRD §5, ADR-0001 §2.3).
// Do not hard-code these values anywhere else.

export type Sex = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

/** Mifflin-St Jeor sex constant. "other" = mean of the two (PRD §5.1). */
export const SEX_CONSTANT: Record<Sex, number> = { male: 5, female: -161, other: -78 };

/** Physical Activity Level multipliers (PRD §5.2). */
export const PAL: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const CUSTOM_MACRO_MISMATCH_FRACTION = 0.05;
export const KCAL_PER_KG = 7700;
export const KCAL_PER_G = { protein: 4, carb: 4, fat: 9 } as const;

/** Selectable weekly rates per goal and defaults (PRD §5.4). */
export const GOAL_RATES: Record<Goal, readonly number[]> = {
  lose: [0.25, 0.5, 0.75],
  maintain: [],
  gain: [0.25, 0.5],
};
export const DEFAULT_RATE: Record<Goal, number> = { lose: 0.5, maintain: 0, gain: 0.25 };

/** Max deficit: 25% of TDEE and 1000 kcal/day (PRD §5.4). */
export const MAX_DEFICIT_FRACTION = 0.25;
export const MAX_DEFICIT_KCAL = 1000;
export const KCAL_ROUND_STEP = 10;
export const ADJUSTMENT_ROUND_STEP = 5;

/** Minimum recommended kcal (PRD §5.5) and the hard block for manual targets. */
export const KCAL_FLOOR: Record<Sex, number> = { male: 1500, female: 1200, other: 1350 };
export const KCAL_HARD_MIN = 800;
export const BMI_NO_GAIN = 30;
export const BMI_NO_LOSE = 18.5;

/** Macro defaults (PRD §5.6). */
export const PROTEIN_G_PER_KG: Record<Goal, number> = { lose: 1.8, maintain: 1.4, gain: 1.8 };
export const PROTEIN_MIN_G_PER_KG = 1.2;
export const PROTEIN_MAX_KCAL_FRACTION = 0.35;
export const FAT_KCAL_FRACTION = 0.27;
export const FAT_MIN_KCAL_FRACTION = 0.2;
export const FAT_MIN_G_PER_KG = 0.6;
export const CARB_MIN_G = 100;

/** Reference intakes for reports (PRD §5.6, §5.8). */
export const FIBER_G_PER_1000_KCAL = 14;
export const FIBER_MIN_G = 25;
export const SUGAR_MAX_KCAL_FRACTION = 0.1;
export const SODIUM_MAX_MG = 2000;

/** Water (PRD §5.7). */
export const WATER_ML_PER_KG = 35;
export const WATER_ROUND_STEP = 50;
export const WATER_DEFAULT_MIN = 1500;
export const WATER_DEFAULT_MAX = 4000;
export const WATER_CUSTOM_MIN = 500;
export const WATER_CUSTOM_MAX = 6000;
export const WATER_QUICK_ADD_ML = [150, 250, 330, 500] as const;

/** Input ranges (PRD §8.1). */
export const RANGES = {
  age: { min: 13, max: 100 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 20, max: 300 },
  servingGrams: { min: 0.1, max: 5000 },
  foodKcal: { min: 0, max: 5000 },
  recipeServings: { min: 1, max: 50 },
} as const;

/** Report thresholds (PRD US-19, §8.5, US-09.2). */
export const GOAL_DAY_TOLERANCE = 0.1;
export const LOW_LOG_FRACTION = 0.5;
export const KCAL_MISMATCH_TOLERANCE = 0.2;
export const WEIGHT_SUGGEST_DELTA_KG = 1;
export const WEIGHT_TREND_WINDOW = 7;
