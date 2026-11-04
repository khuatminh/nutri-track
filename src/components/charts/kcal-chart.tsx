"use client";
import { Bar, CartesianGrid, Cell, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { fmtShortDate } from "@/lib/dates";
import { fmtInt } from "@/lib/format";
import type { ReportDay } from "@/server/reports/service";


/** Daily kcal bars (+ target line). Over-target days use a different colour AND a legend entry (never colour alone). */
export function KcalChart({ days }: { days: ReportDay[] }) {
  const data = days.map((d) => ({ date: d.date, kcal: d.hasLog ? Math.round(d.nutrients.kcal) : null, target: d.targetKcal, over: d.hasLog && d.nutrients.kcal > d.targetKcal * 1.1 }));
  const logged = data.filter((d) => d.kcal !== null).length;
  return (
    <div>
      <div role="img" aria-label={`Biểu đồ kcal mỗi ngày, ${logged} ngày có dữ liệu trên ${days.length} ngày`} className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8)} tick={{ fill: "var(--text-muted)", fontSize: 12 }} interval={days.length > 10 ? 2 : 0} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} width={44} tickFormatter={(v: number) => fmtInt(v)} />
            <Tooltip formatter={(v) => `${fmtInt(Number(v))} kcal`} labelFormatter={(l) => fmtShortDate(String(l))} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
            <Bar dataKey="kcal" name="Đã ăn" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => <Cell key={d.date} fill={d.over ? "var(--macro-carb)" : "var(--chart-line)"} />)}
            </Bar>
            <Line dataKey="target" name="Mục tiêu" stroke="var(--text)" strokeDasharray="6 4" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 flex flex-wrap gap-4 text-sm"><span><span className="inline-block size-3 rounded-sm bg-kcal" aria-hidden /> Trong mức mục tiêu</span><span><span className="inline-block size-3 rounded-sm bg-carb" aria-hidden /> Vượt &gt;10% mục tiêu</span><span>╌ Mục tiêu</span></p>
      <details className="mt-2">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-primary">Xem dạng bảng</summary>
        <table className="w-full text-sm"><caption className="sr-only">Kcal mỗi ngày</caption><thead><tr><th className="py-2 text-left">Ngày</th><th className="text-right">Đã ăn (kcal)</th><th className="text-right">Mục tiêu</th></tr></thead>
          <tbody>{days.map((d) => <tr key={d.date} className="border-t border-border"><td className="py-2">{fmtShortDate(d.date)}</td><td className="text-right">{d.hasLog ? fmtInt(d.nutrients.kcal) : "Chưa có dữ liệu"}</td><td className="text-right">{fmtInt(d.targetKcal)}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}
