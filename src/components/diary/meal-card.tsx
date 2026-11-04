"use client";
import { Copy, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { copyMealAction, deleteLogAction, restoreLogAction, undoLogsAction, updateLogAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { addDays } from "@/lib/dates";
import { fmtDec1, fmtInt, parseDecimal } from "@/lib/format";
import { MEAL_EMOJI, MEAL_LABEL } from "@/lib/meals";
import type { Meal } from "@prisma/client";
import type { LogDto } from "@/server/food-log/service";

export function MealCard({ meal, date, items, yesterdayCount }: { meal: Meal; date: string; items: LogDto[]; yesterdayCount: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<LogDto | null>(null);
  const [qty, setQty] = useState("");
  const [err, setErr] = useState("");
  const kcal = items.reduce((s, i) => s + i.kcal, 0);

  const remove = (l: LogDto) =>
    start(async () => {
      const r = await deleteLogAction(l.id);
      if (!r.ok) return toast.show(r.error, { tone: "error" });
      toast.show(`Đã xóa ${l.name}`, { actionLabel: "Hoàn tác", onAction: () => void restoreLogAction(r.removed).then(() => router.refresh()) });
      router.refresh();
    });

  const copy = () =>
    start(async () => {
      const r = await copyMealAction({ fromDate: addDays(date, -1), fromMeal: meal, toDate: date, toMeal: meal });
      if (!r.ok) return toast.show(r.error, { tone: "error" });
      const ids = r.created.map((c) => c.id);
      toast.show(`Đã sao chép ${ids.length} món`, { actionLabel: "Hoàn tác", onAction: () => void undoLogsAction(ids).then(() => router.refresh()) });
      router.refresh();
    });

  const saveQty = () => {
    const q = parseDecimal(qty);
    if (!(q > 0) || q > 5000) return setErr("Nhập số lượng lớn hơn 0");
    start(async () => {
      const r = await updateLogAction(edit!.id, { quantity: q });
      if (!r.ok) return setErr(r.fields?.quantity ?? r.error);
      setEdit(null);
      setErr("");
      router.refresh();
    });
  };

  return (
    <Card id={meal} className="scroll-mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><span aria-hidden>{MEAL_EMOJI[meal]}</span> {MEAL_LABEL[meal]}</h2>
        <span className="font-semibold">{fmtInt(kcal)} kcal</span>
      </div>
      {items.length === 0 ? (
        <p className="py-3 text-sm text-muted">Bữa này chưa có món nào.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((l) => (
            <li key={l.id} className="flex min-h-14 items-center gap-2 py-2">
              <button className="min-h-11 min-w-0 flex-1 text-left" onClick={() => { setEdit(l); setQty(String(l.quantity).replace(".", ",")); setErr(""); }} aria-label={`Sửa ${l.name}`}>
                <span className="block truncate font-medium">{l.name}</span>
                <span className="text-sm text-muted">{fmtDec1(l.quantity)} {l.servingLabel ?? ""}{l.grams > 0 && l.servingLabel !== "g" ? ` · ${fmtInt(l.grams)} g` : ""}{l.missingMicro ? " · thiếu dữ liệu natri/xơ/đường" : ""}</span>
              </button>
              <span className="text-sm font-semibold">{fmtInt(l.kcal)}</span>
              <button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" onClick={() => remove(l)} aria-label={`Xóa ${l.name}`} disabled={pending}><Trash2 className="size-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary"><Link href={`/nhat-ky/them?date=${date}&meal=${meal}`}><Plus className="size-4" aria-hidden /> Thêm món</Link></Button>
        <Button size="sm" variant="ghost" onClick={copy} disabled={pending || yesterdayCount === 0} title={yesterdayCount === 0 ? "Hôm qua chưa có bữa này" : undefined}>
          <Copy className="size-4" aria-hidden /> {yesterdayCount === 0 ? "Hôm qua chưa có bữa này" : "Sao chép từ hôm qua"}
        </Button>
      </div>
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit?.name ?? ""} description="Đổi số lượng — dinh dưỡng được tính lại.">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); saveQty(); }}>
          <Input label={`Số lượng (${edit?.servingLabel ?? "phần"})`} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} error={err} />
          <Button type="submit" loading={pending}>Lưu</Button>
        </form>
      </Sheet>
    </Card>
  );
}
