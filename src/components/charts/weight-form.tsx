"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveWeightAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { RetryNotice } from "@/components/ui/retry";
import { useToast } from "@/components/ui/toast";
import { fmtKg, parseDecimal } from "@/lib/format";
import { friendlyError } from "@/lib/network";

export function WeightForm({ today }: { today: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(today);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const retryRef = useRef<(() => void) | null>(null);

  const submit = (overwrite = false, retried = false) => {
    const w = parseDecimal(kg);
    if (!(w >= 20 && w <= 300)) return setErrs({ weightKg: "Cân nặng từ 20 đến 300 kg" });
    setErrs({});
    setSaveError("");
    retryRef.current = null;
    start(async () => {
      try {
        // A retry always overwrites: the first attempt may have written the row before its response was lost.
        const r = await saveWeightAction({ date, weightKg: w }, overwrite || retried);
        if (!r.ok) {
          if (r.needsConfirm) {
            if (window.confirm("Ngày này đã có cân nặng. Cập nhật thành " + fmtKg(w) + "?")) submit(true);
            return;
          }
          return setErrs(r.fields ?? { weightKg: r.error });
        }
        setKg("");
        toast.show(r.replaced ? "Đã cập nhật cân nặng" : "Đã ghi cân nặng");
        router.refresh();
      } catch (e) {
        // Keep the entered weight and date; a retry is idempotent because weight is unique per day.
        setSaveError(friendlyError(e));
        retryRef.current = () => submit(overwrite, true);
      }
    });
  };

  return (
    <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input label="Cân nặng" unit="kg" inputMode="decimal" value={kg} onChange={(e) => { setKg(e.target.value); setSaveError(""); retryRef.current = null; }} error={errs.weightKg} placeholder="62,4" />
        <Input label="Ngày" type="date" value={date} max={today} onChange={(e) => { setDate(e.target.value); setSaveError(""); retryRef.current = null; }} error={errs.date} />
        <Button type="submit" loading={pending} className="sm:mt-[26px]">Lưu</Button>
      </div>
      {saveError && <RetryNotice message={saveError} onRetry={() => retryRef.current?.()} busy={pending} />}
    </form>
  );
}
