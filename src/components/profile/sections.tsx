"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  changePasswordAction, deleteAccountAction, recalculateTargetsAction, saveProfileAction, saveReminderAction,
  setCustomTargetsAction, setHideWeightAction, setThemeAction,
} from "@/app/(app)/actions";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Badge, Card, Disclaimer } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { fmtInt, parseDecimal } from "@/lib/format";
import type { ThemePref } from "@/lib/theme";
import type { ReminderDto } from "@/server/reminders/service";

const ACTIVITY = [
  { value: "sedentary", label: "Ít vận động" }, { value: "light", label: "Vận động nhẹ (1–3 buổi/tuần)" }, { value: "moderate", label: "Vận động vừa (3–5 buổi/tuần)" },
  { value: "active", label: "Vận động nhiều (6–7 buổi/tuần)" }, { value: "very_active", label: "Rất nhiều" },
];
const GOALS = [{ value: "lose", label: "Giảm cân" }, { value: "maintain", label: "Giữ cân" }, { value: "gain", label: "Tăng cân / tăng cơ" }];
const SEXES = [{ value: "female", label: "Nữ" }, { value: "male", label: "Nam" }, { value: "other", label: "Khác / không muốn nói" }];

export interface ProfileData {
  displayName: string; sex: string; birthDate: string; heightCm: number; weightKg: number; activityLevel: string; goal: string;
  goalRateKgPerWeek: number | null; targetWeightKg: number | null; calorieTarget: number; proteinG: number; carbG: number; fatG: number;
  waterTargetMl: number; targetsMode: "auto" | "custom"; hideWeight: boolean;
}

const dec = (n: number) => String(n).replace(".", ",");

export function ProfileForm({ p }: { p: ProfileData }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ name: p.displayName, sex: p.sex, birth: p.birthDate, height: dec(p.heightCm), weight: dec(p.weightKg), activity: p.activityLevel, goal: p.goal, target: p.targetWeightKg ? dec(p.targetWeightKg) : "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const save = () =>
    start(async () => {
      const t = parseDecimal(v.target);
      const r = await saveProfileAction({ displayName: v.name, sex: v.sex, birthDate: v.birth, heightCm: parseDecimal(v.height), weightKg: parseDecimal(v.weight), activityLevel: v.activity, goal: v.goal, goalRateKgPerWeek: p.goalRateKgPerWeek ?? undefined, targetWeightKg: t > 0 ? t : undefined });
      if (!r.ok) return setErrs(r.fields ?? { displayName: r.error });
      setErrs({});
      toast.show(p.targetsMode === "custom" ? "Đã lưu hồ sơ (mục tiêu tùy chỉnh được giữ nguyên)" : "Đã lưu hồ sơ và tính lại mục tiêu");
      router.refresh();
    });
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Thông tin cá nhân</h2>
      <form className="grid gap-3 sm:grid-cols-2" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Input label="Tên hiển thị" value={v.name} onChange={set("name")} error={errs.displayName} />
        <Select label="Giới tính" value={v.sex} onChange={set("sex")} options={SEXES} />
        <Input label="Ngày sinh" type="date" value={v.birth} onChange={set("birth")} error={errs.birthDate} />
        <Input label="Chiều cao" unit="cm" inputMode="decimal" value={v.height} onChange={set("height")} error={errs.heightCm} />
        <Input label="Cân nặng" unit="kg" inputMode="decimal" value={v.weight} onChange={set("weight")} error={errs.weightKg} />
        <Input label="Cân nặng mục tiêu (tùy chọn)" unit="kg" inputMode="decimal" value={v.target} onChange={set("target")} />
        <Select label="Mức vận động" value={v.activity} onChange={set("activity")} options={ACTIVITY} />
        <Select label="Mục tiêu" value={v.goal} onChange={set("goal")} options={GOALS} />
        <Button type="submit" loading={pending} className="sm:col-span-2">Lưu thay đổi</Button>
      </form>
    </Card>
  );
}

export function TargetsCard({ p }: { p: ProfileData }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ kcal: String(p.calorieTarget), p: String(p.proteinG), c: String(p.carbG), f: String(p.fatG), w: String(p.waterTargetMl) });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => { setV({ ...v, [k]: e.target.value }); setConfirm(false); };

  const save = (confirmed = false) =>
    start(async () => {
      const r = await setCustomTargetsAction({ kcal: parseDecimal(v.kcal), proteinG: parseDecimal(v.p), carbG: parseDecimal(v.c), fatG: parseDecimal(v.f), waterMl: parseDecimal(v.w), confirmedBelowFloor: confirmed });
      if (!r.ok) return setErrs(r.fields ?? { kcal: r.error });
      if ("needsConfirm" in r && r.needsConfirm) return setConfirm(true);
      setOpen(false); setConfirm(false); setErrs({});
      toast.show("Đã lưu mục tiêu tùy chỉnh");
      router.refresh();
    });

  return (
    <Card>
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Mục tiêu hằng ngày</h2><Badge>{p.targetsMode === "auto" ? "Tự động" : "Tùy chỉnh"}</Badge></div>
      <p className="mt-2 text-3xl font-bold">{fmtInt(p.calorieTarget)} <span className="text-base font-semibold">kcal</span></p>
      <p className="text-sm"><span className="text-protein-text">■ Đạm {p.proteinG} g</span> · <span className="text-carb-text">● Tinh bột {p.carbG} g</span> · <span className="text-fat-text">◆ Béo {p.fatG} g</span> · Nước {fmtInt(p.waterTargetMl)} ml</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Chỉnh tay</Button>
        <Button variant="ghost" size="sm" loading={pending} onClick={() => start(async () => { await recalculateTargetsAction(); toast.show("Đã tính lại mục tiêu theo công thức Mifflin-St Jeor"); router.refresh(); })}>Tính lại tự động</Button>
      </div>
      <div className="mt-2"><Disclaimer /></div>
      <Sheet open={open} onOpenChange={setOpen} title="Chỉnh mục tiêu" description="Mục tiêu mới áp dụng từ hôm nay; các ngày trước giữ nguyên.">
        <form className="grid gap-3 sm:grid-cols-2" noValidate onSubmit={(e) => { e.preventDefault(); save(confirm); }}>
          <Input label="Kcal" unit="kcal" inputMode="numeric" value={v.kcal} onChange={set("kcal")} error={errs.kcal} />
          <Input label="Nước" unit="ml" inputMode="numeric" value={v.w} onChange={set("w")} error={errs.waterMl} />
          <Input label="Đạm" unit="g" inputMode="numeric" value={v.p} onChange={set("p")} error={errs.proteinG} />
          <Input label="Tinh bột" unit="g" inputMode="numeric" value={v.c} onChange={set("c")} error={errs.carbG} />
          <Input label="Béo" unit="g" inputMode="numeric" value={v.f} onChange={set("f")} error={errs.fatG} />
          {(() => { const k = parseDecimal(v.p) * 4 + parseDecimal(v.c) * 4 + parseDecimal(v.f) * 9; const t = parseDecimal(v.kcal); return k > 0 && t > 0 && Math.abs(k - t) / t > 0.1 ? <Badge tone="warn" className="self-center">Macro cộng lại ≈ {fmtInt(k)} kcal, lệch &gt;10% so với mục tiêu.</Badge> : null; })()}
          {confirm && <p role="alert" className="rounded-md bg-warning-soft p-3 text-sm font-semibold text-warning sm:col-span-2">⚠ Mức này thấp hơn mức tối thiểu khuyến nghị. Bấm “Xác nhận lưu” nếu bạn chắc chắn (nên hỏi chuyên gia).</p>}
          <Button type="submit" loading={pending} className="sm:col-span-2">{confirm ? "Xác nhận lưu" : "Lưu mục tiêu"}</Button>
        </form>
      </Sheet>
    </Card>
  );
}

const DAYS = [{ n: 1, l: "T2" }, { n: 2, l: "T3" }, { n: 3, l: "T4" }, { n: 4, l: "T5" }, { n: 5, l: "T6" }, { n: 6, l: "T7" }, { n: 7, l: "CN" }];
const MEALS = [{ m: "breakfast", l: "Bữa sáng", t: "07:30" }, { m: "lunch", l: "Bữa trưa", t: "12:00" }, { m: "dinner", l: "Bữa tối", t: "19:00" }] as const;

export function RemindersCard({ reminders }: { reminders: ReminderDto[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const w = reminders.find((r) => r.type === "water");
  const [water, setWater] = useState({ enabled: w?.enabled ?? false, start: w?.startTime ?? "08:00", end: w?.endTime ?? "20:00", every: String(w?.intervalHours ?? 2), days: w?.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 7] });
  const [meals, setMeals] = useState(() => Object.fromEntries(MEALS.map(({ m, t }) => { const r = reminders.find((x) => x.type === "meal" && x.meal === m); return [m, { enabled: r?.enabled ?? false, time: r?.times[0] ?? t, days: r?.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 7] }]; })));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [perm, setPerm] = useState<"unsupported" | NotificationPermission>(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [explain, setExplain] = useState(false);

  const toggleDay = (days: number[], n: number) => (days.includes(n) ? days.filter((d) => d !== n) : [...days, n]);

  const save = () =>
    start(async () => {
      const e: Record<string, string> = {};
      const rw = await saveReminderAction({ type: "water", enabled: water.enabled, startTime: water.start, endTime: water.end, intervalHours: Number(water.every), daysOfWeek: water.days });
      if (!rw.ok) Object.assign(e, { water: rw.fields?.endTime ?? rw.fields?.daysOfWeek ?? rw.fields?.startTime ?? rw.error });
      for (const { m } of MEALS) {
        const x = meals[m]!;
        const r = await saveReminderAction({ type: "meal", meal: m, enabled: x.enabled, times: [x.time], daysOfWeek: x.days });
        if (!r.ok) e[m] = r.fields?.daysOfWeek ?? r.fields?.times ?? r.error;
      }
      setErrs(e);
      if (Object.keys(e).length === 0) { toast.show("Đã lưu nhắc nhở"); router.refresh(); }
    });

  const Days = ({ days, onChange, label }: { days: number[]; onChange: (d: number[]) => void; label: string }) => (
    <div role="group" aria-label={`Ngày trong tuần — ${label}`} className="flex flex-wrap gap-1.5">
      {DAYS.map((d) => <button key={d.n} type="button" aria-pressed={days.includes(d.n)} onClick={() => onChange(toggleDay(days, d.n))} className={cn("min-h-11 min-w-11 rounded-full border text-sm font-semibold", days.includes(d.n) ? "border-primary bg-primary-soft text-primary-soft-text" : "border-border-strong")}>{d.l}</button>)}
    </div>
  );
  const Switch = ({ on, onChange, label }: { on: boolean; onChange: (b: boolean) => void; label: string }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("relative h-7 w-12 shrink-0 rounded-full", on ? "bg-primary" : "bg-border-strong")}>
      <span className={cn("absolute top-[3px] size-[22px] rounded-full bg-primary-contrast transition-all motion-reduce:transition-none", on ? "right-[3px]" : "left-[3px] bg-surface")} />
    </button>
  );

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Nhắc nhở</h2>
      <p className="text-sm text-muted">Nhắc nhở hiện trong ứng dụng khi bạn đang mở NutriTrack. Không nhắc từ 22:00 đến 06:00.</p>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between"><h3 className="font-semibold">💧 Nhắc uống nước</h3><Switch on={water.enabled} onChange={(b) => setWater({ ...water, enabled: b })} label="Bật nhắc uống nước" /></div>
        {water.enabled && (<>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Từ" type="time" value={water.start} onChange={(e) => setWater({ ...water, start: e.target.value })} />
            <Input label="Đến" type="time" value={water.end} onChange={(e) => setWater({ ...water, end: e.target.value })} error={errs.water} />
            <Select label="Mỗi" value={water.every} onChange={(e) => setWater({ ...water, every: e.target.value })} options={[{ value: "1", label: "1 giờ" }, { value: "2", label: "2 giờ" }, { value: "3", label: "3 giờ" }]} />
          </div>
          <Days days={water.days} onChange={(d) => setWater({ ...water, days: d })} label="uống nước" />
        </>)}
      </section>
      {MEALS.map(({ m, l }) => (
        <section key={m} className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex items-center justify-between"><h3 className="font-semibold">🍽️ Nhắc ghi {l.toLowerCase()}</h3><Switch on={meals[m]!.enabled} onChange={(b) => setMeals({ ...meals, [m]: { ...meals[m]!, enabled: b } })} label={`Bật nhắc ghi ${l.toLowerCase()}`} /></div>
          {meals[m]!.enabled && (<>
            <Input label="Giờ nhắc" type="time" value={meals[m]!.time} onChange={(e) => setMeals({ ...meals, [m]: { ...meals[m]!, time: e.target.value } })} error={errs[m]} />
            <Days days={meals[m]!.days} onChange={(d) => setMeals({ ...meals, [m]: { ...meals[m]!, days: d } })} label={l.toLowerCase()} />
          </>)}
        </section>
      ))}
      {perm !== "unsupported" && (
        <section className="border-t border-border pt-3">
          <h3 className="font-semibold">Thông báo trình duyệt</h3>
          {perm === "granted" && <p className="text-sm text-success">✓ Đã bật. Bạn sẽ nhận thông báo khi tab chạy ở nền.</p>}
          {perm === "denied" && <p className="text-sm text-warning">Trình duyệt đang chặn thông báo. Hãy mở cài đặt trang web (biểu tượng ổ khóa cạnh địa chỉ) và cho phép Thông báo. Nhắc nhở trong ứng dụng vẫn hoạt động.</p>}
          {perm === "default" && <Button variant="secondary" size="sm" onClick={() => setExplain(true)}>Bật thông báo trình duyệt</Button>}
        </section>
      )}
      <Button loading={pending} onClick={save}>Lưu nhắc nhở</Button>
      <Sheet open={explain} onOpenChange={setExplain} title="Bật thông báo trình duyệt?" description="Chúng tôi chỉ dùng thông báo để nhắc bạn uống nước và ghi bữa ăn khi NutriTrack đang mở ở nền. Trình duyệt sẽ hỏi quyền ở bước tiếp theo.">
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setExplain(false)}>Để sau</Button>
          <Button className="flex-1" onClick={async () => { setExplain(false); setPerm(await Notification.requestPermission()); }}>Tiếp tục</Button>
        </div>
      </Sheet>
    </Card>
  );
}

export function AppearanceCard({ theme, hideWeight }: { theme: ThemePref; hideWeight: boolean }) {
  const [t, setT] = useState(theme);
  const [h, setH] = useState(hideWeight);
  const [, start] = useTransition();
  const apply = (p: ThemePref) => {
    setT(p);
    if (p === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", p);
    start(() => setThemeAction(p));
  };
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Giao diện</h2>
      <div role="radiogroup" aria-label="Chế độ màu" className="flex rounded-md bg-surface-2 p-1">
        {([["system", "Theo hệ thống"], ["light", "Sáng"], ["dark", "Tối"]] as const).map(([v, l]) => (
          <button key={v} role="radio" aria-checked={t === v} onClick={() => apply(v)} className={cn("min-h-11 flex-1 rounded-sm text-sm font-semibold", t === v ? "bg-surface shadow-[var(--shadow-1)]" : "text-muted")}>{l}</button>
        ))}
      </div>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- label wraps the checkbox and its visible text */}
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span><span className="block font-semibold">Ẩn số cân nặng</span><span className="text-sm text-muted">Ẩn khỏi Hôm nay, Cân nặng và Báo cáo.</span></span>
        <input type="checkbox" className="size-6" checked={h} onChange={(e) => { setH(e.target.checked); start(() => setHideWeightAction(e.target.checked)); }} />
      </label>
    </Card>
  );
}

export function AccountCard() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<"pw" | "del" | null>(null);
  const [pw, setPw] = useState({ cur: "", next: "" });
  const [del, setDel] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Dữ liệu & quyền riêng tư</h2>
      <Button asChild variant="secondary"><a href="/api/export" download>Tải xuống dữ liệu của tôi (JSON)</a></Button>
      <Button variant="secondary" onClick={() => setOpen("pw")}>Đổi mật khẩu</Button>
      <form action={logoutAction}><Button type="submit" variant="secondary" block>Đăng xuất</Button></form>
      <Button variant="danger" onClick={() => setOpen("del")}>Xóa tài khoản</Button>

      <Sheet open={open === "pw"} onOpenChange={(o) => !o && setOpen(null)} title="Đổi mật khẩu" description="Các thiết bị khác sẽ bị đăng xuất.">
        <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await changePasswordAction({ currentPassword: pw.cur, newPassword: pw.next }); if (!r.ok) return setErrs(r.fields ?? { currentPassword: r.error }); setErrs({}); setPw({ cur: "", next: "" }); setOpen(null); toast.show("Đã đổi mật khẩu"); }); }}>
          <Input label="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} error={errs.currentPassword} />
          <Input label="Mật khẩu mới" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={errs.newPassword} hint="Tối thiểu 8 ký tự, gồm chữ và số" />
          <Button type="submit" loading={pending}>Đổi mật khẩu</Button>
        </form>
      </Sheet>
      <Sheet open={open === "del"} onOpenChange={(o) => !o && setOpen(null)} title="Xóa tài khoản?" description="Toàn bộ dữ liệu (nhật ký, cân nặng, công thức…) sẽ bị xóa vĩnh viễn và không thể khôi phục.">
        <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await deleteAccountAction(del); if (r && !r.ok) setErrs(r.fields ?? { password: r.error }); }); }}>
          <Input label="Nhập mật khẩu để xác nhận" type="password" autoComplete="current-password" value={del} onChange={(e) => setDel(e.target.value)} error={errs.password} />
          <div className="flex gap-3"><Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(null)}>Hủy</Button><Button type="submit" variant="danger" className="flex-1" loading={pending}>Xóa vĩnh viễn</Button></div>
        </form>
      </Sheet>
    </Card>
  );
}
