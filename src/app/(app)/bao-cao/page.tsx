import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { KcalChart } from "@/components/charts/kcal-chart";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { addDays, fmtShortDate, todayIn } from "@/lib/dates";
import { fmtDec1, fmtInt } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { getPeriodReport } from "@/server/reports/service";

export const metadata: Metadata = { title: "Báo cáo" };

function shift(anchor: string, view: "week" | "month", dir: -1 | 1): string {
  if (view === "week") return addDays(anchor, 7 * dir);
  const [y, m] = anchor.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + dir, 1));
  return d.toISOString().slice(0, 10);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "month" ? "month" : "week";
  const today = todayIn(u.timezone);
  const anchor = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const r = await getPeriodReport(u.userId, view, anchor);
  const s = r.summary;
  const link = (v: string, d: string) => `/bao-cao?view=${v}&date=${d}`;
  const ref = s.references;
  const n = s.daysWithData;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Báo cáo" subtitle={`${fmtShortDate(r.from)} – ${fmtShortDate(r.to)}`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Kiểu báo cáo" className="flex rounded-md bg-surface-2 p-1">
          {(["week", "month"] as const).map((v) => <Link key={v} href={link(v, anchor)} aria-current={v === view ? "page" : undefined} className={`min-h-9 content-center rounded-sm px-4 text-sm font-semibold ${v === view ? "bg-surface shadow-[var(--shadow-1)]" : "text-muted"}`}>{v === "week" ? "Tuần" : "Tháng"}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href={link(view, shift(anchor, view, -1))} className="grid size-11 place-items-center rounded-full bg-surface-2" aria-label={view === "week" ? "Tuần trước" : "Tháng trước"}><ChevronLeft className="size-5" aria-hidden /></Link>
          <Link href={link(view, shift(anchor, view, 1))} className="grid size-11 place-items-center rounded-full bg-surface-2" aria-label={view === "week" ? "Tuần sau" : "Tháng sau"}><ChevronRight className="size-5" aria-hidden /></Link>
          {anchor !== today && <Link href={`/bao-cao?view=${view}`} className="text-sm font-semibold text-primary underline">Hiện tại</Link>}
        </div>
      </div>

      {n === 0 ? (
        <Card><EmptyState icon="📊" title="Chưa có dữ liệu trong khoảng này" hint="Ghi vài bữa ăn để xem báo cáo." /></Card>
      ) : (
        <>
          <p className="text-sm text-muted">Trung bình trên <strong>{n}/{s.totalDays}</strong> ngày có dữ liệu (ngày trống không tính).</p>
          {s.lowLogDates.length > 0 && <Badge tone="warn" className="self-start">ⓘ {s.lowLogDates.length} ngày có thể chưa ghi đủ (dưới 50% mục tiêu).</Badge>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><p className="text-sm text-muted">Kcal trung bình/ngày</p><p className="text-2xl font-bold">{fmtInt(s.average.kcal)}</p></Card>
            <Card><p className="text-sm text-muted">Ngày đạt mục tiêu (±10%)</p><p className="text-2xl font-bold">{s.goalDays}/{n}</p></Card>
            <Card><p className="text-sm text-muted">Nước trung bình</p><p className="text-2xl font-bold">{s.averageWaterMl ? `${fmtInt(s.averageWaterMl)} ml` : "—"}</p></Card>
          </div>
          <Card><h2 className="mb-2 text-lg font-semibold">Kcal mỗi ngày</h2><KcalChart days={r.days} /></Card>
          {view === "month" && r.weekly.length > 0 && (
            <Card><h2 className="mb-2 text-lg font-semibold">Trung bình theo tuần</h2>
              <ul className="divide-y divide-border">{r.weekly.map((w) => <li key={w.weekStart} className="flex justify-between py-2 text-sm"><span>Tuần từ {fmtShortDate(w.weekStart)}</span><span className="font-semibold">{fmtInt(w.avgKcal)} kcal · {w.daysWithData} ngày</span></li>)}</ul>
            </Card>
          )}
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Dinh dưỡng trung bình/ngày</h2>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div><dt className="font-semibold text-protein-text">■ Đạm</dt><dd>{fmtDec1(s.average.proteinG)} g · {fmtInt(s.macroPercent.protein)}% kcal</dd></div>
              <div><dt className="font-semibold text-carb-text">● Tinh bột</dt><dd>{fmtDec1(s.average.carbG)} g · {fmtInt(s.macroPercent.carb)}% kcal</dd></div>
              <div><dt className="font-semibold text-fat-text">◆ Béo</dt><dd>{fmtDec1(s.average.fatG)} g · {fmtInt(s.macroPercent.fat)}% kcal</dd></div>
              <div><dt className="font-semibold">Chất xơ</dt><dd>{fmtDec1(s.average.fiberG)} g <span className="text-muted">(khuyến nghị ≥ {fmtInt(ref.fiberG)} g)</span></dd></div>
              <div><dt className="font-semibold">Đường</dt><dd>{fmtDec1(s.average.sugarG)} g <span className="text-muted">(≤ {fmtInt(ref.sugarG)} g)</span></dd></div>
              <div><dt className="font-semibold">Natri</dt><dd>{fmtInt(s.average.sodiumMg)} mg <span className="text-muted">(≤ {fmtInt(ref.sodiumMg)} mg)</span></dd></div>
            </dl>
            {s.missingMicroDays > 0 && <p className="mt-2 text-xs text-muted">Một số món chưa có dữ liệu natri/đường/xơ nên được tính là 0.</p>}
          </Card>
          <Card>
            <h2 className="mb-1 text-lg font-semibold">Cân nặng</h2>
            {r.weight.changeKg === null ? <p className="text-sm text-muted">Chưa đủ dữ liệu trong khoảng này. <Link href="/can-nang" className="text-primary underline">Ghi cân nặng</Link></p> : <p className="text-sm">Thay đổi: <strong>{r.weight.changeKg > 0 ? "+" : r.weight.changeKg < 0 ? "−" : ""}{fmtDec1(Math.abs(r.weight.changeKg))} kg</strong> · <Link href="/can-nang" className="text-primary underline">Xem xu hướng</Link></p>}
          </Card>
        </>
      )}
    </div>
  );
}
