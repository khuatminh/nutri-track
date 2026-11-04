import type { Metadata } from "next";
import { MealCard } from "@/components/diary/meal-card";
import { DateNav } from "@/components/dashboard/date-nav";
import { Card } from "@/components/ui/misc";
import { addDays, isoToDate, todayIn } from "@/lib/dates";
import { fmtInt } from "@/lib/format";
import { MEAL_ORDER } from "@/lib/meals";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { listDay } from "@/server/food-log/service";
import type { ServingDto } from "@/server/foods/search";
import { targetsForDate } from "@/server/profile/service";

export const metadata: Metadata = { title: "Nhật ký" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const u = await requireUser();
  const today = todayIn(u.timezone);
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const [logs, targets, yesterday] = await Promise.all([
    listDay(u.userId, date),
    targetsForDate(u.userId, date),
    db.foodLog.groupBy({ by: ["meal"], where: { userId: u.userId, logDate: isoToDate(addDays(date, -1)) }, _count: { _all: true } }),
  ]);
  const yBy = new Map(yesterday.map((y) => [y.meal, y._count._all]));
  // Units available for the edit dialog; a log stores only its label/grams, so match on those.
  const foodIds = [...new Set(logs.map((l) => l.foodId).filter((id): id is string => !!id))];
  const servingRows = foodIds.length
    ? await db.foodServing.findMany({ where: { foodId: { in: foodIds } }, orderBy: { label: "asc" }, select: { id: true, label: true, grams: true, isDefault: true, foodId: true } })
    : [];
  const servingsByFood: Record<string, ServingDto[]> = {};
  for (const s of servingRows) (servingsByFood[s.foodId] ??= []).push({ id: s.id, label: s.label, grams: s.grams, isDefault: s.isDefault });
  const total = logs.reduce((s, l) => s + l.kcal, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] font-bold">Nhật ký</h1>
        <DateNav date={date} today={today} basePath="/nhat-ky" />
      </div>
      <Card className="flex items-center justify-between">
        <span className="text-sm text-muted">Tổng trong ngày</span>
        <span className="font-bold">{fmtInt(total)}{targets ? ` / ${fmtInt(targets.kcal)}` : ""} kcal</span>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {MEAL_ORDER.map((m) => (
          <MealCard key={m} meal={m} date={date} items={logs.filter((l) => l.meal === m)} yesterdayCount={yBy.get(m) ?? 0} servingsByFood={servingsByFood} />
        ))}
      </div>
    </div>
  );
}
