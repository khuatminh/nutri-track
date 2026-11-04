import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { addDays, todayIn } from "@/lib/dates";
import { addLog, deleteLog, deleteMeal, listDay, restoreMeal, updateLog, type LogDto } from "@/server/food-log/service";
import { createCustomFood, deleteCustomFood, listMyFoods, updateCustomFood } from "@/server/foods/custom";
import { searchFoods } from "@/server/foods/search";
import { deleteWeight, getWeightChart, latestWeight, listWeights, saveWeight, updateWeight } from "@/server/weight/service";
import { getDashboard } from "@/server/dashboard/service";
import { saveProfile } from "@/server/profile/service";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const tz = "Asia/Ho_Chi_Minh";
const today = todayIn(tz);
const yesterday = addDays(today, -1);
const foodInput = { name: "Món kiểm thử QLD41", energyKcal: 200, proteinG: 10, carbG: 20, fatG: 10, fiberG: 2, sugarG: 3, sodiumMg: 50,
  servings: [{ label: "bát", grams: 150 }] };

run("QLD-41 diary CRUD (real DB)", () => {
  let a: string;
  let b: string;
  beforeAll(async () => {
    const suffix = crypto.randomUUID();
    a = (await db.user.create({ data: { email: `qld41-a-${suffix}@example.test`, passwordHash: "unused", timezone: tz } })).id;
    b = (await db.user.create({ data: { email: `qld41-b-${suffix}@example.test`, passwordHash: "unused", timezone: tz } })).id;
    await saveProfile(a, tz, { displayName: "A", sex: "female", birthDate: "1998-01-01", heightCm: 162, weightKg: 62, activityLevel: "sedentary", goal: "lose" });
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [a, b].filter(Boolean) } } });
    await db.$disconnect();
  });

  it("US-08.1 changes serving, grams, quantity, meal/date and both daily totals; isolates users", async () => {
    const f = await createCustomFood(a, foodInput);
    expect(f.ok).toBe(true);
    if (!f.ok) throw new Error("fixture");
    const r = await addLog(a, tz, { date: yesterday, meal: "lunch", kind: "food", itemId: f.food.id, quantity: 1, servingId: f.food.servings[0]!.id });
    if (!r.ok) throw new Error("fixture");
    expect(r.log).toMatchObject({ grams: 150, kcal: 300, proteinG: 15 });
    expect((await updateLog(b, tz, r.log.id, { date: today, quantity: 2 })).ok).toBe(false);
    expect((await deleteLog(b, r.log.id)).ok).toBe(false);
    expect(await listDay(b, yesterday)).toEqual([]);
    const oldDay = (await getDashboard(a, yesterday))!.eaten.kcal;
    const newDay = (await getDashboard(a, today))!.eaten.kcal;
    await updateCustomFood(a, f.food.id, { ...foodInput, energyKcal: 300 });
    const moved = await updateLog(a, tz, r.log.id, { date: today, meal: "dinner" });
    expect(moved).toMatchObject({ ok: true, log: { ...r.log, date: today, meal: "dinner" } });
    expect((await getDashboard(a, yesterday))!.eaten.kcal).toBeCloseTo(oldDay - 300);
    expect((await getDashboard(a, today))!.eaten.kcal).toBeCloseTo(newDay + 300);
    await updateCustomFood(a, f.food.id, foodInput);
    expect(await updateLog(a, tz, r.log.id, { quantity: 2 })).toMatchObject({ ok: true, log: { grams: 300, kcal: 600, servingLabel: "bát" } });
    expect(await updateLog(a, tz, r.log.id, { servingId: null, quantity: 100 })).toMatchObject({ ok: true, log: { grams: 100, kcal: 200, servingLabel: "g", fiberG: 2, sodiumMg: 50 } });
    expect(await updateLog(a, tz, r.log.id, { servingId: (await listMyFoods(a)).find((x) => x.id === f.food.id)!.servings[0]!.id, quantity: 0.5 })).toMatchObject({ ok: true, log: { grams: 75, kcal: 150, servingLabel: "bát" } });
    expect((await updateLog(a, tz, r.log.id, { servingId: "other-serving" })).ok).toBe(false);
    await deleteCustomFood(a, f.food.id);
    expect(await updateLog(a, tz, r.log.id, { quantity: 2 })).toMatchObject({ ok: true, log: { grams: 300, kcal: 600 } });
    expect((await updateLog(a, tz, r.log.id, { quantity: 5000 })).ok).toBe(false);
    expect(await updateLog(a, tz, r.log.id, { servingId: null, quantity: 100 })).toMatchObject({ ok: true, log: { grams: 100, kcal: 200 } });
    expect((await updateLog(a, tz, r.log.id, { date: addDays(today, 4) })).ok).toBe(false);
  });

  it("US-08.3 deletes only own date/meal; undo restores every snapshot and rejects invalid batches atomically", async () => {
    const f = await createCustomFood(a, foodInput);
    if (!f.ok) throw new Error("fixture");
    const date = addDays(today, -10);
    const other = await createCustomFood(b, foodInput);
    if (!other.ok) throw new Error("fixture");
    for (const [user, day, meal] of [[a, date, "lunch"], [a, date, "lunch"], [a, date, "snack"], [a, yesterday, "lunch"], [b, date, "lunch"]] as const)
      expect((await addLog(user, tz, { date: day, meal, kind: "food", itemId: user === a ? f.food.id : other.food.id, quantity: 100 })).ok).toBe(true);
    const removed = await deleteMeal(a, { date, meal: "lunch" });
    expect(removed.ok).toBe(true);
    if (!removed.ok) throw new Error("delete failed");
    expect(removed.removed).toHaveLength(2);
    expect(await listDay(a, date)).toHaveLength(1);
    expect(await listDay(b, date)).toHaveLength(1);
    expect((await listDay(a, yesterday)).some((l) => l.meal === "lunch")).toBe(true);
    const invalid = await restoreMeal(a, [removed.removed[0]!, { ...removed.removed[1]!, quantity: -1 }]);
    expect(invalid.ok).toBe(false);
    expect(await listDay(a, date)).toHaveLength(1);
    await deleteCustomFood(a, f.food.id);
    const restored = await restoreMeal(a, removed.removed);
    expect(restored.ok && restored.logs).toHaveLength(2);
    const withoutId = (log: LogDto) => { const copy = { ...log }; Reflect.deleteProperty(copy, "id"); return copy; };
    expect((await listDay(a, date)).filter((l) => l.meal === "lunch").map(withoutId)).toEqual(removed.removed.map(withoutId));
    expect(await deleteMeal(a, { date, meal: "lunch" })).toMatchObject({ ok: true });
    expect(await deleteMeal(a, { date, meal: "lunch" })).toEqual({ ok: true, removed: [] });
  });

  it("US-09.2/09.3 warns without blocking saves; custom-food edit/delete preserves history and ownership", async () => {
    const f = await createCustomFood(a, { ...foodInput, energyKcal: 900 });
    expect(f).toMatchObject({ ok: true, warnKcalMismatch: true });
    if (!f.ok) throw new Error("fixture");
    const log = await addLog(a, tz, { date: today, meal: "snack", kind: "food", itemId: f.food.id, quantity: 100 });
    if (!log.ok) throw new Error("fixture");
    expect((await updateCustomFood(b, f.food.id, foodInput)).ok).toBe(false);
    expect((await deleteCustomFood(b, f.food.id)).ok).toBe(false);
    expect((await listMyFoods(b)).some((x) => x.id === f.food.id)).toBe(false);
    expect((await addLog(b, tz, { date: today, meal: "snack", kind: "food", itemId: f.food.id, quantity: 100 })).ok).toBe(false);
    expect(await updateCustomFood(a, f.food.id, { ...foodInput, name: "Món sửa QLD41", energyKcal: 200 })).toMatchObject({ ok: true, warnKcalMismatch: false });
    expect((await listDay(a, today)).find((x) => x.id === log.log.id)).toEqual(log.log);
    expect(await updateCustomFood(a, f.food.id, { ...foodInput, energyKcal: 900 })).toMatchObject({ ok: true, warnKcalMismatch: true });
    expect((await deleteCustomFood(a, f.food.id)).ok).toBe(true);
    expect((await searchFoods(a, "QLD41")).some((x) => x.id === f.food.id)).toBe(false);
    expect((await listMyFoods(a)).some((x) => x.id === f.food.id)).toBe(false);
    expect((await listDay(a, today)).find((x) => x.id === log.log.id)).toEqual(log.log);
  });

  it("US-16.4 lists/edits/deletes owned weights, refuses collisions/future/range and refreshes chart/latest", async () => {
    const one = await saveWeight(a, tz, { date: addDays(today, -5), weightKg: 64 });
    const two = await saveWeight(a, tz, { date: today, weightKg: 62 });
    if (!one.ok || !two.ok) throw new Error("fixture");
    expect(await listWeights(b)).toEqual([]);
    expect((await updateWeight(b, tz, two.log.id, { date: today, weightKg: 80 })).ok).toBe(false);
    expect((await deleteWeight(b, two.log.id)).ok).toBe(false);
    expect(await updateWeight(a, tz, one.log.id, { date: today, weightKg: 63 })).toMatchObject({ ok: false, needsConfirm: true });
    expect(await listWeights(a)).toEqual([two.log, one.log]);
    expect((await updateWeight(a, tz, two.log.id, { date: addDays(today, 1), weightKg: 61 })).ok).toBe(false);
    expect((await updateWeight(a, tz, two.log.id, { date: today, weightKg: 19 })).ok).toBe(false);
    expect((await updateWeight(a, tz, two.log.id, { date: today, weightKg: 301 })).ok).toBe(false);
    expect(await updateWeight(a, tz, two.log.id, { date: yesterday, weightKg: 60, note: "Đã sửa" })).toMatchObject({ ok: true, log: { date: yesterday, weightKg: 60, note: "Đã sửa" } });
    expect(await latestWeight(a)).toMatchObject({ date: yesterday, weightKg: 60 });
    expect((await getWeightChart(a, tz)).change.sinceFirstKg).toBe(-4);
    expect((await getDashboard(a, today))!.weight).toMatchObject({ weightKg: 60 });
    expect((await deleteWeight(a, two.log.id)).ok).toBe(true);
    expect((await getWeightChart(a, tz)).points).toHaveLength(1);
    expect(await latestWeight(a)).toEqual(one.log);
  });
});
