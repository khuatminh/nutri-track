import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DateNav } from "@/components/dashboard/date-nav";
import { WaterCard } from "@/components/dashboard/water-card";
import { RetargetPrompt } from "@/components/dashboard/retarget-prompt";
import { WeightCard } from "@/components/dashboard/weight-card";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { KcalRing, MacroBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { addDays, fmtLongDate, todayIn } from "@/lib/dates";
import { fmtInt } from "@/lib/format";
import { MEAL_EMOJI, MEAL_LABEL } from "@/lib/meals";
import { requireUser } from "@/server/auth";
import { getDashboard } from "@/server/dashboard/service";
import { getRetargetSuggestion } from "@/server/profile/service";
import { listWater } from "@/server/water/service";

export const metadata: Metadata = { title: "Hôm nay" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const u = await requireUser();
  const today = todayIn(u.timezone);
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const [d, water, suggestion] = await Promise.all([getDashboard(u.userId, date), listWater(u.userId, date), getRetargetSuggestion(u.userId, u.timezone)]);
  if (!d) return <EmptyState title="Chưa có mục tiêu" hint="Hãy hoàn tất hồ sơ để xem tổng quan." action={<Button asChild><Link href="/ho-so">Mở hồ sơ</Link></Button>} />;
  const over = d.remainingKcal < 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight">Hôm nay</h1>
          <p className="text-sm text-muted">{fmtLongDate(date)}{d.streak > 1 && <> · 🔥 {d.streak} ngày liên tiếp</>}</p>
        </div>
        <DateNav date={date} today={today} basePath="/hom-nay" />
      </div>
      {date > addDays(today, 1) && <Badge tone="warn" className="self-start">Ngày ở tương lai — bạn chỉ có thể xem.</Badge>}
      {suggestion && <RetargetPrompt s={suggestion} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="justify-self-center"><KcalRing eaten={d.eaten.kcal} target={d.targets.kcal} /></div>
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-sm text-muted">Đã ăn <strong className="text-text">{fmtInt(d.eaten.kcal)}</strong> / {fmtInt(d.targets.kcal)} kcal</p>
              {over && <Badge tone="warn" className="self-start">ⓘ Vượt {fmtInt(-d.remainingKcal)} kcal — không sao, ngày mai điều chỉnh nhẹ nhàng nhé.</Badge>}
              <MacroBar kind="protein" eatenG={d.macros.protein.eatenG} targetG={d.macros.protein.targetG} />
              <MacroBar kind="carb" eatenG={d.macros.carb.eatenG} targetG={d.macros.carb.targetG} />
              <MacroBar kind="fat" eatenG={d.macros.fat.eatenG} targetG={d.macros.fat.targetG} />
            </div>
          </Card>

          {d.isEmpty ? (
            <Card><EmptyState icon="🍽️" title="Chưa có bữa ăn nào" hint="Ghi bữa đầu tiên của ngày — chỉ mất vài chạm." action={<Button asChild><Link href={`/nhat-ky/them?date=${date}`}>Thêm bữa đầu tiên</Link></Button>} /></Card>
          ) : null}

          <Card>
            <h2 className="mb-2 text-lg font-semibold">Các bữa ăn</h2>
            <ul className="divide-y divide-border">
              {d.meals.map((m) => (
                <li key={m.meal} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/nhat-ky?date=${date}#${m.meal}`} className="flex min-h-11 items-center gap-2 font-semibold hover:underline"><span aria-hidden>{MEAL_EMOJI[m.meal]}</span>{MEAL_LABEL[m.meal]}</Link>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{fmtInt(m.kcal)} kcal</span>
                      <Button asChild size="sm" variant="secondary"><Link href={`/nhat-ky/them?date=${date}&meal=${m.meal}`} aria-label={`Thêm món vào ${MEAL_LABEL[m.meal]}`}><Plus className="size-4" aria-hidden /> Thêm</Link></Button>
                    </span>
                  </div>
                  {m.items.length > 0 && <p className="truncate pl-8 text-sm text-muted">{m.items.map((i) => i.name).join(", ")}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <WaterCard date={date} totalMl={d.water.totalMl} targetMl={d.water.targetMl} logs={water} />
          <WeightCard weight={d.weight} hidden={d.hideWeight} />
        </div>
      </div>
    </div>
  );
}
