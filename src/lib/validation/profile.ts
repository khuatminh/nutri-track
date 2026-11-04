import { z } from "zod";
import { RANGES } from "@/lib/nutrition/constants";

export const profileInputSchema = z.object({
  displayName: z.string().trim().min(1, "Vui lòng nhập tên hiển thị").max(60, "Tên tối đa 60 ký tự"),
  sex: z.enum(["male", "female", "other"], { error: "Vui lòng chọn giới tính" }),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh không hợp lệ")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Ngày sinh không hợp lệ"),
  heightCm: z
    .number({ error: "Vui lòng nhập chiều cao" })
    .min(RANGES.heightCm.min, `Chiều cao từ ${RANGES.heightCm.min} đến ${RANGES.heightCm.max} cm`)
    .max(RANGES.heightCm.max, `Chiều cao từ ${RANGES.heightCm.min} đến ${RANGES.heightCm.max} cm`),
  weightKg: z
    .number({ error: "Vui lòng nhập cân nặng" })
    .min(RANGES.weightKg.min, `Cân nặng từ ${RANGES.weightKg.min} đến ${RANGES.weightKg.max} kg`)
    .max(RANGES.weightKg.max, `Cân nặng từ ${RANGES.weightKg.min} đến ${RANGES.weightKg.max} kg`),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"], { error: "Vui lòng chọn mức vận động" }),
  goal: z.enum(["lose", "maintain", "gain"], { error: "Vui lòng chọn mục tiêu" }),
  goalRateKgPerWeek: z.number().min(0).max(1).optional(),
  targetWeightKg: z.number().min(RANGES.weightKg.min).max(RANGES.weightKg.max).optional(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const customTargetsSchema = z.object({
  kcal: z.number({ error: "Vui lòng nhập kcal" }).int("Kcal phải là số nguyên"),
  proteinG: z.number().int().min(0, "Không được âm").max(1000),
  carbG: z.number().int().min(0, "Không được âm").max(2000),
  fatG: z.number().int().min(0, "Không được âm").max(1000),
  waterMl: z.number().int().min(500, "Nước từ 500 đến 6000 ml").max(6000, "Nước từ 500 đến 6000 ml"),
  /** User confirmed the below-floor warning (PRD §5.5). */
  confirmedBelowFloor: z.boolean().optional(),
});
export type CustomTargetsInput = z.infer<typeof customTargetsSchema>;
