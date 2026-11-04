"use client";
import { Droplet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addWaterAction, deleteWaterAction, restoreWaterAction, updateWaterAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Badge, Card } from "@/components/ui/misc";
import { WaterBar } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { fmtInt, parseDecimal } from "@/lib/format";
import { WATER_QUICK_ADD_ML } from "@/lib/nutrition";
import type { WaterDto } from "@/server/water/service";

export function WaterCard({ date, totalMl, targetMl, logs }: { date: string; totalMl: number; targetMl: number; logs: WaterDto[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<"other" | "list" | null>(null);
  const [other, setOther] = useState("");
  const [err, setErr] = useState("");
  const reached = totalMl >= targetMl;

  const add = (ml: number) =>
    start(async () => {
      const r = await addWaterAction(ml, date);
      if (!r.ok) {
        toast.show(r.error, { tone: "error" });
        setErr(r.fields?.amountMl ?? r.error);
        return;
      }
      setOpen(null);
      setOther("");
      setErr("");
      toast.show(`Đã thêm ${fmtInt(ml)} ml`);
      router.refresh();
    });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Droplet className="size-5 text-water" aria-hidden /> Nước uống</h2>
        {reached && <Badge tone="ok">✓ Đạt mục tiêu</Badge>}
      </div>
      <p className="text-sm"><strong className="text-xl">{fmtInt(totalMl)}</strong> / {fmtInt(targetMl)} ml</p>
      <WaterBar totalMl={totalMl} targetMl={targetMl} />
      <div className="flex flex-wrap gap-2">
        {WATER_QUICK_ADD_ML.map((ml) => (
          <Button key={ml} size="sm" variant="secondary" disabled={pending} onClick={() => add(ml)} aria-label={`Thêm ${ml} ml`}>+{ml}</Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setOpen("other")}>Khác</Button>
        {logs.length > 0 && <Button size="sm" variant="ghost" onClick={() => setOpen("list")}>Lịch sử ({logs.length})</Button>}
      </div>

      <Sheet open={open === "other"} onOpenChange={(o) => setOpen(o ? "other" : null)} title="Thêm lượng nước khác">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); const n = parseDecimal(other); if (!Number.isInteger(n) || n < 1 || n > 2000) { setErr("Nhập số nguyên từ 1 đến 2.000 ml"); return; } add(n); }}>
          <Input label="Lượng nước" unit="ml" inputMode="numeric" value={other} onChange={(e) => setOther(e.target.value)} error={err} />
          <Button type="submit" loading={pending}>Thêm</Button>
        </form>
      </Sheet>

      <Sheet open={open === "list"} onOpenChange={(o) => setOpen(o ? "list" : null)} title="Nước đã uống hôm nay">
        <ul className="flex flex-col divide-y divide-border">
          {logs.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm text-muted">{new Date(w.loggedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
              <span className="font-semibold">{fmtInt(w.amountMl)} ml</span>
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { const v = parseDecimal(window.prompt("Lượng nước (ml)", String(w.amountMl)) ?? ""); if (Number.isInteger(v) && v >= 1 && v <= 2000) start(async () => { await updateWaterAction(w.id, v); router.refresh(); }); }} aria-label={`Sửa ${w.amountMl} ml`}>Sửa</Button>
                <Button size="sm" variant="ghost" onClick={() => start(async () => { const r = await deleteWaterAction(w.id); if (r.ok) { toast.show("Đã xóa", { actionLabel: "Hoàn tác", onAction: () => void restoreWaterAction(r.removed).then(() => router.refresh()) }); router.refresh(); } })} aria-label={`Xóa ${w.amountMl} ml`}>Xóa</Button>
              </span>
            </li>
          ))}
        </ul>
      </Sheet>
    </Card>
  );
}
