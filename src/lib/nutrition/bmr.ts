import { PAL, SEX_CONSTANT, type ActivityLevel, type Sex } from "./constants";

/** Whole years between ISO dates `YYYY-MM-DD` (birthday not yet reached → minus one). */
export function ageFromBirthDate(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

/** Mifflin-St Jeor BMR in kcal/day (unrounded) — PRD §5.1. */
export function bmr(input: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  return 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + SEX_CONSTANT[input.sex];
}

/** TDEE = BMR × PAL (unrounded) — PRD §5.2. */
export function tdee(bmrKcal: number, activity: ActivityLevel): number {
  return bmrKcal * PAL[activity];
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}
