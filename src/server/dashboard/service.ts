import type { Meal } from "@prisma/client";
import { addDays, dateToIso, isoToDate } from "@/lib/dates";
import { percentOf, remainingKcal, sumNutrients, type Nutrients } from "@/lib/nutrition";
import { db } from "@/server/db";
import { listDay, type LogDto } from "@/server/food-log/service";
import { targetsForDate, type TargetSet } from "@/server/profile/service";
import { latestWeight, type WeightDto } from "@/server/weight/service";
import { waterTotal } from "@/server/water/service";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export interface DashboardData {
  date: string;
  targets: TargetSet;
  eaten: Nutrients;
  /** target − eaten; negative means over (US-13.1/13.2). */
  remainingKcal: number;
  macros: Record<"protein" | "carb" | "fat", { eatenG: number; targetG: number; percent: number }>;
  meals: Array<{ meal: Meal; kcal: number; items: LogDto[] }>;
  water: { totalMl: number; targetMl: number; reached: boolean };
  weight: WeightDto | null;
  hideWeight: boolean;
  /** Consecutive logged days ending on `date` (or the day before when `date` is still empty) — US-13.9. */
  streak: number;
  isEmpty: boolean;
}

/** US-13: everything the Today screen needs for one date, using that day's effective targets. */
export async function getDashboard(userId: string, date: string): Promise<DashboardData | null> {
  const [targets, logs, water, weight, profile] = await Promise.all([
    targetsForDate(userId, date),
    listDay(userId, date),
    waterTotal(userId, date),
    latestWeight(userId),
    db.profile.findUnique({ where: { userId }, select: { hideWeight: true } }),
  ]);
  if (!targets) return null;
  const eaten = sumNutrients(logs.map((l) => ({ kcal: l.kcal, proteinG: l.proteinG, carbG: l.carbG, fatG: l.fatG, fiberG: l.fiberG, sugarG: l.sugarG, sodiumMg: l.sodiumMg })));
  return {
    date,
    targets,
    eaten,
    remainingKcal: remainingKcal(targets.kcal, eaten.kcal),
    macros: {
      protein: { eatenG: eaten.proteinG, targetG: targets.proteinG, percent: percentOf(eaten.proteinG, targets.proteinG) },
      carb: { eatenG: eaten.carbG, targetG: targets.carbG, percent: percentOf(eaten.carbG, targets.carbG) },
      fat: { eatenG: eaten.fatG, targetG: targets.fatG, percent: percentOf(eaten.fatG, targets.fatG) },
    },
    meals: MEALS.map((meal) => {
      const items = logs.filter((l) => l.meal === meal);
      return { meal, kcal: items.reduce((s, i) => s + i.kcal, 0), items };
    }),
    water: { totalMl: water, targetMl: targets.waterMl, reached: water >= targets.waterMl },
    weight,
    hideWeight: profile?.hideWeight ?? false,
    streak: await streakEnding(userId, date, logs.length > 0),
    isEmpty: logs.length === 0,
  };
}

async function streakEnding(userId: string, date: string, hasToday: boolean): Promise<number> {
  const rows = await db.foodLog.findMany({
    where: { userId, logDate: { gte: isoToDate(addDays(date, -120)), lte: isoToDate(date) } },
    distinct: ["logDate"],
    select: { logDate: true },
  });
  const days = new Set(rows.map((r) => dateToIso(r.logDate)));
  let d = hasToday ? date : addDays(date, -1);
  let n = 0;
  while (days.has(d)) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}
