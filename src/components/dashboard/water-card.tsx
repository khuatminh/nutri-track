"use client";
import { Droplet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { addWaterAction, deleteWaterAction, restoreWaterAction, updateWaterAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Badge, Card } from "@/components/ui/misc";
import { WaterBar } from "@/components/ui/progress";
import { RetryNotice } from "@/components/ui/retry";
import { useToast } from "@/components/ui/toast";
import { fmtInt, parseDecimal } from "@/lib/format";
import { friendlyError, newRequestId } from "@/lib/network";
import { WATER_QUICK_ADD_ML } from "@/lib/nutrition";
import type { WaterDto } from "@/server/water/service";

export function WaterCard({ date, totalMl, targetMl, logs }: { date: string; totalMl: number; targetMl: number; logs: WaterDto[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<"other" | "list" | null>(null);
  const [other, setOther] = useState("");
  const [err, setErr] = useState("");
  const [saveError, setSaveError] = useState("");
  const retryRef = useRef<(() => void) | null>(null);

  // NFR-05: the card renders from local state so a tap updates the number before the round-trip.
  // Server props remain the source of truth and replace the optimistic value after revalidation.
  const [total, setTotal] = useState(totalMl);
  const [rows, setRows] = useState(logs);
  useEffect(() => {
    setTotal(totalMl);
    setRows(logs);
  }, [totalMl, logs]);

  const reached = total >= targetMl;

  const add = (ml: number, requestId?: string) => {
    const key = requestId ?? newRequestId();
    setErr("");
    setSaveError("");
    retryRef.current = null;
    // Synchronous optimistic update: click → visible DOM change in the same frame.
    setTotal((t) => t + ml);
    start(async () => {
      try {
        const r = await addWaterAction(ml, date, key);
        if (!r.ok) {
          setTotal((t) => Math.max(0, t - ml));
          setErr(r.fields?.amountMl ?? r.error);
          return;
        }
        setRows((xs) => (xs.some((x) => x.id === r.log.id) ? xs : [...xs, r.log]));
        setOpen(null);
        setOther("");
        setErr("");
        toast.show(`Đã thêm ${fmtInt(ml)} ml`);
        router.refresh();
      } catch (e) {
        // Lost connection: roll back the optimistic number, keep the input, offer a retry with the same key.
        setTotal((t) => Math.max(0, t - ml));
        setSaveError(friendlyError(e));
        retryRef.current = () => add(ml, key);
      }
    });
  };

  const remove = (w: WaterDto) => {
    setSaveError("");
    retryRef.current = null;
    setRows((xs) => xs.filter((x) => x.id !== w.id));
    setTotal((t) => Math.max(0, t - w.amountMl));
    start(async () => {
      try {
        const r = await deleteWaterAction(w.id);
        if (!r.ok) {
          setRows((xs) => (xs.some((x) => x.id === w.id) ? xs : [...xs, w]));
          setTotal((t) => t + w.amountMl);
          setSaveError(r.error);
          return;
        }
        toast.show("Đã xóa", { actionLabel: "Hoàn tác", onAction: () => void restoreWaterAction(r.removed).then(() => router.refresh()) });
        router.refresh();
      } catch (e) {
        setRows((xs) => (xs.some((x) => x.id === w.id) ? xs : [...xs, w]));
        setTotal((t) => t + w.amountMl);
        setSaveError(friendlyError(e));
        retryRef.current = () => remove(w);
      }
    });
  };

  const edit = (w: WaterDto) => {
    const v = parseDecimal(window.prompt("Lượng nước (ml)", String(w.amountMl)) ?? "");
    if (!Number.isInteger(v) || v < 1 || v > 2000) return;
    setSaveError("");
    retryRef.current = null;
    start(async () => {
      try {
        const r = await updateWaterAction(w.id, v);
        if (!r.ok) return setSaveError(r.error);
        router.refresh();
      } catch (e) {
        setSaveError(friendlyError(e));
        retryRef.current = () => edit({ ...w, amountMl: v });
      }
    });
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Droplet className="size-5 text-water" aria-hidden /> Nước uống</h2>
        {reached && <Badge tone="ok">✓ Đạt mục tiêu</Badge>}
      </div>
      <p className="text-sm"><strong className="text-xl" data-testid="water-total">{fmtInt(total)}</strong> / {fmtInt(targetMl)} ml</p>
      <WaterBar totalMl={total} targetMl={targetMl} />
      <div className="flex flex-wrap gap-2">
        {WATER_QUICK_ADD_ML.map((ml) => (
          <Button key={ml} size="sm" variant="secondary" disabled={pending} onClick={() => add(ml)} aria-label={`Thêm ${ml} ml`}>+{ml}</Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setOpen("other")}>Khác</Button>
        {rows.length > 0 && <Button size="sm" variant="ghost" onClick={() => setOpen("list")}>Lịch sử ({rows.length})</Button>}
      </div>
      {saveError && <RetryNotice message={saveError} onRetry={() => retryRef.current?.()} busy={pending} />}

      <Sheet open={open === "other"} onOpenChange={(o) => setOpen(o ? "other" : null)} title="Thêm lượng nước khác">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); const n = parseDecimal(other); if (!Number.isInteger(n) || n < 1 || n > 2000) { setErr("Nhập số nguyên từ 1 đến 2.000 ml"); return; } add(n); }}>
          <Input label="Lượng nước" unit="ml" inputMode="numeric" value={other} onChange={(e) => { setOther(e.target.value); setErr(""); setSaveError(""); retryRef.current = null; }} error={err} />
          {saveError && <RetryNotice message={saveError} onRetry={() => retryRef.current?.()} busy={pending} />}
          <Button type="submit" loading={pending}>Thêm</Button>
        </form>
      </Sheet>

      <Sheet open={open === "list"} onOpenChange={(o) => setOpen(o ? "list" : null)} title="Nước đã uống hôm nay">
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm text-muted">{new Date(w.loggedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
              <span className="font-semibold">{fmtInt(w.amountMl)} ml</span>
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => edit(w)} aria-label={`Sửa ${w.amountMl} ml`}>Sửa</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(w)} aria-label={`Xóa ${w.amountMl} ml`}>Xóa</Button>
              </span>
            </li>
          ))}
        </ul>
      </Sheet>
    </Card>
  );
}
