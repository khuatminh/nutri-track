"use client";
import { Copy, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { copyMealAction, deleteLogAction, restoreLogAction, undoLogsAction, updateLogAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/misc";
import { RetryNotice } from "@/components/ui/retry";
import { useToast } from "@/components/ui/toast";
import { addDays } from "@/lib/dates";
import { fmtDec1, fmtInt, parseDecimal } from "@/lib/format";
import { friendlyError } from "@/lib/network";
import { MEAL_EMOJI, MEAL_LABEL, MEAL_ORDER } from "@/lib/meals";
import type { Meal } from "@prisma/client";
import type { LogDto } from "@/server/food-log/service";
import type { ServingDto } from "@/server/foods/search";

const GRAMS_KEY = "__grams__";

/** Match the serving the log was recorded with, so the edit dialog opens on the same unit. */
function servingKeyOf(log: LogDto, servings: ServingDto[]): string {
  const perUnit = log.quantity > 0 ? log.grams / log.quantity : 0;
  const match = servings.find((s) => s.label === log.servingLabel && Math.abs(s.grams - perUnit) <= 0.5);
  return match?.id ?? GRAMS_KEY;
}

export function MealCard({
  meal,
  date,
  items,
  yesterdayCount,
  servingsByFood,
}: {
  meal: Meal;
  date: string;
  items: LogDto[];
  yesterdayCount: number;
  servingsByFood: Record<string, ServingDto[]>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<LogDto | null>(null);
  const [qty, setQty] = useState("");
  const [editMeal, setEditMeal] = useState<Meal>(meal);
  const [servingKey, setServingKey] = useState(GRAMS_KEY);
  const [originalServingKey, setOriginalServingKey] = useState(GRAMS_KEY);
  const [err, setErr] = useState("");
  const [saveError, setSaveError] = useState("");
  const [actionError, setActionError] = useState("");
  const retryRef = useRef<(() => void) | null>(null);
  // Optimistic removal (NFR-05): hide the row as soon as the user taps delete, roll back on failure.
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const visible = items.filter((i) => !removedIds.includes(i.id));
  const kcal = visible.reduce((s, i) => s + i.kcal, 0);

  const servings = edit?.foodId ? (servingsByFood[edit.foodId] ?? []) : [];
  const isQuick = edit?.grams === 0;

  const openEdit = (l: LogDto) => {
    setEdit(l);
    setQty(String(l.quantity).replace(".", ","));
    setEditMeal(l.meal);
    setErr("");
    setSaveError("");
    const key = servingKeyOf(l, l.foodId ? (servingsByFood[l.foodId] ?? []) : []);
    setServingKey(key);
    setOriginalServingKey(key);
  };

  const remove = (l: LogDto) => {
    setActionError("");
    retryRef.current = null;
    setRemovedIds((ids) => (ids.includes(l.id) ? ids : [...ids, l.id]));
    start(async () => {
      try {
        const r = await deleteLogAction(l.id);
        if (!r.ok) {
          setRemovedIds((ids) => ids.filter((x) => x !== l.id));
          setActionError(r.error);
          return;
        }
        toast.show(`Đã xóa ${l.name}`, { actionLabel: "Hoàn tác", onAction: () => void restoreLogAction(r.removed).then(() => router.refresh()) });
        router.refresh();
      } catch (e) {
        setRemovedIds((ids) => ids.filter((x) => x !== l.id));
        setActionError(friendlyError(e));
        retryRef.current = () => remove(l);
      }
    });
  };

  const copy = () => {
    setActionError("");
    retryRef.current = null;
    start(async () => {
      try {
        const r = await copyMealAction({ fromDate: addDays(date, -1), fromMeal: meal, toDate: date, toMeal: meal });
        if (!r.ok) return setActionError(r.error);
        const ids = r.created.map((c) => c.id);
        toast.show(`Đã sao chép ${ids.length} món`, { actionLabel: "Hoàn tác", onAction: () => void undoLogsAction(ids).then(() => router.refresh()) });
        router.refresh();
      } catch (e) {
        setActionError(friendlyError(e));
        retryRef.current = copy;
      }
    });
  };

  const save = () => {
    if (!edit) return;
    const q = parseDecimal(qty);
    if (!isQuick && (!(q > 0) || q > 5000)) return setErr("Nhập số lượng lớn hơn 0");
    setErr("");
    setSaveError("");
    start(async () => {
      try {
        const input: { quantity?: number; meal?: Meal; servingId?: string | null } = { meal: editMeal };
        if (!isQuick) {
          input.quantity = q;
          // Only send the unit when it changed: an unchanged unit keeps the stored snapshot.
          if (servingKey !== originalServingKey) input.servingId = servingKey === GRAMS_KEY ? null : servingKey;
        }
        const r = await updateLogAction(edit!.id, input);
        if (!r.ok) return setErr(r.fields?.quantity ?? r.error);
        setEdit(null);
        setErr("");
        toast.show("Đã cập nhật mục nhật ký");
        router.refresh();
      } catch (e) {
        // Keep the sheet and the edited values so the user can retry once online.
        setSaveError(friendlyError(e));
      }
    });
  };

  return (
    <Card id={meal} className="scroll-mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><span aria-hidden>{MEAL_EMOJI[meal]}</span> {MEAL_LABEL[meal]}</h2>
        <span className="font-semibold">{fmtInt(kcal)} kcal</span>
      </div>
      {visible.length === 0 ? (
        <p className="py-3 text-sm text-muted">Bữa này chưa có món nào.</p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((l) => (
            <li key={l.id} className="flex min-h-14 items-center gap-2 py-2">
              <button className="min-h-11 min-w-0 flex-1 text-left" onClick={() => openEdit(l)}>
                <span className="sr-only">Sửa </span>
                <span className="block truncate font-medium">{l.name}</span>
                <span className="text-sm text-muted">{fmtDec1(l.quantity)} {l.servingLabel ?? ""}{l.grams > 0 && l.servingLabel !== "g" ? ` · ${fmtInt(l.grams)} g` : ""}{l.missingMicro ? " · thiếu dữ liệu natri/xơ/đường" : ""}</span>
              </button>
              <span className="text-sm font-semibold">{fmtInt(l.kcal)}</span>
              <button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" onClick={() => remove(l)} aria-label={`Xóa ${l.name}`} disabled={pending}><Trash2 className="size-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      {actionError && <RetryNotice className="mt-2" message={actionError} onRetry={() => retryRef.current?.()} busy={pending} />}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary"><Link href={`/nhat-ky/them?date=${date}&meal=${meal}`}><Plus className="size-4" aria-hidden /> Thêm món</Link></Button>
        <Button size="sm" variant="ghost" onClick={copy} disabled={pending || yesterdayCount === 0} title={yesterdayCount === 0 ? "Hôm qua chưa có bữa này" : undefined}>
          <Copy className="size-4" aria-hidden /> {yesterdayCount === 0 ? "Hôm qua chưa có bữa này" : "Sao chép từ hôm qua"}
        </Button>
      </div>
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit?.name ?? ""} description={isQuick ? "Đổi bữa cho mục ghi nhanh." : "Đổi số lượng, đơn vị và bữa — dinh dưỡng được tính lại."}>
        {edit && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            {!isQuick && (
              <div className="grid grid-cols-2 gap-3">
                <Input label={`Số lượng (${edit.servingLabel ?? "phần"})`} inputMode="decimal" value={qty} onChange={(e) => { setQty(e.target.value); setErr(""); setSaveError(""); }} error={err} />
                {servings.length > 0 ? (
                  <Select
                    label="Đơn vị"
                    value={servingKey}
                    onChange={(e) => setServingKey(e.target.value)}
                    options={[...servings.map((s) => ({ value: s.id, label: `${s.label} (${fmtInt(s.grams)} g)` })), { value: GRAMS_KEY, label: "gam (g)" }]}
                  />
                ) : (
                  <p className="self-end pb-3 text-sm text-muted">Đơn vị: {edit.servingLabel ?? "phần"}</p>
                )}
              </div>
            )}
            <Select label="Bữa" value={editMeal} onChange={(e) => setEditMeal(e.target.value as Meal)} options={MEAL_ORDER.map((m) => ({ value: m, label: MEAL_LABEL[m] }))} />
            {saveError && <RetryNotice message={saveError} onRetry={save} busy={pending} />}
            <Button type="submit" loading={pending}>Lưu</Button>
          </form>
        )}
      </Sheet>
    </Card>
  );
}
