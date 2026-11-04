"use client";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteWeightAction, updateWeightAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { fmtKg, parseDecimal } from "@/lib/format";
import type { WeightDto } from "@/server/weight/service";

const showDate = (d: string) => d.split("-").reverse().join("/");

/** US-16.4: the full weight history with edit/delete on each record. */
export function WeightList({ items, today }: { items: WeightDto[]; today: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<WeightDto | null>(null);
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});

  const openEdit = (w: WeightDto) => {
    setEdit(w);
    setKg(String(w.weightKg).replace(".", ","));
    setDate(w.date);
    setNote(w.note ?? "");
    setErrs({});
  };

  const save = () => {
    if (!edit) return;
    const w = parseDecimal(kg);
    if (!(w >= 20 && w <= 300)) return setErrs({ weightKg: "Cân nặng từ 20 đến 300 kg" });
    start(async () => {
      const r = await updateWeightAction(edit.id, { date, weightKg: w, note: note.trim() || undefined });
      if (!r.ok) {
        if (r.needsConfirm) return setErrs({ date: "Ngày này đã có bản ghi cân nặng khác. Chọn ngày khác hoặc sửa bản ghi đó." });
        return setErrs(r.fields ?? { weightKg: r.error });
      }
      setEdit(null);
      toast.show("Đã cập nhật cân nặng");
      router.refresh();
    });
  };

  const remove = (w: WeightDto) => {
    if (!window.confirm(`Xóa bản ghi ${fmtKg(w.weightKg)} ngày ${showDate(w.date)}?`)) return;
    start(async () => {
      const r = await deleteWeightAction(w.id);
      if (!r.ok) return toast.show(r.error, { tone: "error" });
      toast.show("Đã xóa bản ghi cân nặng");
      router.refresh();
    });
  };

  if (items.length === 0) return <EmptyState icon="⚖️" title="Chưa có bản ghi cân nặng" hint="Ghi cân nặng ở trên để bắt đầu theo dõi." />;

  return (
    <>
      <ul className="divide-y divide-border">
        {items.map((w) => (
          <li key={w.id} className="flex min-h-14 items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{showDate(w.date)}</p>
              <p className="truncate text-sm text-muted">{fmtKg(w.weightKg)}{w.note ? ` · ${w.note}` : ""}</p>
            </div>
            <button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" onClick={() => openEdit(w)} disabled={pending}>
              <span className="sr-only">Sửa cân nặng ngày {showDate(w.date)}</span>
              <Pencil className="size-4" aria-hidden />
            </button>
            <button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" onClick={() => remove(w)} disabled={pending}>
              <span className="sr-only">Xóa cân nặng ngày {showDate(w.date)}</span>
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title="Sửa cân nặng" description="Đổi ngày, cân nặng hoặc ghi chú của bản ghi.">
        {edit && (
          <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Input label="Cân nặng" unit="kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} error={errs.weightKg} />
            <Input label="Ngày" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} error={errs.date} />
            <Input label="Ghi chú (tùy chọn)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="submit" loading={pending}>Lưu</Button>
          </form>
        )}
      </Sheet>
    </>
  );
}
