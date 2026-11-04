"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveWeightAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { fmtKg, parseDecimal } from "@/lib/format";

export function WeightForm({ today }: { today: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(today);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const submit = (overwrite = false) => {
    const w = parseDecimal(kg);
    if (!(w >= 20 && w <= 300)) return setErrs({ weightKg: "Cân nặng từ 20 đến 300 kg" });
    setErrs({});
    start(async () => {
      const r = await saveWeightAction({ date, weightKg: w }, overwrite);
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
    });
  };

  return (
    <form className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Input label="Cân nặng" unit="kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} error={errs.weightKg} placeholder="62,4" />
      <Input label="Ngày" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} error={errs.date} />
      <Button type="submit" loading={pending} className="sm:mt-[26px]">Lưu</Button>
    </form>
  );
}
