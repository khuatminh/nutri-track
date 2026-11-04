import { z } from "zod";
import { RANGES } from "@/lib/nutrition/constants";

const num = (msg: string) => z.number({ error: msg });
const nonNeg = (msg: string) => num(msg).min(0, "Không được âm");

export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
export const mealSchema = z.enum(MEALS, { error: "Vui lòng chọn bữa" });
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ");

export const servingInputSchema = z.object({
  label: z.string().trim().min(1, "Nhập đơn vị (bát, đĩa, cái…)").max(30),
  grams: num("Nhập số gram").min(RANGES.servingGrams.min, "Tối thiểu 0,1 g").max(RANGES.servingGrams.max, "Tối đa 5.000 g"),
  isDefault: z.boolean().optional(),
});

/** Custom food, nutrition per 100 g (US-09.1). */
export const customFoodSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên món").max(120, "Tên tối đa 120 ký tự"),
  category: z.string().trim().max(60).optional(),
  energyKcal: nonNeg("Nhập kcal").max(RANGES.foodKcal.max, "Tối đa 5.000 kcal"),
  proteinG: nonNeg("Nhập protein").max(100, "Tối đa 100 g trên 100 g"),
  carbG: nonNeg("Nhập carb").max(100, "Tối đa 100 g trên 100 g"),
  fatG: nonNeg("Nhập chất béo").max(100, "Tối đa 100 g trên 100 g"),
  fiberG: nonNeg("Không hợp lệ").max(100).optional(),
  sugarG: nonNeg("Không hợp lệ").max(100).optional(),
  sodiumMg: nonNeg("Không hợp lệ").max(40000).optional(),
  servings: z.array(servingInputSchema).max(10).default([]),
});
export type CustomFoodInput = z.infer<typeof customFoodSchema>;

const quantity = num("Nhập số lượng").positive("Số lượng phải lớn hơn 0").max(5000, "Số lượng quá lớn");

export const addLogSchema = z.object({
  date: isoDateSchema,
  meal: mealSchema,
  kind: z.enum(["food", "recipe"]),
  itemId: z.string().min(1),
  /** FoodServing id; omit to log in grams. Recipes always use their implicit "phần" serving. */
  servingId: z.string().min(1).optional(),
  quantity,
  source: z.enum(["search", "recent", "copy", "quick"]).default("search"),
});
export type AddLogInput = z.infer<typeof addLogSchema>;

export const updateLogSchema = z.object({
  quantity: quantity.optional(),
  servingId: z.string().min(1).nullable().optional(),
  meal: mealSchema.optional(),
  date: isoDateSchema.optional(),
});

export const quickLogSchema = z.object({
  date: isoDateSchema,
  meal: mealSchema,
  name: z.string().trim().max(120).optional(),
  kcal: nonNeg("Nhập kcal").max(RANGES.foodKcal.max, "Tối đa 5.000 kcal"),
  proteinG: nonNeg("Không hợp lệ").max(1000).optional(),
  carbG: nonNeg("Không hợp lệ").max(1000).optional(),
  fatG: nonNeg("Không hợp lệ").max(1000).optional(),
});

export const recipeInputSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên công thức").max(120, "Tên tối đa 120 ký tự"),
  servings: num("Nhập số khẩu phần")
    .min(0.5, "Số khẩu phần từ 0,5 đến 50")
    .max(RANGES.recipeServings.max, "Số khẩu phần từ 0,5 đến 50"),
  cookedWeightG: num("Không hợp lệ").positive("Phải lớn hơn 0").max(50000).optional(),
  note: z.string().trim().max(500).optional(),
  ingredients: z
    .array(
      z.object({
        foodId: z.string().min(1),
        quantity,
        servingId: z.string().min(1).optional(),
      }),
    )
    .min(1, "Thêm ít nhất 1 nguyên liệu")
    .max(60, "Tối đa 60 nguyên liệu"),
});
export type RecipeInput = z.infer<typeof recipeInputSchema>;

export const waterSchema = z.object({
  amountMl: num("Nhập lượng nước").int("Nhập số nguyên").min(1, "Tối thiểu 1 ml").max(2000, "Tối đa 2.000 ml mỗi lần"),
  date: isoDateSchema.optional(),
});

export const weightSchema = z.object({
  date: isoDateSchema,
  weightKg: num("Nhập cân nặng")
    .min(RANGES.weightKg.min, "Cân nặng từ 20 đến 300 kg")
    .max(RANGES.weightKg.max, "Cân nặng từ 20 đến 300 kg"),
  note: z.string().trim().max(200).optional(),
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ không hợp lệ (HH:mm)");
export const reminderSchema = z
  .object({
    type: z.enum(["water", "meal"]),
    meal: mealSchema.optional(),
    enabled: z.boolean().default(true),
    times: z.array(hhmm).max(8).default([]),
    startTime: hhmm.optional(),
    endTime: hhmm.optional(),
    intervalHours: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1, "Chọn ít nhất một ngày trong tuần"),
  })
  .superRefine((r, ctx) => {
    if (r.type === "water") {
      if (!r.startTime || !r.endTime || !r.intervalHours) {
        ctx.addIssue({ code: "custom", path: ["startTime"], message: "Nhập khung giờ và khoảng cách nhắc" });
      } else if (r.endTime <= r.startTime) {
        ctx.addIssue({ code: "custom", path: ["endTime"], message: "Giờ kết thúc phải sau giờ bắt đầu" });
      }
    } else {
      if (!r.meal) ctx.addIssue({ code: "custom", path: ["meal"], message: "Chọn bữa" });
      if (r.times.length === 0) ctx.addIssue({ code: "custom", path: ["times"], message: "Nhập giờ nhắc" });
    }
  });
export type ReminderInput = z.infer<typeof reminderSchema>;
