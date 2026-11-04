// Integration tests for data services (need Postgres + seed). Run with DATABASE_URL set.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, todayIn } from "@/lib/dates";
import { db } from "@/server/db";
import { register } from "@/server/auth/service";
import { getDashboard } from "@/server/dashboard/service";
import { createCustomFood, deleteCustomFood } from "@/server/foods/custom";
import { searchFoods } from "@/server/foods/search";
import { addLog, addQuickLog, copyMeal, deleteLog, frequentFoods, listDay, recentFoods, restoreLog, setFavorite, updateLog } from "@/server/food-log/service";
import { saveProfile } from "@/server/profile/service";
import { createRecipe, deleteRecipe, duplicateRecipe, getRecipe, updateRecipe } from "@/server/recipes/service";
import { getPeriodReport } from "@/server/reports/service";
import { addWater, deleteWater, waterTotal } from "@/server/water/service";
import { getWeightChart, saveWeight } from "@/server/weight/service";
import { listReminders, saveReminder } from "@/server/reminders/service";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const TZ = "Asia/Ho_Chi_Minh";
const today = todayIn(TZ);
const yesterday = addDays(today, -1);

run("data services (db)", () => {
  let a = "";
  let b = "";
  let pho = "";
  let phoServing = "";
  beforeAll(async () => {
    const ts = Date.now();
    const ra = await register({ email: `it-data-a-${ts}@example.test`, password: "matkhau123", timezone: TZ });
    const rb = await register({ email: `it-data-b-${ts}@example.test`, password: "matkhau123", timezone: TZ });
    if (!ra.ok || !rb.ok) throw new Error("register failed");
    a = ra.userId;
    b = rb.userId;
    await saveProfile(a, TZ, { displayName: "A", sex: "female", birthDate: "1998-01-01", heightCm: 162, weightKg: 62, activityLevel: "sedentary", goal: "lose" });
    const hits = await searchFoods(a, "pho bo");
    pho = hits[0]!.id;
    phoServing = hits[0]!.servings[0]!.id;
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { startsWith: "it-data-" } } });
    await db.$disconnect();
  });

  it("search is accent-insensitive, typo-tolerant, fast, and finds Vietnamese foods", async () => {
    const t0 = performance.now();
    const hits = await searchFoods(a, "pho bo");
    const ms = performance.now() - t0;
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.name.toLowerCase()).toContain("phở");
    expect((await searchFoods(a, "Phở Bò")).map((h) => h.id)).toEqual(hits.map((h) => h.id));
    expect((await searchFoods(a, "com tam")).length).toBeGreaterThan(0);
    expect((await searchFoods(a, "bun chaa")).length).toBeGreaterThan(0); // trigram tolerance
    expect(await searchFoods(a, "%")).toEqual([]);
    expect(ms).toBeLessThan(300);
  });

  it("custom foods are private and soft-deleted", async () => {
    const r = await createCustomFood(a, { name: "Bánh mì Đặc Biệt Của Tôi", energyKcal: 250, proteinG: 8, carbG: 40, fatG: 5, servings: [{ label: "ổ", grams: 120, isDefault: true }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((await searchFoods(a, "dac biet cua toi")).some((h) => h.id === r.food.id)).toBe(true);
    expect((await searchFoods(b, "dac biet cua toi")).some((h) => h.id === r.food.id)).toBe(false);
    expect((await createCustomFood(a, { name: "Sai", energyKcal: 900, proteinG: 1, carbG: 1, fatG: 1 })).ok && true).toBe(true); // soft warning only
    expect((await deleteCustomFood(b, r.food.id)).ok).toBe(false);
    expect((await deleteCustomFood(a, r.food.id)).ok).toBe(true);
    expect((await searchFoods(a, "dac biet cua toi")).some((h) => h.id === r.food.id)).toBe(false);
  });

  it("logs with snapshot, edits, deletes + restores, and isolates users", async () => {
    const r = await addLog(a, TZ, { date: today, meal: "lunch", kind: "food", itemId: pho, servingId: phoServing, quantity: 1.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const grams = r.log.grams;
    expect(r.log.kcal).toBeGreaterThan(0);
    const food = await db.food.findUniqueOrThrow({ where: { id: pho } });
    expect(r.log.kcal).toBeCloseTo((food.energyKcal * grams) / 100, 1);
    // Changing the source food does not change history (PRD §8.4)
    await db.food.update({ where: { id: pho }, data: { energyKcal: food.energyKcal + 100 } });
    expect((await listDay(a, today))[0]!.kcal).toBe(r.log.kcal);
    await db.food.update({ where: { id: pho }, data: { energyKcal: food.energyKcal } });

    const u = await updateLog(a, TZ, r.log.id, { quantity: 1 });
    expect(u.ok && u.log.kcal).toBeCloseTo(r.log.kcal / 1.5, 1);
    expect((await updateLog(b, TZ, r.log.id, { quantity: 2 })).ok).toBe(false);
    expect((await deleteLog(b, r.log.id)).ok).toBe(false);
    expect(await listDay(b, today)).toEqual([]);

    const del = await deleteLog(a, r.log.id);
    expect(del.ok).toBe(true);
    expect(await listDay(a, today)).toEqual([]);
    if (del.ok) expect((await restoreLog(a, del.removed)).ok).toBe(true);
    expect((await listDay(a, today)).length).toBe(1);

    expect((await addLog(a, TZ, { date: addDays(today, 5), meal: "lunch", kind: "food", itemId: pho, quantity: 100 })).ok).toBe(false);
    expect((await addLog(a, TZ, { date: today, meal: "lunch", kind: "food", itemId: pho, quantity: 0 })).ok).toBe(false);
    expect((await addLog(b, TZ, { date: today, meal: "lunch", kind: "food", itemId: "nope", quantity: 100 })).ok).toBe(false);
  });

  it("copies a meal (append), recents and frequent", async () => {
    await addLog(a, TZ, { date: yesterday, meal: "breakfast", kind: "food", itemId: pho, servingId: phoServing, quantity: 1 });
    await addLog(a, TZ, { date: yesterday, meal: "breakfast", kind: "food", itemId: pho, servingId: phoServing, quantity: 1 });
    await addLog(a, TZ, { date: yesterday, meal: "breakfast", kind: "food", itemId: pho, servingId: phoServing, quantity: 1 });
    const c = await copyMeal(a, TZ, { fromDate: yesterday, fromMeal: "breakfast", toDate: today, toMeal: "breakfast" });
    expect(c.ok && c.created.length).toBe(3);
    expect((await copyMeal(a, TZ, { fromDate: addDays(today, -9), fromMeal: "dinner", toDate: today })).ok).toBe(false);
    expect((await recentFoods(a)).length).toBe(1);
    expect((await frequentFoods(a, "breakfast"))[0]?.id).toBe(pho);
    expect((await recentFoods(b)).length).toBe(0);
    expect((await setFavorite(a, pho, true)).ok).toBe(true);
    expect((await searchFoods(a, "pho bo"))[0]!.isFavorite).toBe(true);
    expect((await addQuickLog(a, TZ, { date: today, meal: "snack", kcal: 120 })).ok).toBe(true);
  });

  it("recipes: per-serving, 1.5 portions, snapshot survives edits/deletes", async () => {
    const rice = (await searchFoods(a, "com trang"))[0]!;
    const egg = (await searchFoods(a, "trung ga"))[0]!;
    const input = { name: "Cơm trứng meal prep", servings: 4, ingredients: [{ foodId: rice.id, quantity: 400 }, { foodId: egg.id, quantity: 200 }] };
    const r = await createRecipe(a, input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const total = r.recipe.total.kcal;
    expect(r.recipe.perServing.kcal).toBeCloseTo(total / 4, 5);
    expect((await createRecipe(a, { ...input, ingredients: [] })).ok).toBe(false);
    expect((await createRecipe(a, { ...input, servings: 0 })).ok).toBe(false);
    expect((await createRecipe(b, { ...input })).ok).toBe(true); // foods are shared system foods

    const log = await addLog(a, TZ, { date: today, meal: "dinner", kind: "recipe", itemId: r.recipe.id, quantity: 1.5 });
    expect(log.ok && log.log.kcal).toBeCloseTo(1.5 * (total / 4), 1);
    const before = log.ok ? log.log.kcal : 0;
    const up = await updateRecipe(a, r.recipe.id, { ...input, servings: 2 });
    expect(up.ok && up.recipe.perServing.kcal).toBeCloseTo(total / 2, 5);
    expect((await listDay(a, today)).find((l) => l.recipeId === r.recipe.id)!.kcal).toBe(before);
    expect((await updateRecipe(b, r.recipe.id, input)).ok).toBe(false);
    const dup = await duplicateRecipe(a, r.recipe.id);
    expect(dup.ok && dup.recipe.name).toBe("Cơm trứng meal prep (bản sao)");
    expect((await searchFoods(a, "com trung meal")).some((h) => h.kind === "recipe")).toBe(true);
    expect((await searchFoods(b, "com trung meal")).some((h) => h.id === r.recipe.id)).toBe(false);
    expect((await deleteRecipe(a, r.recipe.id)).ok).toBe(true);
    expect(await getRecipe(a, r.recipe.id)).toBeNull();
    expect((await listDay(a, today)).some((l) => l.recipeId === r.recipe.id || l.name === "Cơm trứng meal prep")).toBe(true);
  });

  it("water and weight rules", async () => {
    const w = await addWater(a, TZ, { amountMl: 250 });
    expect(w.ok && w.totalMl).toBe(250);
    expect((await addWater(a, TZ, { amountMl: 2001 })).ok).toBe(false);
    expect((await deleteWater(b, w.ok ? w.log.id : "x")).ok).toBe(false);
    expect(await waterTotal(b, today)).toBe(0);
    expect((await deleteWater(a, w.ok ? w.log.id : "x")).ok).toBe(true);

    expect((await saveWeight(a, TZ, { date: today, weightKg: 19 })).ok).toBe(false);
    expect((await saveWeight(a, TZ, { date: addDays(today, 1), weightKg: 62 })).ok).toBe(false);
    expect((await saveWeight(a, TZ, { date: today, weightKg: 62.4 })).ok).toBe(true);
    const dup = await saveWeight(a, TZ, { date: today, weightKg: 62 });
    expect(!dup.ok && dup.needsConfirm).toBe(true);
    expect((await saveWeight(a, TZ, { date: today, weightKg: 62 }, { overwrite: true })).ok).toBe(true);
    expect((await getWeightChart(a, TZ, 30)).isEmpty).toBe(true);
    await saveWeight(a, TZ, { date: addDays(today, -10), weightKg: 63 });
    const chart = await getWeightChart(a, TZ, 30);
    expect(chart.isEmpty).toBe(false);
    expect(chart.change.sinceFirstKg).toBeCloseTo(-1, 5);
  });

  it("reminders validate", async () => {
    expect((await saveReminder(a, { type: "water", startTime: "09:00", endTime: "08:00", intervalHours: 2, daysOfWeek: [1] })).ok).toBe(false);
    expect((await saveReminder(a, { type: "water", startTime: "08:00", endTime: "20:00", intervalHours: 2, daysOfWeek: [] })).ok).toBe(false);
    expect((await saveReminder(a, { type: "water", startTime: "08:00", endTime: "20:00", intervalHours: 2, daysOfWeek: [1, 2, 3] })).ok).toBe(true);
    expect((await saveReminder(a, { type: "meal", meal: "lunch", times: ["12:00"], daysOfWeek: [1, 2] })).ok).toBe(true);
    expect((await listReminders(a)).length).toBe(2);
    expect((await listReminders(b)).length).toBe(0);
  });

  it("dashboard and weekly report exclude empty days", async () => {
    const d = await getDashboard(a, today);
    expect(d).not.toBeNull();
    expect(d!.remainingKcal).toBeCloseTo(d!.targets.kcal - d!.eaten.kcal, 5);
    expect(d!.meals).toHaveLength(4);
    expect(d!.streak).toBeGreaterThanOrEqual(2);
    expect(await getDashboard(b, today)).toBeNull(); // no profile → no targets
    const rep = await getPeriodReport(a, "week", today);
    expect(rep.days).toHaveLength(7);
    expect(rep.summary.daysWithData).toBeLessThan(7);
    expect(rep.summary.daysWithData).toBeGreaterThanOrEqual(1);
    const month = await getPeriodReport(a, "month", today);
    expect(month.weekly.length).toBeGreaterThan(0);
    const other = await getPeriodReport(b, "week", today);
    expect(other.summary.daysWithData).toBe(0);
  });
});
