import { describe, expect, it } from "vitest";
import {
  adjustmentForRate,
  ageFromBirthDate,
  bmi,
  bmr,
  calorieTarget,
  checkCustomKcal,
  clamp,
  computeTargets,
  goalAdvice,
  gramsForServing,
  hasMissingMicro,
  isValidCustomWater,
  kcalMismatch,
  macroTargets,
  nutrientsForGrams,
  percentOf,
  recipeNutrition,
  references,
  remainingKcal,
  roundHalfUp,
  roundToStep,
  scaleNutrients,
  shouldSuggestRetarget,
  snapshot,
  summarizePeriod,
  tdee,
  waterTarget,
  weightChange,
  weightTrend,
  type DayTotals,
  type Nutrients,
} from "./index";

const n = (kcal: number, p = 0, c = 0, f = 0, extra: Partial<Nutrients> = {}): Nutrients => ({
  kcal,
  proteinG: p,
  carbG: c,
  fatG: f,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0,
  ...extra,
});

describe("math", () => {
  it("rounds half away from zero", () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(1.005, 2)).toBe(1.01);
    expect(roundToStep(2170, 50)).toBe(2150);
    expect(clamp(5, 1, 3)).toBe(3);
  });
});

describe("BMR / TDEE (PRD §5.1–5.2)", () => {
  it("female 62 kg, 162 cm, 28 y", () => {
    expect(bmr({ sex: "female", weightKg: 62, heightCm: 162, age: 28 })).toBeCloseTo(1331.5, 5);
  });
  it("male constant and 'other' mean constant", () => {
    expect(bmr({ sex: "male", weightKg: 66, heightCm: 175, age: 24 })).toBeCloseTo(660 + 1093.75 - 120 + 5, 5);
    expect(bmr({ sex: "other", weightKg: 60, heightCm: 160, age: 30 })).toBeCloseTo(600 + 1000 - 150 - 78, 5);
  });
  it("TDEE = BMR × PAL", () => {
    expect(tdee(1331.5, "sedentary")).toBeCloseTo(1597.8, 5);
    expect(tdee(1000, "very_active")).toBe(1900);
  });
  it("age respects birthday", () => {
    expect(ageFromBirthDate("1998-11-05", "2026-11-04")).toBe(27);
    expect(ageFromBirthDate("1998-11-04", "2026-11-04")).toBe(28);
    expect(ageFromBirthDate("1998-12-01", "2026-11-04")).toBe(27);
  });
  it("BMI", () => {
    expect(bmi(62, 162)).toBeCloseTo(23.62, 2);
  });
});

describe("calorieTarget (PRD §5.4–5.5)", () => {
  it("adjustments per rate", () => {
    expect(adjustmentForRate(0.25)).toBe(275);
    expect(adjustmentForRate(0.5)).toBe(550);
    expect(adjustmentForRate(0.75)).toBe(825);
  });
  it("lose 0.5 kg/week", () => {
    const r = calorieTarget({ tdee: 2200, goal: "lose", sex: "male" });
    expect(r.kcal).toBe(1650);
    expect(r.adjustment).toBe(-550);
    expect(r.rateReduced).toBe(false);
    expect(r.effectiveRateKgPerWeek).toBeCloseTo(0.5, 5);
  });
  it("maintain / gain", () => {
    expect(calorieTarget({ tdee: 2234, goal: "maintain", sex: "male" }).kcal).toBe(2230);
    expect(calorieTarget({ tdee: 2200, goal: "gain", sex: "male" }).kcal).toBe(2480);
    expect(calorieTarget({ tdee: 2200, goal: "gain", rateKgPerWeek: 0.5, sex: "male" }).kcal).toBe(2750);
  });
  it("caps deficit to 25% TDEE by lowering the rate", () => {
    const r = calorieTarget({ tdee: 2000, goal: "lose", rateKgPerWeek: 0.75, sex: "male" });
    expect(r.rateReduced).toBe(true);
    expect(r.adjustment).toBe(-270); // cap 500 → 0.25 kg/week (275) → 1725 → rounded to 1730
    expect(r.kcal).toBe(1730);
  });
  it("no valid rate under tiny cap → zero deficit", () => {
    const r = calorieTarget({ tdee: 1000, goal: "lose", rateKgPerWeek: 0.5, sex: "other" });
    expect(r.rateReduced).toBe(true);
  });
  it("raises to the safe floor", () => {
    const r = calorieTarget({ tdee: 1400, goal: "lose", rateKgPerWeek: 0.5, sex: "female" });
    expect(r.kcal).toBe(1200);
    expect(r.flooredToMin).toBe(true);
    expect(r.effectiveRateKgPerWeek).toBeLessThan(0.25);
  });
});

describe("macroTargets (PRD §5.6)", () => {
  it("example: female 62 kg, 1500 kcal, lose → P112 C162 F45", () => {
    expect(macroTargets({ kcal: 1500, weightKg: 62, goal: "lose" })).toEqual({ proteinG: 112, carbG: 162, fatG: 45 });
  });
  it("maintain uses 1.4 g/kg", () => {
    expect(macroTargets({ kcal: 2000, weightKg: 70, goal: "maintain" }).proteinG).toBe(98);
  });
  it("caps protein at 35% kcal", () => {
    const m = macroTargets({ kcal: 1200, weightKg: 120, goal: "lose" });
    expect(m.proteinG * 4).toBeLessThanOrEqual(1200 * 0.35 + 4);
  });
  it("keeps carbs ≥ 100 g by lowering protein then fat", () => {
    const m = macroTargets({ kcal: 1300, weightKg: 100, goal: "lose" });
    expect(m.carbG).toBeGreaterThanOrEqual(100);
    expect(m.proteinG).toBe(114); // 35% cap wins over the 1.2 g/kg minimum
    const tight = macroTargets({ kcal: 1000, weightKg: 100, goal: "lose" });
    expect(tight.carbG).toBe(100);
  });
});

describe("water (PRD §5.7)", () => {
  it("62 kg → 2150 ml", () => expect(waterTarget(62)).toBe(2150));
  it("clamps", () => {
    expect(waterTarget(30)).toBe(1500);
    expect(waterTarget(200)).toBe(4000);
  });
  it("custom range", () => {
    expect(isValidCustomWater(499)).toBe(false);
    expect(isValidCustomWater(500)).toBe(true);
    expect(isValidCustomWater(6000)).toBe(true);
    expect(isValidCustomWater(6001)).toBe(false);
    expect(isValidCustomWater(Number.NaN)).toBe(false);
  });
});

describe("safety checks (PRD §5.5)", () => {
  it("goal advice", () => {
    expect(goalAdvice("gain", 31)).toBe("suggest_maintain_high_bmi");
    expect(goalAdvice("lose", 18)).toBe("suggest_maintain_low_bmi");
    expect(goalAdvice("lose", 24)).toBe("ok");
  });
  it("custom kcal", () => {
    expect(checkCustomKcal(799, "male")).toBe("blocked");
    expect(checkCustomKcal(Number.NaN, "male")).toBe("blocked");
    expect(checkCustomKcal(1400, "male")).toBe("needs_confirm");
    expect(checkCustomKcal(1200, "female")).toBe("ok");
  });
  it("retarget suggestion at ≥ 1 kg drift", () => {
    expect(shouldSuggestRetarget(61, 62)).toBe(true);
    expect(shouldSuggestRetarget(62.5, 62)).toBe(false);
  });
});

describe("computeTargets pipeline", () => {
  it("Linh: female 28 y, 162 cm, 62 kg, sedentary, lose 0.5", () => {
    const t = computeTargets({
      sex: "female",
      birthDate: "1998-01-01",
      today: "2026-11-04",
      heightCm: 162,
      weightKg: 62,
      activityLevel: "sedentary",
      goal: "lose",
    });
    expect(t.age).toBe(28);
    expect(t.bmr).toBeCloseTo(1331.5, 5);
    expect(t.tdee).toBeCloseTo(1597.8, 5);
    expect(t.calories.kcal).toBe(1320); // deficit capped at 25% → 0.25 kg/week → 1322.8 → 1320
    expect(t.calories.rateReduced).toBe(true);
    expect(t.calories.flooredToMin).toBe(false);
    expect(t.waterMl).toBe(2150);
    expect(t.advice).toBe("ok");
  });
});

describe("servings & nutrients (PRD §8.2, §8.4)", () => {
  const rice = { energyKcal: 130, proteinG: 2.7, carbG: 28, fatG: 0.3, fiberG: 0.4, sugarG: 0, sodiumMg: 1 };
  it("grams for serving", () => expect(gramsForServing(1.5, 200)).toBe(300));
  it("nutrients scale per 100 g and treat missing as 0", () => {
    const x = nutrientsForGrams(rice, 300);
    expect(x.kcal).toBeCloseTo(390, 5);
    expect(x.fiberG).toBeCloseTo(1.2, 5);
    const y = nutrientsForGrams({ energyKcal: 100, proteinG: 1, carbG: 1, fatG: 1 }, 50);
    expect(y.sodiumMg).toBe(0);
    expect(hasMissingMicro({ energyKcal: 1, proteinG: 1, carbG: 1, fatG: 1 })).toBe(true);
    expect(hasMissingMicro(rice)).toBe(false);
  });
  it("snapshot rounds to 2 decimals", () => {
    expect(snapshot(n(1.2345, 1.005, 0, 0)).kcal).toBe(1.23);
    expect(snapshot(n(1, 1.005)).proteinG).toBe(1.01);
  });
  it("kcal mismatch > 20%", () => {
    expect(kcalMismatch(n(500, 20, 50, 20))).toBe(false); // calc 460
    expect(kcalMismatch(n(900, 20, 50, 20))).toBe(true);
    expect(kcalMismatch(n(0))).toBe(false);
    expect(kcalMismatch(n(10))).toBe(true);
  });
  it("scales", () => expect(scaleNutrients(n(100, 10), 1.5).kcal).toBe(150));
});

describe("recipeNutrition (US-22)", () => {
  const egg = { energyKcal: 150, proteinG: 12, carbG: 1, fatG: 10 };
  const rice = { energyKcal: 130, proteinG: 3, carbG: 28, fatG: 0 };
  it("per serving = total ÷ servings; 1.5 servings log", () => {
    const r = recipeNutrition({
      ingredients: [
        { food: egg, grams: 200 },
        { food: rice, grams: 400 },
      ],
      servings: 4,
    });
    expect(r.total.kcal).toBe(820);
    expect(r.perServing.kcal).toBe(205);
    expect(r.totalWeightG).toBe(600);
    expect(r.gramsPerServing).toBe(150);
    expect(scaleNutrients(r.perServing, 1.5).kcal).toBeCloseTo(307.5, 5);
  });
  it("uses cooked weight when given; rejects 0 servings", () => {
    const r = recipeNutrition({ ingredients: [{ food: egg, grams: 100 }], servings: 2, cookedWeightG: 80 });
    expect(r.gramsPerServing).toBe(40);
    expect(() => recipeNutrition({ ingredients: [], servings: 0 })).toThrow(RangeError);
  });
});

describe("report (PRD US-19/20, §8.5)", () => {
  const day = (date: string, kcal: number, hasLog = true, extra: Partial<DayTotals> = {}): DayTotals => ({
    date,
    nutrients: n(kcal, kcal / 20, kcal / 10, kcal / 40, { sodiumMg: 1000 }),
    hasLog,
    targetKcal: 2000,
    waterMl: 0,
    ...extra,
  });
  it("excludes empty days from averages", () => {
    const s = summarizePeriod([day("2026-11-02", 2000), day("2026-11-03", 0, false), day("2026-11-04", 1000, true, { waterMl: 1500 })]);
    expect(s.totalDays).toBe(3);
    expect(s.daysWithData).toBe(2);
    expect(s.average.kcal).toBe(1500);
    expect(s.average.sodiumMg).toBe(1000);
    expect(s.goalDays).toBe(1);
    expect(s.lowLogDates).toEqual([]);
    expect(s.averageWaterMl).toBe(1500);
    expect(s.macroPercent.protein + s.macroPercent.carb + s.macroPercent.fat).toBeCloseTo(100, 5);
  });
  it("flags low-logged days and missing micro", () => {
    const s = summarizePeriod([day("2026-11-02", 900, true, { missingMicro: true })]);
    expect(s.lowLogDates).toEqual(["2026-11-02"]);
    expect(s.missingMicroDays).toBe(1);
  });
  it("empty period", () => {
    const s = summarizePeriod([]);
    expect(s.daysWithData).toBe(0);
    expect(s.average.kcal).toBe(0);
    expect(s.macroPercent).toEqual({ protein: 0, carb: 0, fat: 0 });
    expect(s.averageWaterMl).toBe(0);
  });
  it("references", () => {
    const r = references(2000);
    expect(r.sugarG).toBe(50);
    expect(r.sodiumMg).toBe(2000);
    expect(r.fiberG).toBe(28);
    expect(references(1200).fiberG).toBe(25);
  });
  it("remaining and percent", () => {
    expect(remainingKcal(2000, 1200)).toBe(800);
    expect(remainingKcal(2000, 2150)).toBe(-150);
    expect(percentOf(120, 100)).toBe(120);
    expect(percentOf(5, 0)).toBe(0);
  });
});

describe("weight trend & change (US-17)", () => {
  const pts = [
    { date: "2026-10-01", weightKg: 64 },
    { date: "2026-10-20", weightKg: 63 },
    { date: "2026-10-28", weightKg: 62.5 },
    { date: "2026-11-04", weightKg: 62 },
  ];
  it("7-day trailing average, no interpolation", () => {
    const t = weightTrend([...pts].reverse());
    expect(t).toHaveLength(4);
    expect(t[0]?.weightKg).toBe(64);
    expect(t[3]?.weightKg).toBe(62); // 10-28 is exactly 7 days earlier → outside window
  });
  it("changes vs first / 7 / 30 days", () => {
    const c = weightChange(pts);
    expect(c.sinceFirstKg).toBeCloseTo(-2, 5);
    expect(c.sinceDaysKg[7]).toBeCloseTo(-0.5, 5);
    expect(c.sinceDaysKg[30]).toBeCloseTo(-2, 5);
    expect(weightChange(pts, [60]).sinceDaysKg[60]).toBeNull();
    expect(weightChange(pts, [34]).sinceDaysKg[34]).toBeCloseTo(-2, 5);
    expect(weightChange([]).sinceFirstKg).toBeNull();
    expect(weightChange([{ date: "2026-11-04", weightKg: 62 }]).sinceFirstKg).toBeNull();
  });
});
