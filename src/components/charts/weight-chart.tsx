"use client";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtShortDate } from "@/lib/dates";
import { fmtKg } from "@/lib/format";
import type { WeightChart } from "@/server/weight/service";

/** Weight line + 7-day trend + goal line. Always accompanied by a data table for screen readers (US-17.2). */
export function WeightChartView({ chart }: { chart: WeightChart }) {
  const trend = new Map(chart.trend.map((t) => [t.date, t.weightKg]));
  const data = chart.points.map((p) => ({ date: p.date, kg: p.weightKg, trend: trend.get(p.date) ?? null }));
  const summary = data.length ? `Biểu đồ cân nặng ${data.length} lần ghi, từ ${fmtKg(data[0]!.kg)} đến ${fmtKg(data[data.length - 1]!.kg)}.` : "Chưa có dữ liệu";
  return (
    <div>
      <div role="img" aria-label={summary} className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8) + "/" + d.slice(5, 7)} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "var(--text-muted)", fontSize: 12 }} width={40} tickFormatter={(v: number) => String(Math.round(v))} />
            <Tooltip formatter={(v) => fmtKg(Number(v))} labelFormatter={(l) => fmtShortDate(String(l))} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
            {chart.targetWeightKg && <ReferenceLine y={chart.targetWeightKg} stroke="var(--macro-carb)" strokeDasharray="6 4" label={{ value: `Mục tiêu ${fmtKg(chart.targetWeightKg)}`, fill: "var(--macro-carb-text)", fontSize: 12, position: "insideTopRight" }} />}
            <Line type="monotone" dataKey="kg" name="Cân nặng" stroke="var(--chart-line)" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="trend" name="Xu hướng 7 ngày" stroke="var(--macro-protein)" strokeWidth={2} strokeDasharray="2 4" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 flex flex-wrap gap-4 text-sm"><span>━ Cân nặng</span><span>┈ Xu hướng 7 ngày</span>{chart.targetWeightKg && <span>╌ Mục tiêu</span>}</p>
      <details className="mt-2">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-primary">Xem dạng bảng</summary>
        <table className="w-full text-sm"><caption className="sr-only">Dữ liệu cân nặng</caption><thead><tr><th className="py-2 text-left">Ngày</th><th className="text-right">Cân nặng</th><th className="text-right">Xu hướng</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.date} className="border-t border-border"><td className="py-2">{fmtShortDate(d.date)}</td><td className="text-right">{fmtKg(d.kg)}</td><td className="text-right">{d.trend ? fmtKg(d.trend) : "—"}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}
