"use client";
import { Heart, Pencil, Search, Trash2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addLogAction, addQuickLogAction, createFoodAction, deleteFoodAction, favoriteAction, undoLogsAction, updateFoodAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/misc";
import { RetryNotice } from "@/components/ui/retry";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { fmtDec1, fmtInt, parseDecimal } from "@/lib/format";
import { friendlyError, newRequestId } from "@/lib/network";
import { MEAL_LABEL, MEAL_ORDER } from "@/lib/meals";
import { previewPortion } from "@/lib/nutrition";
import type { Meal } from "@prisma/client";
import type { FoodHit } from "@/server/foods/search";

type Tab = "search" | "recent" | "frequent" | "favorites" | "recipes" | "mine";
type WithLast = FoodHit & { lastQuantity?: number; lastServingLabel?: string | null };

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "recent", label: "Gần đây" },
  { id: "search", label: "Tìm kiếm" },
  { id: "frequent", label: "Hay dùng" },
  { id: "favorites", label: "Yêu thích" },
  { id: "recipes", label: "Công thức của tôi" },
  { id: "mine", label: "Món của tôi" },
];

export interface AddFoodProps {
  date: string;
  meal: Meal;
  lists: Record<Exclude<Tab, "search">, WithLast[]>;
}

function preview(h: FoodHit, servingId: string, qty: number) {
  return previewPortion(
    { kind: h.kind, energyKcal: h.kcal, proteinG: h.proteinG, carbG: h.carbG, fatG: h.fatG, fiberG: h.fiberG, sugarG: h.sugarG, sodiumMg: h.sodiumMg, servings: h.servings },
    servingId,
    qty,
  );
}

export function AddFood({ date, meal: initialMeal, lists }: AddFoodProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>(lists.recent.length ? "recent" : "search");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<FoodHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);
  const [sel, setSel] = useState<WithLast | null>(null);
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [servingId, setServingId] = useState("");
  const [qty, setQty] = useState("1");
  const [qtyErr, setQtyErr] = useState("");
  const [added, setAdded] = useState(0);
  const [panel, setPanel] = useState<"quick" | "custom" | null>(null);
  const [customName, setCustomName] = useState("");
  const [editing, setEditing] = useState<WithLast | null>(null);
  const [offline, setOffline] = useState(false);
  const [saveError, setSaveError] = useState("");
  const reqId = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  // Reused for an offline retry so the server returns the original row instead of adding twice (NFR-09).
  const saveKey = useRef<string | null>(null);

  // US-06.1: the dish search field is ready to type as soon as the screen opens.
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Debounced search (150 ms, ADR §2.5) with stale-response guard.
  useEffect(() => {
    if (tab !== "search") return;
    const text = q.trim();
    if (!text) { setHits(null); return; }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(text)}`);
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { hits: FoodHit[] };
        if (id === reqId.current) { setHits(json.hits); setOffline(false); }
      } catch {
        if (id === reqId.current) setOffline(true);
      } finally {
        if (id === reqId.current) setSearching(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q, tab, searchNonce]);

  const list: WithLast[] = tab === "search" ? (hits ?? []) : lists[tab];

  const open = (h: WithLast) => {
    setSel(h);
    const def = h.servings.find((s) => s.isDefault) ?? h.servings[0];
    const last = h.lastServingLabel ? h.servings.find((s) => s.label === h.lastServingLabel) : undefined;
    setServingId((last ?? def)?.id ?? "");
    setQty(String(h.lastQuantity ?? 1).replace(".", ","));
    setQtyErr("");
    setSaveError("");
    saveKey.current = null;
  };

  const qn = parseDecimal(qty);
  const pv = useMemo(() => (sel && qn > 0 ? preview(sel, servingId, qn) : null), [sel, servingId, qn]);

  /** US-06.4: the empty-state CTA seeds the custom-food name with the current query. */
  const openCustom = (name = "") => {
    setCustomName(name.trim());
    setPanel("custom");
  };

  const add = (allowFuture = false) => {
    if (!sel) return;
    if (!(qn > 0)) return setQtyErr("Nhập số lượng lớn hơn 0");
    setSaveError("");
    const key = saveKey.current ?? newRequestId();
    saveKey.current = key;
    start(async () => {
      try {
        const r = await addLogAction({ date, meal, kind: sel.kind, itemId: sel.id, servingId: sel.kind === "food" && servingId ? servingId : undefined, quantity: qn, source: tab === "recent" ? "recent" : "search", clientRequestId: key }, { allowFuture });
        if (!r.ok) {
          if (r.fields?.date === "future") {
            if (window.confirm("Ngày này ở tương lai xa. Bạn vẫn muốn ghi vào ngày này?")) add(true);
            return;
          }
          saveKey.current = null;
          return setQtyErr(r.fields?.quantity ?? r.error);
        }
        saveKey.current = null;
        setSaveError("");
        setAdded((n) => n + 1);
        setSel(null);
        toast.show(`Đã thêm ${sel.name} vào ${MEAL_LABEL[meal]}`, { actionLabel: "Hoàn tác", onAction: () => void undoLogsAction([r.log.id]).then(() => { setAdded((n) => Math.max(0, n - 1)); router.refresh(); }) });
        router.refresh();
      } catch (e) {
        // Offline / lost response: keep the sheet, the chosen item and the quantity untouched.
        setSaveError(friendlyError(e));
      }
    });
  };

  const fav = (h: FoodHit) =>
    start(async () => {
      try {
        const r = await favoriteAction(h.id, !h.isFavorite);
        if (!r.ok) return toast.show(r.error, { tone: "error" });
        h.isFavorite = !h.isFavorite;
        setHits((x) => (x ? [...x] : x));
        router.refresh();
      } catch (e) {
        toast.show(friendlyError(e), { tone: "error" });
      }
    });

  /** US-09.3: deleting a custom food is soft, so past logs keep their snapshot. */
  const removeFood = (h: WithLast) => {
    if (!window.confirm(`Xóa món “${h.name}”? Các bữa đã ghi vẫn giữ nguyên.`)) return;
    start(async () => {
      const r = await deleteFoodAction(h.id);
      if (!r.ok) return toast.show(r.error, { tone: "error" });
      toast.show(`Đã xóa món “${h.name}”`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight">Thêm món</h1>
          <p className="text-sm text-muted">Vào {MEAL_LABEL[meal].toLowerCase()} · {date.split("-").reverse().join("/")}</p>
        </div>
        <Button variant={added ? "primary" : "secondary"} onClick={() => router.push(`/nhat-ky?date=${date}`)}>{added ? `Xong (${added})` : "Xong"}</Button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn bữa">
        {MEAL_ORDER.map((m) => (
          <button key={m} aria-pressed={meal === m} onClick={() => { setMeal(m); setSaveError(""); saveKey.current = null; }} className={cn("min-h-11 rounded-full border px-4 text-sm font-semibold", meal === m ? "border-primary bg-primary-soft text-primary-soft-text" : "border-border-strong bg-surface")}>{MEAL_LABEL[m]}</button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="food-q" className="sr-only">Tìm món ăn</label>
        <input ref={searchRef} id="food-q" type="search" value={q} onChange={(e) => { setQ(e.target.value); setTab("search"); }} placeholder="Tìm món: phở bò, cơm tấm…" className="min-h-12 w-full rounded-md border border-border-strong bg-surface pl-10 pr-3 text-base" autoComplete="off" />
      </div>

      <div role="tablist" aria-label="Nguồn món" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.filter((t) => t.id !== "search" || q).map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium", tab === t.id ? "border-primary bg-primary-soft text-primary-soft-text" : "border-border-strong bg-surface")}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-busy={searching} className="min-h-40">
        {offline && <p role="alert" className="mb-2 rounded-md bg-warning-soft p-3 text-sm font-semibold text-warning">⚠ Không tải được kết quả. Kiểm tra kết nối rồi thử lại.</p>}
        {tab === "search" && !q.trim() ? (
          <EmptyState icon="🔎" title="Gõ tên món để tìm" hint="Gõ không dấu cũng được: “pho bo”, “com tam”." />
        ) : list.length === 0 && !searching ? (
          <EmptyState
            icon="🤷"
            title={tab === "search" ? `Không tìm thấy “${q.trim()}”` : tab === "frequent" ? "Chưa có món hay dùng" : "Chưa có món nào ở đây"}
            hint={tab === "frequent" ? "Món ghi từ 3 lần trở lên sẽ hiện ở đây." : "Bạn có thể tự tạo món mới hoặc ghi nhanh calo."}
            action={<Button variant="secondary" onClick={() => openCustom(q)}>Tạo món mới</Button>}
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {list.map((h) => (
              <li key={`${h.kind}-${h.id}`} className="flex items-center gap-1">
                <button className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left" onClick={() => open(h)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{h.name}</span>
                    <span className="text-xs text-muted">{h.kind === "recipe" ? "Công thức · mỗi phần" : h.category ?? ""}{h.isOwn && h.kind === "food" ? " · của tôi" : ""}{h.lastQuantity ? ` · lần trước ${fmtDec1(h.lastQuantity)} ${h.lastServingLabel ?? ""}` : ""}</span>
                  </span>
                  <span className="text-right text-sm font-semibold">{fmtInt(h.kcal)}<span className="block text-xs font-normal text-muted">{h.kind === "recipe" ? "kcal/phần" : "kcal/100 g"}</span></span>
                </button>
                {h.kind === "food" && (
                  <button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" aria-pressed={h.isFavorite} aria-label={h.isFavorite ? `Bỏ yêu thích ${h.name}` : `Yêu thích ${h.name}`} onClick={() => fav(h)}>
                    <Heart className={cn("size-5", h.isFavorite && "fill-current text-fat")} aria-hidden />
                  </button>
                )}
                {tab === "mine" && h.kind === "food" && (
                  <>
                    <button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" onClick={() => setEditing(h)} disabled={pending}>
                      <span className="sr-only">Sửa {h.name}</span>
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" onClick={() => removeFood(h)} disabled={pending}>
                      <span className="sr-only">Xóa {h.name}</span>
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setPanel("quick")}><Zap className="size-4" aria-hidden /> Ghi nhanh calo</Button>
        <Button variant="ghost" size="sm" onClick={() => openCustom()}>Tạo món mới</Button>
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)} title={sel?.name ?? ""} description="Chọn khẩu phần và số lượng">
        {sel && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Số lượng" inputMode="decimal" value={qty} onChange={(e) => { setQty(e.target.value); setQtyErr(""); setSaveError(""); saveKey.current = null; }} error={qtyErr} />
              {sel.kind === "food" ? (
                <Select label="Đơn vị" value={servingId} onChange={(e) => { setServingId(e.target.value); setSaveError(""); saveKey.current = null; }} options={[...sel.servings.map((s) => ({ value: s.id, label: `${s.label} (${fmtInt(s.grams)} g)` })), { value: "", label: "gam (g)" }]} />
              ) : (
                <Select label="Đơn vị" value={sel.servings[0]?.id ?? ""} onChange={() => undefined} options={[{ value: sel.servings[0]?.id ?? "", label: `phần (${fmtInt(sel.servings[0]?.grams ?? 0)} g)` }]} />
              )}
            </div>
            {pv && (
              <div aria-live="polite" className="rounded-md bg-surface-2 p-3 text-sm">
                <p>
                  <strong className="text-lg">{fmtInt(pv.kcal)} kcal</strong> · <span className="text-protein-text">■ P {fmtDec1(pv.proteinG)} g</span> · <span className="text-carb-text">● C {fmtDec1(pv.carbG)} g</span> · <span className="text-fat-text">◆ F {fmtDec1(pv.fatG)} g</span>
                </p>
                <p className="mt-1 text-muted">
                  Chất xơ {pv.fiberG === null ? "—" : `${fmtDec1(pv.fiberG)} g`} · Đường {pv.sugarG === null ? "—" : `${fmtDec1(pv.sugarG)} g`} · Natri {pv.sodiumMg === null ? "—" : `${fmtInt(pv.sodiumMg)} mg`}
                </p>
              </div>
            )}
            {saveError && <RetryNotice message={saveError} onRetry={() => add()} busy={pending} />}
            <Button type="submit" loading={pending}>Thêm vào nhật ký</Button>
          </form>
        )}
      </Sheet>

      <QuickSheet open={panel === "quick"} onClose={() => setPanel(null)} date={date} meal={meal} onDone={() => { setAdded((n) => n + 1); router.refresh(); }} />
      <CustomFoodSheet open={panel === "custom"} initialName={customName} onClose={() => setPanel(null)} onSaved={(h) => { setPanel(null); setTab("search"); setQ(h.name); setSearchNonce((n) => n + 1); toast.show(`Đã tạo món “${h.name}”`); router.refresh(); }} />
      <CustomFoodSheet open={!!editing} food={editing} onClose={() => setEditing(null)} onSaved={(h) => { setEditing(null); toast.show(`Đã lưu món “${h.name}”`); router.refresh(); }} />
    </div>
  );
}

function QuickSheet({ open, onClose, date, meal, onDone }: { open: boolean; onClose: () => void; date: string; meal: Meal; onDone: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ name: "", kcal: "" });
  const [err, setErr] = useState("");
  const [netErr, setNetErr] = useState("");
  const keyRef = useRef<string | null>(null);

  const submit = () => {
    const k = parseDecimal(v.kcal);
    if (!(k >= 0 && k <= 5000)) return setErr("Nhập kcal từ 0 đến 5.000");
    setErr("");
    setNetErr("");
    const key = keyRef.current ?? newRequestId();
    keyRef.current = key;
    start(async () => {
      try {
        const r = await addQuickLogAction({ date, meal, name: v.name || undefined, kcal: k, clientRequestId: key });
        if (!r.ok) {
          keyRef.current = null;
          return setErr(r.fields?.kcal ?? r.error);
        }
        keyRef.current = null;
        toast.show("Đã ghi nhanh");
        setV({ name: "", kcal: "" });
        onDone();
        onClose();
      } catch (e) {
        setNetErr(friendlyError(e));
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Ghi nhanh calo" description="Không biết món? Nhập số kcal ước tính.">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Tên (tùy chọn)" value={v.name} onChange={(e) => { setV({ ...v, name: e.target.value }); keyRef.current = null; setNetErr(""); }} />
        <Input label="Năng lượng" unit="kcal" inputMode="decimal" value={v.kcal} onChange={(e) => { setV({ ...v, kcal: e.target.value }); setErr(""); setNetErr(""); keyRef.current = null; }} error={err} />
        {netErr && <RetryNotice message={netErr} onRetry={submit} busy={pending} />}
        <Button type="submit" loading={pending}>Ghi vào {MEAL_LABEL[meal].toLowerCase()}</Button>
      </form>
    </Sheet>
  );
}

type CustomFoodForm = { name: string; kcal: string; p: string; c: string; f: string; fiber: string; sugar: string; sodium: string; unit: string; grams: string };

const numInput = (n: number) => String(Number(n.toFixed(2))).replace(".", ",");

const blankCustomFood = (name = ""): CustomFoodForm => ({ name, kcal: "", p: "", c: "", f: "", fiber: "", sugar: "", sodium: "", unit: "100 g", grams: "100" });

/** Values are entered per serving while the API stores per 100 g (PRD §7). */
function customFoodForm(food: FoodHit): CustomFoodForm {
  const s = food.servings.find((x) => x.isDefault) ?? food.servings[0];
  const g = s?.grams ?? 100;
  const per = (n: number | null | undefined) => (n == null ? "" : numInput((n * g) / 100));
  return {
    name: food.name,
    kcal: numInput((food.kcal * g) / 100),
    p: numInput((food.proteinG * g) / 100),
    c: numInput((food.carbG * g) / 100),
    f: numInput((food.fatG * g) / 100),
    fiber: per(food.fiberG),
    sugar: per(food.sugarG),
    sodium: per(food.sodiumMg),
    unit: s?.label ?? "100 g",
    grams: numInput(g),
  };
}

function CustomFoodSheet({ open, initialName = "", food, onClose, onSaved }: { open: boolean; initialName?: string; food?: WithLast | null; onClose: () => void; onSaved: (h: FoodHit) => void }) {
  const [pending, start] = useTransition();
  const [v, setV] = useState<CustomFoodForm>(() => (food ? customFoodForm(food) : blankCustomFood(initialName)));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [warn, setWarn] = useState(false);

  // US-06.4 seeds the name from the query; editing loads the current food values.
  useEffect(() => {
    if (!open) return;
    setV(food ? customFoodForm(food) : blankCustomFood(initialName));
    setErrs({});
    setWarn(false);
  }, [open, food, initialName]);

  const num = (s: string) => (s.trim() === "" ? undefined : parseDecimal(s));
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  const submit = () => {
    const g = parseDecimal(v.grams);
    const e: Record<string, string> = {};
    if (!v.name.trim()) e.name = "Vui lòng nhập tên món";
    for (const [k, label] of [["kcal", "kcal"], ["p", "protein"], ["c", "carb"], ["f", "chất béo"]] as const) if (!(parseDecimal(v[k]) >= 0)) e[k] = `Nhập ${label}`;
    if (!(g > 0)) e.grams = "Nhập khối lượng khẩu phần";
    setErrs(e);
    if (Object.keys(e).length) return;
    const k = 100 / g;
    // Keep the other units of an edited food; only the default serving is edited here.
    const edited = food?.servings.find((s) => s.isDefault) ?? food?.servings[0];
    const others = (food?.servings ?? []).filter((s) => s.id !== edited?.id).map((s) => ({ label: s.label, grams: s.grams }));
    const payload = {
      name: v.name, energyKcal: parseDecimal(v.kcal) * k, proteinG: parseDecimal(v.p) * k, carbG: parseDecimal(v.c) * k, fatG: parseDecimal(v.f) * k,
      fiberG: num(v.fiber) !== undefined ? num(v.fiber)! * k : undefined, sugarG: num(v.sugar) !== undefined ? num(v.sugar)! * k : undefined, sodiumMg: num(v.sodium) !== undefined ? num(v.sodium)! * k : undefined,
      servings: [{ label: v.unit.trim() || "phần", grams: g, isDefault: true }, ...others].slice(0, 10),
    };
    start(async () => {
      try {
        const r = food ? await updateFoodAction(food.id, payload) : await createFoodAction(payload);
        if (!r.ok) return setErrs(r.fields ?? { name: r.error });
        setWarn(r.warnKcalMismatch);
        onSaved(r.food);
      } catch (e) {
        setErrs({ name: friendlyError(e) });
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title={food ? "Sửa món của tôi" : "Tạo món mới"} description={food ? "Cập nhật dinh dưỡng cho một khẩu phần; các bữa đã ghi vẫn giữ nguyên." : "Nhập dinh dưỡng cho một khẩu phần của món."}>
      <form className="grid gap-3 sm:grid-cols-2" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="sm:col-span-2"><Input label="Tên món" value={v.name} onChange={set("name")} error={errs.name} /></div>
        <Input label="Đơn vị khẩu phần" value={v.unit} onChange={set("unit")} hint="VD: tô, đĩa, ly, 100 g" />
        <Input label="Khối lượng một khẩu phần" unit="g" inputMode="decimal" value={v.grams} onChange={set("grams")} error={errs.grams} />
        <Input label="Năng lượng" unit="kcal" inputMode="decimal" value={v.kcal} onChange={set("kcal")} error={errs.kcal} />
        <Input label="Protein" unit="g" inputMode="decimal" value={v.p} onChange={set("p")} error={errs.p} />
        <Input label="Carb" unit="g" inputMode="decimal" value={v.c} onChange={set("c")} error={errs.c} />
        <Input label="Chất béo" unit="g" inputMode="decimal" value={v.f} onChange={set("f")} error={errs.f} />
        <Input label="Chất xơ (tùy chọn)" unit="g" inputMode="decimal" value={v.fiber} onChange={set("fiber")} />
        <Input label="Đường (tùy chọn)" unit="g" inputMode="decimal" value={v.sugar} onChange={set("sugar")} />
        <Input label="Natri (tùy chọn)" unit="mg" inputMode="decimal" value={v.sodium} onChange={set("sodium")} />
        {warn && <Badge tone="warn" className="sm:col-span-2">Kcal lệch hơn 20% so với 4P+4C+9F — món vẫn được lưu.</Badge>}
        <Button type="submit" loading={pending} className="sm:col-span-2">Lưu món</Button>
      </form>
    </Sheet>
  );
}
