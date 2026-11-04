import { addDays, dateToIso, isoToDate, startOfWeek } from "@/lib/dates";
import { summarizePeriod, ZERO_NUTRIENTS, type DayTotals, type PeriodSummary } from "@/lib/nutrition";
import { db } from "@/server/db";
import { getWeightChart } from "@/server/weight/service";

export interface ReportDay extends DayTotals {
  weightKg: number | null;
}

export interface PeriodReport {
  granularity: "week" | "month";
  from: string;
  to: string;
  days: ReportDay[];
  summary: PeriodSummary;
  /** Month view: average kcal per ISO week (only weeks with data). */
  weekly: Array<{ weekStart: string; avgKcal: number; daysWithData: number }>;
  weight: { first: number | null; last: number | null; changeKg: number | null };
}

/** Inclusive date range for the period that contains `anchor` (weeks run Mon–Sun, months by calendar). */
export function periodRange(granularity: "week" | "month", anchor: string): { from: string; to: string } {
  if (granularity === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 6) };
  }
  const [y, m] = anchor.split("-").map(Number) as [number, number];
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from, to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}` };
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * US-19/20: aggregates in SQL (one query per table, no N+1). Empty days are flagged `hasLog=false`
 * and excluded from averages. Targets come from TargetHistory in effect on each day (PRD §8.4).
 */
export async function getPeriodReport(userId: string, granularity: "week" | "month", anchor: string): Promise<PeriodReport> {
  const { from, to } = periodRange(granularity, anchor);
  const range = { gte: isoToDate(from), lte: isoToDate(to) };
  const [logs, water, weights, history, profile] = await Promise.all([
    db.foodLog.groupBy({
      by: ["logDate"],
      where: { userId, logDate: range },
      _sum: { kcal: true, proteinG: true, carbG: true, fatG: true, fiberG: true, sugarG: true, sodiumMg: true },
      _count: { _all: true },
    }),
    db.waterLog.groupBy({ by: ["logDate"], where: { userId, logDate: range }, _sum: { amountMl: true } }),
    db.weightLog.findMany({ where: { userId, logDate: range }, orderBy: { logDate: "asc" } }),
    db.targetHistory.findMany({ where: { userId }, orderBy: { effectiveFrom: "asc" } }),
    db.profile.findUnique({ where: { userId }, select: { calorieTarget: true } }),
  ]);
  const missing = await db.foodLog.groupBy({ by: ["logDate"], where: { userId, logDate: range, missingMicro: true }, _count: { _all: true } });

  const logBy = new Map(logs.map((l) => [dateToIso(l.logDate), l]));
  const waterBy = new Map(water.map((w) => [dateToIso(w.logDate), w._sum.amountMl ?? 0]));
  const missBy = new Set(missing.map((m) => dateToIso(m.logDate)));
  const wBy = new Map(weights.map((w) => [dateToIso(w.logDate), w.weightKg]));
  const targetOn = (d: string): number => {
    let t = history[0]?.kcal ?? profile?.calorieTarget ?? 0;
    for (const h of history) if (dateToIso(h.effectiveFrom) <= d) t = h.kcal;
    return t;
  };

  const days: ReportDay[] = eachDay(from, to).map((date) => {
    const l = logBy.get(date);
    return {
      date,
      hasLog: !!l,
      nutrients: l
        ? { kcal: l._sum.kcal ?? 0, proteinG: l._sum.proteinG ?? 0, carbG: l._sum.carbG ?? 0, fatG: l._sum.fatG ?? 0, fiberG: l._sum.fiberG ?? 0, sugarG: l._sum.sugarG ?? 0, sodiumMg: l._sum.sodiumMg ?? 0 }
        : ZERO_NUTRIENTS,
      targetKcal: targetOn(date),
      waterMl: waterBy.get(date) ?? 0,
      missingMicro: missBy.has(date),
      weightKg: wBy.get(date) ?? null,
    };
  });

  const weekly = new Map<string, { sum: number; n: number }>();
  if (granularity === "month") {
    for (const d of days) {
      if (!d.hasLog) continue;
      const k = startOfWeek(d.date);
      const w = weekly.get(k) ?? { sum: 0, n: 0 };
      w.sum += d.nutrients.kcal;
      w.n += 1;
      weekly.set(k, w);
    }
  }
  const wl = weights.map((w) => w.weightKg);
  return {
    granularity,
    from,
    to,
    days,
    summary: summarizePeriod(days),
    weekly: [...weekly.entries()].map(([weekStart, w]) => ({ weekStart, avgKcal: w.sum / w.n, daysWithData: w.n })),
    weight: { first: wl[0] ?? null, last: wl[wl.length - 1] ?? null, changeKg: wl.length >= 2 ? wl[wl.length - 1]! - wl[0]! : null },
  };
}

export { getWeightChart };
