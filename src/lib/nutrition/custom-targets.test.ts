import { describe, expect, it } from "vitest";
import { balanceCarb, hasMacroMismatch } from "./custom-targets";

describe("custom macro targets (US-05.6)", () => {
  it.each([[-4.9, false], [4.9, false], [-5, false], [5, false], [-5.1, true], [5.1, true], [-7, true], [7, true], [-25, true], [25, true]])("deviation %s%% warns: %s", (percent, expected) => {
    expect(hasMacroMismatch({ kcal: 2000, proteinG: 100, fatG: 40, carbG: (2000 * (1 + percent / 100) - 760) / 4 })).toBe(expected);
  });
  it("balances a 25% mismatch by changing carbs only", () => {
    const input = { kcal: 2000, proteinG: 100, fatG: 100, carbG: 50 };
    expect(hasMacroMismatch(input)).toBe(true);
    expect(balanceCarb(input)).toBe(175);
    expect(hasMacroMismatch({ ...input, carbG: balanceCarb(input) })).toBe(false);
    expect(input.carbG).toBe(50);
  });
  it("clamps carbs at zero when protein and fat already exceed kcal", () => {
    expect(balanceCarb({ kcal: 1000, proteinG: 200, fatG: 100 })).toBe(0);
  });
  it("rounds fractional grams as specified in PRD §5.6", () => {
    expect(balanceCarb({ kcal: 2000, proteinG: 100, fatG: 41 })).toBe(308);
  });
  it("warns on zero macros and ignores invalid input until validation", () => {
    expect(hasMacroMismatch({ kcal: 2000, proteinG: 0, carbG: 0, fatG: 0 })).toBe(true);
    for (const kcal of [0, -1, NaN, Infinity]) expect(hasMacroMismatch({ kcal, proteinG: 100, carbG: 100, fatG: 40 })).toBe(false);
  });
});
