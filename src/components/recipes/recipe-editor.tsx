"use client";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createRecipeAction, updateRecipeAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { fmtDec1, fmtInt, parseDecimal } from "@/lib/format";
import { recipeNutrition, type Nutrients } from "@/lib/nutrition";
import type { FoodHit } from "@/server/foods/search";
import type { RecipeDto } from "@/server/recipes/service";

interface Ing {
  key: number;
  food: FoodHit;
  qty: string;
  servingId: string;
}

function toIng(food: FoodHit, key: number, qty = "1", servingId?: string): Ing {
  const def = food.servings.find((s) => s.isDefault) ?? food.servings[0];
  return { key, food, qty, servingId: servingId ?? def?.id ?? "" };
}

const gramsOf = (i: Ing) => {
  const q = parseDecimal(i.qty);
  const s = i.food.servings.find((x) => x.id === i.servingId);
  return q > 0 ? (s ? q * s.grams : q) : 0;
};

function NutritionCard({ title, n }: { title: string; n: Nutrients }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      <p className="text-2xl font-bold">{fmtInt(n.kcal)} <span className="text-sm font-semibold">kcal</span></p>
      <p className="text-sm"><span className="text-protein-text">■ P {fmtDec1(n.proteinG)} g</span> · <span className="text-carb-text">● C {fmtDec1(n.carbG)} g</span> · <span className="text-fat-text">◆ F {fmtDec1(n.fatG)} g</span></p>
      <p className="text-xs text-muted">Xơ {fmtDec1(n.fiberG)} g · Đường {fmtDec1(n.sugarG)} g · Natri {fmtInt(n.sodiumMg)} mg</p>
    </div>
  );
}

export function RecipeEditor({ initial, ingredientFoods }: { initial?: RecipeDto; ingredientFoods?: Record<string, FoodHit> }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const seq = useRef(100);
  const [name, setName] = useState(initial?.name ?? "");
  const [servings, setServings] = useState(initial ? String(initial.servings).replace(".", ",") : "1");
  const [cooked, setCooked] = useState(initial?.cookedWeightG ? String(initial.cookedWeightG).replace(".", ",") : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [ings, setIngs] = useState<Ing[]>(() =>
    (initial?.ingredients ?? []).flatMap((i, idx) => {
      const food = ingredientFoods?.[i.foodId];
      if (!food) return [];
      const s = food.servings.find((x) => x.label === i.servingLabel);
      return [toIng(food, idx, String(i.quantity).replace(".", ","), s?.id ?? "")];
    }),
  );
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);

  const sv = parseDecimal(servings);
  const calc = useMemo(() => {
    if (!(sv >= 0.5) || ings.length === 0) return null;
    return recipeNutrition({
      ingredients: ings.map((i) => ({ food: { energyKcal: i.food.kcal, proteinG: i.food.proteinG, carbG: i.food.carbG, fatG: i.food.fatG, fiberG: i.food.fiberG, sugarG: i.food.sugarG, sodiumMg: i.food.sodiumMg }, grams: gramsOf(i) })),
      servings: sv,
      cookedWeightG: parseDecimal(cooked) > 0 ? parseDecimal(cooked) : null,
    });
  }, [ings, sv, cooked]);

  const save = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Vui lòng nhập tên công thức";
    if (!(sv >= 0.5 && sv <= 50)) e.servings = "Số khẩu phần từ 0,5 đến 50";
    if (ings.length === 0) e.ingredients = "Thêm ít nhất 1 nguyên liệu";
    if (ings.some((i) => !(parseDecimal(i.qty) > 0))) e.ingredients = "Mỗi nguyên liệu cần số lượng lớn hơn 0";
    setErrs(e);
    if (Object.keys(e).length) return;
    const input = {
      name, servings: sv, note: note || undefined, cookedWeightG: parseDecimal(cooked) > 0 ? parseDecimal(cooked) : undefined,
      ingredients: ings.map((i) => ({ foodId: i.food.id, quantity: parseDecimal(i.qty), servingId: i.servingId || undefined })),
    };
    start(async () => {
      const r = initial ? await updateRecipeAction(initial.id, input) : await createRecipeAction(input);
      if (!r.ok) return setErrs(r.fields ?? { name: r.error });
      toast.show("Đã lưu công thức");
      router.push("/cong-thuc");
      router.refresh();
    });
  };

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
      <h1 className="text-[1.75rem] font-bold">{initial ? "Sửa công thức" : "Tạo công thức"}</h1>
      {Object.keys(errs).length > 0 && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm font-semibold text-danger">⚠ Vui lòng kiểm tra lại các trường được đánh dấu.</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Input label="Tên công thức" value={name} onChange={(e) => setName(e.target.value)} error={errs.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Số khẩu phần" inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} error={errs.servings} hint="Từ 0,5 đến 50" />
            <Input label="Khối lượng thành phẩm (tùy chọn)" unit="g" inputMode="decimal" value={cooked} onChange={(e) => setCooked(e.target.value)} hint="Dùng để quy đổi gram mỗi phần" />
          </div>
        </div>

        <Card aria-live="polite" className="order-first flex flex-col gap-3 lg:order-none lg:row-span-2">
          <h2 className="text-lg font-semibold">Dinh dưỡng</h2>
          {calc ? (
            <>
              <NutritionCard title="Mỗi khẩu phần" n={calc.perServing} />
              <hr className="border-border" />
              <NutritionCard title="Cả nồi" n={calc.total} />
              <p className="text-xs text-muted">1 phần ≈ {fmtInt(calc.gramsPerServing)} g</p>
            </>
          ) : (
            <p className="text-sm text-muted">Thêm nguyên liệu và số khẩu phần để xem dinh dưỡng.</p>
          )}
        </Card>

        <section className="flex flex-col gap-3" aria-labelledby="ing-h">
          <div className="flex items-center justify-between">
            <h2 id="ing-h" className="text-lg font-semibold">Nguyên liệu</h2>
            <Button type="button" size="sm" variant="secondary" onClick={() => setPicker(true)}><Plus className="size-4" aria-hidden /> Thêm</Button>
          </div>
          {errs.ingredients && <p role="alert" className="rounded-md border-2 border-danger p-3 text-sm font-semibold text-danger">⚠ {errs.ingredients}</p>}
          {ings.length === 0 && !errs.ingredients && <p className="rounded-md border border-dashed border-border-strong p-4 text-sm text-muted">Chưa có nguyên liệu. Công thức chỉ chứa món/nguyên liệu từ CSDL, không lồng công thức khác.</p>}
          <ul className="flex flex-col gap-2">
            {ings.map((i) => (
              <li key={i.key} className="grid grid-cols-[1fr_90px_auto] items-end gap-2 rounded-md border border-border bg-surface p-3 sm:grid-cols-[1fr_90px_160px_auto]">
                <p className="col-span-3 truncate font-medium sm:col-span-1 sm:self-center">{i.food.name}</p>
                <Input label="Số lượng" inputMode="decimal" value={i.qty} onChange={(e) => setIngs(ings.map((x) => (x.key === i.key ? { ...x, qty: e.target.value } : x)))} />
                <Select label="Đơn vị" value={i.servingId} onChange={(e) => setIngs(ings.map((x) => (x.key === i.key ? { ...x, servingId: e.target.value } : x)))} options={[...i.food.servings.map((s) => ({ value: s.id, label: `${s.label} (${fmtInt(s.grams)} g)` })), { value: "", label: "gam (g)" }]} />
                <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label={`Xóa ${i.food.name}`} onClick={() => setIngs(ings.filter((x) => x.key !== i.key))}><Trash2 className="size-4" aria-hidden /></button>
              </li>
            ))}
          </ul>
        </section>
        <Textarea label="Ghi chú (tùy chọn)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push("/cong-thuc")}>Hủy</Button>
        <Button type="submit" className="flex-1" loading={pending}>{pending ? "Đang lưu…" : "Lưu công thức"}</Button>
      </div>
      <IngredientPicker open={picker} onClose={() => setPicker(false)} onPick={(f) => { setIngs((x) => [...x, toIng(f, seq.current++)]); setPicker(false); }} />
    </form>
  );
}

function IngredientPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (f: FoodHit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  useEffect(() => {
    if (!q.trim()) { setHits([]); return; }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q.trim())}`);
        const j = (await res.json()) as { hits: FoodHit[] };
        if (live) setHits(j.hits.filter((h) => h.kind === "food"));
      } catch { /* offline: keep previous results */ }
    }, 150);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Thêm nguyên liệu">
      <Input label="Tìm nguyên liệu" value={q} onChange={(e) => setQ(e.target.value)} placeholder="gạo, trứng gà, ức gà…" />
      <ul className="max-h-[50dvh] divide-y divide-border overflow-y-auto">
        {hits.map((h) => (
          <li key={h.id}><button type="button" className="flex min-h-14 w-full items-center justify-between gap-2 px-1 text-left" onClick={() => onPick(h)}><span className="truncate">{h.name}</span><span className="text-sm text-muted">{fmtInt(h.kcal)} kcal/100 g</span></button></li>
        ))}
        {q.trim() && hits.length === 0 && <li className="p-4 text-sm text-muted">Không tìm thấy nguyên liệu.</li>}
      </ul>
    </Sheet>
  );
}
