import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { register } from "@/server/auth/service";
import { acceptRetarget, dismissRetarget, getRetargetSuggestion, recalculateTargets, saveProfile, setCustomTargets, targetsForDate } from "./service";
import { addDays, todayIn } from "@/lib/dates";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const TZ = "Asia/Ho_Chi_Minh";
const input = {
  displayName: "Linh",
  sex: "female",
  birthDate: "1998-01-01",
  heightCm: 162,
  weightKg: 62,
  activityLevel: "sedentary",
  goal: "lose",
};

run("profile service (db)", () => {
  let a = "";
  let b = "";
  beforeAll(async () => {
    const ra = await register({ email: `it-prof-a-${Date.now()}@example.test`, password: "matkhau123", timezone: TZ });
    const rb = await register({ email: `it-prof-b-${Date.now()}@example.test`, password: "matkhau123", timezone: TZ });
    if (!ra.ok || !rb.ok) throw new Error("register failed");
    a = ra.userId;
    b = rb.userId;
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { startsWith: "it-prof-" } } });
    await db.$disconnect();
  });

  it("validates ranges with Vietnamese messages", async () => {
    const r = await saveProfile(a, TZ, { ...input, heightCm: 50, weightKg: 500 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fields?.heightCm).toContain("Chiều cao");
      expect(r.fields?.weightKg).toContain("Cân nặng");
    }
  });

  it("saves profile, computes targets, writes TargetHistory", async () => {
    const r = await saveProfile(a, TZ, input);
    expect(r.ok).toBe(true);
    const p = await db.profile.findUniqueOrThrow({ where: { userId: a } });
    expect(p.calorieTarget).toBe(1320);
    expect(p.waterTargetMl).toBe(2150);
    expect(await targetsForDate(a, todayIn(TZ))).toMatchObject({ kcal: 1320, waterMl: 2150 });
    expect(await targetsForDate(a, addDays(todayIn(TZ), -30))).toMatchObject({ kcal: 1320 }); // before first row → earliest
  });

  it("isolates users", async () => {
    expect(await db.profile.findUnique({ where: { userId: b } })).toBeNull();
    expect(await targetsForDate(b, todayIn(TZ))).toBeNull();
  });

  it("blocks <800 kcal and requires confirm below the floor", async () => {
    const base = { proteinG: 80, carbG: 100, fatG: 40, waterMl: 2000 };
    expect((await setCustomTargets(a, TZ, { ...base, kcal: 700 })).ok).toBe(false);
    const need = await setCustomTargets(a, TZ, { ...base, kcal: 1100 });
    expect(need).toMatchObject({ ok: true, needsConfirm: true });
    expect((await db.profile.findUniqueOrThrow({ where: { userId: a } })).calorieTarget).toBe(1320);
    expect((await setCustomTargets(a, TZ, { ...base, kcal: 1100, confirmedBelowFloor: true })).ok).toBe(true);
    const p = await db.profile.findUniqueOrThrow({ where: { userId: a } });
    expect(p).toMatchObject({ calorieTarget: 1100, targetsMode: "custom" });
  });

  it("keeps custom targets when saving a changed profile, then recalculates from the new profile", async () => {
    const original = await db.profile.findUniqueOrThrow({ where: { userId: a } });
    const previousDate = addDays(todayIn(TZ), -1);
    await db.targetHistory.create({ data: { userId: a, effectiveFrom: new Date(`${previousDate}T00:00:00Z`), kcal: 1900, proteinG: 90, carbG: 250, fatG: 60, waterMl: 2000 } });
    const changed = { ...input, heightCm: 180, birthDate: "1990-01-01", sex: "male", activityLevel: "active", goal: "gain" };
    expect((await saveProfile(a, TZ, changed)).ok).toBe(true);
    const kept = await db.profile.findUniqueOrThrow({ where: { userId: a } });
    expect(kept).toMatchObject({ heightCm: 180, targetsMode: "custom", calorieTarget: original.calorieTarget, proteinG: original.proteinG, carbG: original.carbG, fatG: original.fatG, waterTargetMl: original.waterTargetMl });
    const result = await recalculateTargets(a, TZ);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    const recalculated = await db.profile.findUniqueOrThrow({ where: { userId: a } });
    expect(recalculated).toMatchObject({ targetsMode: "auto", heightCm: 180, calorieTarget: result.targets.calories.kcal, ...result.targets.macros });
    expect(recalculated.calorieTarget).not.toBe(original.calorieTarget);
    expect(await targetsForDate(a, previousDate)).toMatchObject({ kcal: 1900, proteinG: 90, carbG: 250, fatG: 60 });
  });

  it("persists mismatched custom macros without blocking the save", async () => {
    const custom = { kcal: 2000, proteinG: 100, carbG: 50, fatG: 100, waterMl: 2100 };
    expect(await setCustomTargets(a, TZ, custom)).toEqual({ ok: true });
    expect(await targetsForDate(a, todayIn(TZ))).toMatchObject(custom);
  });

  it("recalculate returns to auto; retarget suggestion after ≥1 kg drift; dismiss; accept", async () => {
    await recalculateTargets(a, TZ);
    expect(await getRetargetSuggestion(a, TZ)).toBeNull();
    const today = todayIn(TZ);
    await db.weightLog.create({ data: { userId: a, logDate: new Date(`${today}T00:00:00Z`), weightKg: 60.5 } });
    const s = await getRetargetSuggestion(a, TZ);
    expect(s?.newWeightKg).toBe(60.5);
    await dismissRetarget(a, TZ);
    expect(await getRetargetSuggestion(a, TZ)).toBeNull();
    await db.weightLog.update({ where: { userId_logDate: { userId: a, logDate: new Date(`${today}T00:00:00Z`) } }, data: { weightKg: 59.4 } });
    expect(await getRetargetSuggestion(a, TZ)).not.toBeNull();
    expect((await acceptRetarget(a, TZ)).ok).toBe(true);
    const p = await db.profile.findUniqueOrThrow({ where: { userId: a } });
    expect(p.weightKg).toBe(59.4);
    expect(p.targetsWeightKg).toBe(59.4);
  });
});
