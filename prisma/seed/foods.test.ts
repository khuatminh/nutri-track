import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadFoods, seedFiles, unaccent } from "./load";
import { foodSeedListSchema, foodSeedSchema } from "./schema";

const foods = loadFoods();

describe("foods.vi seed data", () => {
  it("has at least 200 foods", () => {
    expect(foods.length).toBeGreaterThanOrEqual(200);
  });

  it("every file passes the Zod schema", () => {
    for (const f of seedFiles()) {
      const r = foodSeedListSchema.safeParse(JSON.parse(readFileSync(f, "utf8")));
      expect(r.success, f).toBe(true);
    }
  });

  it("has unique slugs and unique accent-free names", () => {
    const slugs = foods.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const keys = foods.map((f) => unaccent(f.name));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("kcal matches 4P+4C+9F within ±15% (1 kcal absolute floor for near-zero foods)", () => {
    const bad = foods.filter((f) => {
      const calc = 4 * f.proteinG + 4 * f.carbG + 9 * f.fatG;
      return Math.abs(f.energyKcal - calc) > Math.max(0.15 * calc, 1);
    });
    expect(bad.map((f) => f.slug)).toEqual([]);
  });

  it("each food has a default serving and a source", () => {
    for (const f of foods) {
      expect(f.servings.some((s) => s.isDefault), f.slug).toBe(true);
      expect(f.source.length, f.slug).toBeGreaterThan(10);
    }
  });

  it("serving grams are plausible for a single portion", () => {
    for (const f of foods) for (const s of f.servings) expect(s.grams, `${f.slug}/${s.label}`).toBeLessThanOrEqual(1000);
  });

  it("macros per 100 g do not exceed 100 g combined", () => {
    for (const f of foods) expect(f.proteinG + f.carbG + f.fatG, f.slug).toBeLessThanOrEqual(100.01);
  });

  it("schema rejects invalid foods", () => {
    const ok = foods[0]!;
    expect(foodSeedSchema.safeParse({ ...ok, slug: "Bad Slug" }).success).toBe(false);
    expect(foodSeedSchema.safeParse({ ...ok, servings: [] }).success).toBe(false);
    expect(foodSeedSchema.safeParse({ ...ok, confidence: "x" }).success).toBe(false);
    expect(foodSeedSchema.safeParse({ ...ok, carbG: 1, fiberG: 5 }).success).toBe(false);
  });

  it("unaccent handles đ and diacritics", () => {
    expect(unaccent("Bún Đậu Mắm Tôm")).toBe("bun dau mam tom");
  });
});
