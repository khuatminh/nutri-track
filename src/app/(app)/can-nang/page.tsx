import type { Metadata } from "next";
import Link from "next/link";
import { WeightChartView } from "@/components/charts/weight-chart";
import { WeightForm } from "@/components/charts/weight-form";
import { WeightList } from "@/components/charts/weight-list";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { todayIn } from "@/lib/dates";
import { fmtDec1, fmtKg } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { getWeightChart, listWeights, type WeightRange } from "@/server/weight/service";

export const metadata: Metadata = { title: "Cân nặng" };

const RANGES: Array<{ v: WeightRange; label: string }> = [{ v: 30, label: "30 ngày" }, { v: 90, label: "90 ngày" }, { v: "all", label: "Tất cả" }];
const signed = (n: number | null | undefined) => (n == null ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtDec1(Math.abs(n))} kg`);

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const range: WeightRange = sp.range === "90" ? 90 : sp.range === "all" ? "all" : 30;
  const today = todayIn(u.timezone);
  const [chart, profile, weights] = await Promise.all([
    getWeightChart(u.userId, u.timezone, range),
    db.profile.findUnique({ where: { userId: u.userId }, select: { hideWeight: true } }),
    listWeights(u.userId),
  ]);
  const hidden = profile?.hideWeight ?? false;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Cân nặng" subtitle="Ghi đều đặn để thấy xu hướng — dao động hằng ngày là bình thường." />
      <Card><WeightForm today={today} /></Card>
      {hidden ? (
        <Card><EmptyState icon="🙈" title="Cân nặng đang được ẩn" hint="Bạn có thể hiện lại trong Hồ sơ → Giao diện." action={<Link href="/ho-so" className="text-primary underline">Mở Hồ sơ</Link>} /></Card>
      ) : (
        <>
          {chart.isEmpty ? (
            <Card><EmptyState icon="📈" title="Cần ít nhất 2 lần ghi để vẽ biểu đồ" hint="Ghi cân nặng hôm nay và vài ngày tới để thấy xu hướng." /></Card>
          ) : (
            <Card className="flex flex-col gap-3">
              <nav aria-label="Khoảng thời gian" className="flex gap-2">
                {RANGES.map((r) => <Link key={String(r.v)} href={`/can-nang?range=${r.v}`} aria-current={r.v === range ? "page" : undefined} className={`min-h-11 content-center rounded-full border px-4 text-sm font-semibold ${r.v === range ? "border-primary bg-primary-soft text-primary-soft-text" : "border-border-strong"}`}>{r.label}</Link>)}
              </nav>
              <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                <div><dt className="text-muted">So với lần đầu</dt><dd className="font-bold">{signed(chart.change.sinceFirstKg)}</dd></div>
                <div><dt className="text-muted">7 ngày</dt><dd className="font-bold">{signed(chart.change.sinceDaysKg[7])}</dd></div>
                <div><dt className="text-muted">30 ngày</dt><dd className="font-bold">{signed(chart.change.sinceDaysKg[30])}</dd></div>
              </dl>
              {chart.points.length < 2 ? <p className="text-sm text-muted">Khoảng này chỉ có {chart.points.length} bản ghi. Hãy chọn khoảng dài hơn.</p> : <WeightChartView chart={chart} />}
              <p className="text-xs text-muted">Hiện tại: {chart.points.length ? fmtKg(chart.points[chart.points.length - 1]!.weightKg) : "—"}</p>
            </Card>
          )}
          <Card className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Lịch sử ghi</h2>
            <WeightList items={weights} today={today} />
          </Card>
        </>
      )}
    </div>
  );
}
