import { z } from "zod";

export const CONFIDENCE = ["high", "medium", "low"] as const;

const nonNeg = z.number().finite().min(0);

export const servingSchema = z.object({
  label: z.string().trim().min(1),
  grams: z.number().finite().positive().max(5000),
  isDefault: z.boolean(),
});

/** Nutrition values are per 100 g (PRD §7). */
export const foodSeedSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase ascii-kebab"),
    name: z.string().trim().min(1),
    category: z.string().trim().min(1),
    isVietnamese: z.boolean(),
    energyKcal: nonNeg.max(900),
    proteinG: nonNeg.max(100),
    carbG: nonNeg.max(100),
    fatG: nonNeg.max(100),
    fiberG: nonNeg.max(100),
    sugarG: nonNeg.max(100),
    sodiumMg: nonNeg.max(40000),
    servings: z.array(servingSchema).min(1),
    source: z.string().trim().min(1),
    confidence: z.enum(CONFIDENCE),
  })
  .refine((f) => f.servings.filter((s) => s.isDefault).length === 1, {
    message: "exactly one default serving required",
    path: ["servings"],
  })
  .refine((f) => f.fiberG <= f.carbG + 0.01 && f.sugarG <= f.carbG + 0.01, {
    message: "fiber and sugar cannot exceed total carbs",
    path: ["carbG"],
  });

export type FoodSeed = z.infer<typeof foodSeedSchema>;
export const foodSeedListSchema = z.array(foodSeedSchema);
