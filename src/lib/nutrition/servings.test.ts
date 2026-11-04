import { describe, expect, it } from "vitest";
import { previewPortion, type PreviewFood } from "./servings";

const food: PreviewFood = {
  kind: "food",
  energyKcal: 180,
  proteinG: 10,
  carbG: 20,
  fatG: 6,
  fiberG: 2,
  sugarG: 3,
  sodiumMg: 100,
  servings: [
    { id: "bowl", grams: 200 },
    { id: "half", grams: 100 },
  ],
};

describe("previewPortion (US-07.1)", () => {
  it("shows fiber, sugar and sodium for the selected serving", () => {
    expect(previewPortion(food, "bowl", 1)).toMatchObject({
      grams: 200,
      kcal: 360,
      proteinG: 20,
      carbG: 40,
      fatG: 12,
      fiberG: 4,
      sugarG: 6,
      sodiumMg: 200,
    });
  });

  it("recalculates all seven values when the serving or quantity changes", () => {
    expect(previewPortion(food, "half", 1)).toMatchObject({
      grams: 100,
      kcal: 180,
      fiberG: 2,
      sugarG: 3,
      sodiumMg: 100,
    });
    expect(previewPortion(food, "bowl", 1.5)).toMatchObject({
      grams: 300,
      kcal: 540,
      fiberG: 6,
      sugarG: 9,
      sodiumMg: 300,
    });
    // "gam (g)" has no serving row: quantity is grams.
    expect(previewPortion(food, "", 150)).toMatchObject({
      grams: 150,
      kcal: 270,
      fiberG: 3,
      sugarG: 4.5,
      sodiumMg: 150,
    });
  });

  it("keeps missing micronutrients as null instead of pretending they are zero", () => {
    const own: PreviewFood = { ...food, fiberG: null, sugarG: null, sodiumMg: null, servings: [{ id: "s", grams: 100 }] };
    expect(previewPortion(own, "s", 2)).toMatchObject({ fiberG: null, sugarG: null, sodiumMg: null, kcal: 360 });
  });

  it("reads recipe values per serving", () => {
    const recipe: PreviewFood = {
      kind: "recipe",
      energyKcal: 420,
      proteinG: 30,
      carbG: 40,
      fatG: 12,
      fiberG: 7,
      sugarG: 5,
      sodiumMg: 600,
      servings: [{ id: "recipe:r1", grams: 350 }],
    };
    expect(previewPortion(recipe, "recipe:r1", 2)).toMatchObject({
      grams: 700,
      kcal: 840,
      fiberG: 14,
      sugarG: 10,
      sodiumMg: 1200,
    });
  });
});
