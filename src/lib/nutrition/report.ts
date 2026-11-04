import {
  FIBER_G_PER_1000_KCAL,
  FIBER_MIN_G,
  GOAL_DAY_TOLERANCE,
  KCAL_PER_G,
  LOW_LOG_FRACTION,
  SODIUM_MAX_MG,
  SUGAR_MAX_KCAL_FRACTION,
  WEIGHT_TREND_WINDOW,
} from "./constants";
import { ZERO_NUTRIENTS, scaleNutrients, sumNutrients, type Nutrients } from "./servings";

export interface DayTotals {
  /** ISO date `YYYY-MM-DD` (user timezone). */
  date: string;
  nutrients: Nutrients;
  /** Whether at least one FoodLog exists that day. Empty days are excluded from averages (US-19.3). */
  hasLog: boolean;
  /** Kcal target in effect on that day (TargetHistory). */
  targetKcal: number;
  waterMl: number;
  /** Some logged foods lacked fiber/sugar/sodium data (PRD §8.5). */
  missingMicro?: boolean;
}

export interface References {
  sodiumMg: number;
  sugarG: number;
  fiberG: number;
}

/** PRD §5.6/§5.8 reference intakes for a kcal target. */
export function references(targetKcal: number): References {
  return {
    sodiumMg: SODIUM_MAX_MG,
    sugarG: (SUGAR_MAX_KCAL_FRACTION * targetKcal) / KCAL_PER_G.carb,
    fiberG: Math.max(FIBER_MIN_G, (FIBER_G_PER_1000_KCAL * targetKcal) / 1000),
  };
}

export interface PeriodSummary {
  totalDays: number;
  daysWithData: number;
  /** Mean per logged day; all zeros when there is no data. */
  average: Nutrients;
  /** Share of macro kcal (sums to 100 when there is data, else zeros). */
  macroPercent: { protein: number; carb: number; fat: number };
  /** Days with kcal within ±10% of that day's target. */
  goalDays: number;
  /** Logged days under 50% of target — "may be incomplete" (PRD §8.5). */
  lowLogDates: string[];
  averageWaterMl: number;
  missingMicroDays: number;
  references: References;
}

/** US-19.2/19.3, US-20.1: aggregate day totals; days without logs never count as 0. */
export function summarizePeriod(days: readonly DayTotals[]): PeriodSummary {
  const logged = days.filter((d) => d.hasLog);
  const n = logged.length;
  const average = n ? scaleNutrients(sumNutrients(logged.map((d) => d.nutrients)), 1 / n) : ZERO_NUTRIENTS;

  const pKcal = average.proteinG * KCAL_PER_G.protein;
  const cKcal = average.carbG * KCAL_PER_G.carb;
  const fKcal = average.fatG * KCAL_PER_G.fat;
  const macroTotal = pKcal + cKcal + fKcal;
  const pct = (v: number) => (macroTotal > 0 ? (v / macroTotal) * 100 : 0);

  const waterAll = days.filter((d) => d.waterMl > 0);
  const avgTarget = n ? logged.reduce((s, d) => s + d.targetKcal, 0) / n : 0;

  return {
    totalDays: days.length,
    daysWithData: n,
    average,
    macroPercent: { protein: pct(pKcal), carb: pct(cKcal), fat: pct(fKcal) },
    goalDays: logged.filter(
      (d) => d.targetKcal > 0 && Math.abs(d.nutrients.kcal - d.targetKcal) / d.targetKcal <= GOAL_DAY_TOLERANCE + 1e-9,
    ).length,
    lowLogDates: logged.filter((d) => d.nutrients.kcal < LOW_LOG_FRACTION * d.targetKcal).map((d) => d.date),
    averageWaterMl: waterAll.length ? waterAll.reduce((s, d) => s + d.waterMl, 0) / waterAll.length : 0,
    missingMicroDays: logged.filter((d) => d.missingMicro).length,
    references: references(avgTarget),
  };
}

export interface WeightPoint {
  date: string;
  weightKg: number;
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** US-17.1: trailing moving average over `windowDays` calendar days; points are not interpolated. */
export function weightTrend(points: readonly WeightPoint[], windowDays = WEIGHT_TREND_WINDOW): WeightPoint[] {
  const sorted = [...points].sort((a, b) => dayNumber(a.date) - dayNumber(b.date));
  return sorted.map((p) => {
    const end = dayNumber(p.date);
    const win = sorted.filter((q) => {
      const dn = dayNumber(q.date);
      return dn <= end && dn > end - windowDays;
    });
    return { date: p.date, weightKg: win.reduce((s, q) => s + q.weightKg, 0) / win.length };
  });
}

export interface WeightChange {
  sinceFirstKg: number | null;
  /** Change vs the latest record at or before (latest − N days), per window. */
  sinceDaysKg: Record<number, number | null>;
}

/** US-17.4: change since first record and vs 7/30 days ago. */
export function weightChange(points: readonly WeightPoint[], windows: readonly number[] = [7, 30]): WeightChange {
  const sorted = [...points].sort((a, b) => dayNumber(a.date) - dayNumber(b.date));
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  const sinceDaysKg: Record<number, number | null> = {};
  for (const w of windows) {
    sinceDaysKg[w] = null;
    if (!last) continue;
    const cutoff = dayNumber(last.date) - w;
    const ref = [...sorted].reverse().find((p) => dayNumber(p.date) <= cutoff);
    if (ref) sinceDaysKg[w] = last.weightKg - ref.weightKg;
  }
  return { sinceFirstKg: last && first && last !== first ? last.weightKg - first.weightKg : null, sinceDaysKg };
}

/** US-13.1: remaining = target − eaten (negative means over). */
export function remainingKcal(targetKcal: number, eatenKcal: number): number {
  return targetKcal - eatenKcal;
}

/** US-13.3: percent complete for macro bars; not capped so overages show the true number. */
export function percentOf(value: number, target: number): number {
  return target > 0 ? (value / target) * 100 : 0;
}
