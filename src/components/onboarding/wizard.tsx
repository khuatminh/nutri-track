"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveProfileAction, saveReminderAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Card, Disclaimer } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { fmtInt, parseDecimal } from "@/lib/format";
import { DEFAULT_RATE, GOAL_RATES, computeTargets, type ActivityLevel, type Goal, type Sex } from "@/lib/nutrition";
import { todayIn } from "@/lib/dates";

const GOALS: Array<{ value: Goal; title: string; hint: string }> = [
  { value: "lose", title: "Giảm cân", hint: "Thâm hụt calo nhẹ, bền vững" },
  { value: "maintain", title: "Giữ cân", hint: "Ăn đủ để giữ cân nặng hiện tại" },
  { value: "gain", title: "Tăng cân / tăng cơ", hint: "Dư calo nhẹ kèm đủ đạm" },
];
const ACTIVITY: Array<{ value: ActivityLevel; label: string }> = [
  { value: "sedentary", label: "Ít vận động — ngồi nhiều, ít/không tập" },
  { value: "light", label: "Vận động nhẹ — tập 1–3 buổi/tuần" },
  { value: "moderate", label: "Vận động vừa — tập 3–5 buổi/tuần" },
  { value: "active", label: "Vận động nhiều — tập nặng 6–7 buổi/tuần" },
  { value: "very_active", label: "Rất nhiều — lao động nặng/tập 2 lần mỗi ngày" },
];
const STEPS = ["Mục tiêu", "Thông tin cơ thể", "Kết quả", "Nhắc nhở"];

export function OnboardingWizard({ timezone, initialName }: { timezone: string; initialName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>("lose");
  const [rate, setRate] = useState<number>(DEFAULT_RATE.lose);
  const [f, setF] = useState({ name: initialName, sex: "female" as Sex, birth: "", height: "", weight: "", activity: "sedentary" as ActivityLevel });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [remind, setRemind] = useState(true);
  const [serverError, setServerError] = useState("");

  const h = parseDecimal(f.height);
  const w = parseDecimal(f.weight);

  const validateBody = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Vui lòng nhập tên hiển thị";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.birth)) e.birth = "Vui lòng nhập ngày sinh";
    if (!(h >= 100 && h <= 250)) e.height = "Chiều cao từ 100 đến 250 cm";
    if (!(w >= 20 && w <= 300)) e.weight = "Cân nặng từ 20 đến 300 kg";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const result = useMemo(() => {
    if (step < 2 || Object.keys(errors).length || !(h > 0) || !(w > 0) || !f.birth) return null;
    try {
      return computeTargets({ sex: f.sex, birthDate: f.birth, today: todayIn(timezone), heightCm: h, weightKg: w, activityLevel: f.activity, goal, rateKgPerWeek: goal === "maintain" ? undefined : rate });
    } catch {
      return null;
    }
  }, [step, errors, h, w, f, goal, rate, timezone]);

  const finish = () =>
    start(async () => {
      setServerError("");
      const r = await saveProfileAction({ displayName: f.name, sex: f.sex, birthDate: f.birth, heightCm: h, weightKg: w, activityLevel: f.activity, goal, goalRateKgPerWeek: goal === "maintain" ? undefined : rate });
      if (!r.ok) {
        setServerError(r.error);
        setErrors(r.fields ?? {});
        setStep(1);
        return;
      }
      if (remind) {
        const all = [1, 2, 3, 4, 5, 6, 7];
        await saveReminderAction({ type: "water", startTime: "08:00", endTime: "20:00", intervalHours: 2, daysOfWeek: all });
        await saveReminderAction({ type: "meal", meal: "breakfast", times: ["07:30"], daysOfWeek: all });
        await saveReminderAction({ type: "meal", meal: "lunch", times: ["12:00"], daysOfWeek: all });
        await saveReminderAction({ type: "meal", meal: "dinner", times: ["19:00"], daysOfWeek: all });
      }
      router.replace("/hom-nay");
    });

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 p-4 md:p-8">
      <header>
        <p className="font-bold text-primary-soft-text">🥗 NutriTrack</p>
        <ol className="mt-3 flex gap-1.5" aria-label="Các bước">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-track")}>
              <span className="sr-only">{`Bước ${i + 1}: ${s}`}</span>
            </li>
          ))}
        </ol>
        <h1 className="mt-4 text-[1.75rem] font-bold">{["Mục tiêu của bạn là gì?", "Về cơ thể bạn", "Mục tiêu hằng ngày của bạn", "Nhắc nhở"][step]}</h1>
        <p className="text-sm text-muted">Bước {step + 1}/4 · Mất khoảng 3 phút</p>
      </header>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Mục tiêu</legend>
            {GOALS.map((g) => (
              // eslint-disable-next-line jsx-a11y/label-has-associated-control -- label wraps the radio and its visible text
              <label key={g.value} className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-2 p-4", goal === g.value ? "border-primary bg-primary-soft" : "border-border bg-surface")}>
                <input type="radio" name="goal" className="size-5" checked={goal === g.value} onChange={() => { setGoal(g.value); setRate(DEFAULT_RATE[g.value]); }} />
                <span><span className="block font-semibold">{g.title}</span><span className="text-sm text-muted">{g.hint}</span></span>
              </label>
            ))}
          </fieldset>
          {goal !== "maintain" && (
            <Select label="Tốc độ mong muốn" value={String(rate)} onChange={(e) => setRate(Number(e.target.value))} options={GOAL_RATES[goal].map((r) => ({ value: String(r), label: `${String(r).replace(".", ",")} kg/tuần` }))} hint="Tốc độ vừa phải giúp bạn duy trì lâu dài." />
          )}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          {serverError && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm font-semibold text-danger md:col-span-2">⚠ {serverError}</p>}
          <Input label="Tên hiển thị" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name ?? errors.displayName} autoComplete="given-name" />
          <Select label="Giới tính" value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value as Sex })} options={[{ value: "female", label: "Nữ" }, { value: "male", label: "Nam" }, { value: "other", label: "Khác / không muốn nói" }]} hint={f.sex === "other" ? "Chúng tôi dùng giá trị trung bình của nam và nữ — đây chỉ là ước tính." : undefined} />
          <Input label="Ngày sinh" type="date" value={f.birth} onChange={(e) => setF({ ...f, birth: e.target.value })} error={errors.birth ?? errors.birthDate} autoComplete="bday" max={todayIn(timezone)} />
          <Input label="Chiều cao" inputMode="decimal" unit="cm" value={f.height} onChange={(e) => setF({ ...f, height: e.target.value })} error={errors.height ?? errors.heightCm} />
          <Input label="Cân nặng hiện tại" inputMode="decimal" unit="kg" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} error={errors.weight ?? errors.weightKg} />
          <div className="md:col-span-2">
            <Select label="Mức độ vận động" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value as ActivityLevel })} options={ACTIVITY} />
          </div>
        </div>
      )}

      {step === 2 && result && (
        <div className="flex flex-col gap-4">
          {result.age < 18 && <Badge tone="warn">Bạn dưới 18 tuổi — nên hỏi người lớn/bác sĩ trước khi giảm cân.</Badge>}
          {result.advice === "suggest_maintain_high_bmi" && <Badge tone="warn">BMI của bạn khá cao — nên cân nhắc mục tiêu &quot;Giữ cân&quot;.</Badge>}
          {result.advice === "suggest_maintain_low_bmi" && <Badge tone="warn">BMI của bạn khá thấp — nên cân nhắc mục tiêu &quot;Giữ cân&quot;.</Badge>}
          <Card className="text-center">
            <p className="text-sm text-muted">Mục tiêu mỗi ngày</p>
            <p className="text-[2.5rem] font-bold leading-none">{fmtInt(result.calories.kcal)} <span className="text-lg font-semibold">kcal</span></p>
            <p className="mt-1 text-sm text-muted">BMR {fmtInt(result.bmr)} kcal · TDEE {fmtInt(result.tdee)} kcal</p>
          </Card>
          {result.calories.flooredToMin && <Badge tone="warn">Đã nâng lên mức tối thiểu an toàn.</Badge>}
          {result.calories.rateReduced && !result.calories.flooredToMin && <Badge tone="warn">Đã hạ tốc độ xuống mức an toàn (thâm hụt tối đa 25% TDEE).</Badge>}
          <div className="grid grid-cols-3 gap-3 text-center">
            <Card><p className="text-xs font-semibold text-protein-text">■ Đạm</p><p className="text-xl font-bold">{result.macros.proteinG} g</p></Card>
            <Card><p className="text-xs font-semibold text-carb-text">● Tinh bột</p><p className="text-xl font-bold">{result.macros.carbG} g</p></Card>
            <Card><p className="text-xs font-semibold text-fat-text">◆ Béo</p><p className="text-xl font-bold">{result.macros.fatG} g</p></Card>
          </div>
          <p className="text-sm">Mục tiêu nước: <strong>{fmtInt(result.waterMl)} ml</strong>/ngày. Bạn có thể chỉnh lại trong Hồ sơ.</p>
          <Disclaimer />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- label wraps the checkbox and its visible text */}
          <label className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-surface p-4">
            <input type="checkbox" className="size-5" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
            <span><span className="block font-semibold">Bật nhắc nhở gợi ý</span><span className="text-sm text-muted">Uống nước mỗi 2 giờ (08:00–20:00) và ghi bữa lúc 07:30, 12:00, 19:00. Chỉnh được trong Hồ sơ.</span></span>
          </label>
          {serverError && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm font-semibold text-danger">⚠ {serverError}</p>}
        </div>
      )}

      <div className="flex gap-3">
        {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={pending}>Quay lại</Button>}
        {step < 3 ? (
          <Button className="flex-1" onClick={() => { if (step === 1 && !validateBody()) return; setStep(step + 1); }}>Tiếp tục</Button>
        ) : (
          <Button className="flex-1" loading={pending} onClick={finish}>{pending ? "Đang lưu…" : "Hoàn tất"}</Button>
        )}
      </div>
    </div>
  );
}
