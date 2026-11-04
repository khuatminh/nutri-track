import { describe, expect, it } from "vitest";
import { calorieTarget, computeTargets, macroTargets } from "./targets";

const input = {
  sex: "female" as const,
  birthDate: "2008-11-05",
  today: "2026-11-05",
  heightCm: 162,
  weightKg: 62,
  activityLevel: "sedentary" as const,
  goal: "lose" as const,
};

describe("US-05.8 underage target safety", () => {
  it.each([
    ["2009-11-05", "2026-11-05", 17],
    ["2008-11-05", "2026-11-04", 17], // 17 years and 364 days
    ["2008-11-06", "2026-11-05", 17],
  ])("blocks loss for birth %s on %s", (birthDate, today, age) => {
    const result = computeTargets({ ...input, birthDate, today, rateKgPerWeek: 1 });
    expect(result).toMatchObject({ age, weightLossBlocked: true, suggestedGoal: "maintain", advice: "ok" });
    expect(result.calories).toMatchObject({ kcal: result.tdee, adjustment: 0, effectiveRateKgPerWeek: 0 });
    expect(result.calories.kcal).toBeGreaterThanOrEqual(result.tdee);
    expect(result.macros).toEqual(macroTargets({ kcal: result.tdee, weightKg: input.weightKg, goal: "maintain" }));
  });

  it("preserves fractional TDEE rather than rounding into a deficit", () => {
    const result = computeTargets({ ...input, birthDate: "2009-11-05", weightKg: 62.13 });
    expect(result.tdee % 1).not.toBe(0);
    expect(result.calories.kcal).toBe(result.tdee);
  });

  it.each(["2008-11-05", "1998-01-01"])("keeps adult weight loss on/after 18th birthday (%s)", (birthDate) => {
    const result = computeTargets({ ...input, birthDate });
    expect(result).toMatchObject({ weightLossBlocked: false, suggestedGoal: "lose" });
    expect(result.calories.kcal).toBeLessThan(result.tdee);
    expect(result.calories).toEqual(calorieTarget({ tdee: result.tdee, goal: "lose", sex: input.sex }));
    expect(result.macros).toEqual(macroTargets({ kcal: result.calories.kcal, weightKg: input.weightKg, goal: "lose" }));
  });

  it.each(["maintain", "gain"] as const)("preserves underage %s behavior", (goal) => {
    const result = computeTargets({ ...input, birthDate: "2009-11-05", goal });
    expect(result).toMatchObject({ weightLossBlocked: false, suggestedGoal: goal });
    expect(result.calories).toEqual(calorieTarget({ tdee: result.tdee, goal, sex: input.sex }));
  });
});
