import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { register } from "@/server/auth/service";
import { isoToDate } from "@/lib/dates";
import { UNDERAGE_WEIGHT_LOSS_MESSAGE } from "@/lib/validation/profile";
import { saveProfile, setCustomTargets } from "./service";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const TZ = "Asia/Ho_Chi_Minh";
const input = {
  displayName: "Underage test",
  sex: "female",
  birthDate: "2009-11-05",
  heightCm: 162,
  weightKg: 62,
  activityLevel: "sedentary",
  goal: "lose",
};
const blocked = {
  ok: false,
  code: "UNDERAGE_WEIGHT_LOSS_BLOCKED",
  weightLossBlocked: true,
  suggestedGoal: "maintain",
  error: UNDERAGE_WEIGHT_LOSS_MESSAGE,
  message: UNDERAGE_WEIGHT_LOSS_MESSAGE,
  fields: { goal: UNDERAGE_WEIGHT_LOSS_MESSAGE },
};

run("US-05.8 profile persistence (real DB)", () => {
  let userId = "";
  beforeAll(async () => {
    const result = await register({ email: `it-underage-${Date.now()}@example.test`, password: "matkhau123", timezone: TZ });
    if (!result.ok) throw new Error("register failed");
    userId = result.userId;
  });
  beforeEach(async () => {
    await db.targetHistory.deleteMany({ where: { userId } });
    await db.profile.deleteMany({ where: { userId } });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  afterAll(async () => {
    await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });

  it("rejects creation before any DB access and creates no profile/history", async () => {
    const read = vi.spyOn(db.profile, "findUnique");
    const transaction = vi.spyOn(db, "$transaction");
    expect(await saveProfile(userId, TZ, input)).toEqual(blocked);
    expect(read).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(await db.profile.findUnique({ where: { userId } })).toBeNull();
    expect(await db.targetHistory.count({ where: { userId } })).toBe(0);
  });

  it.each(["auto", "custom"] as const)("rejects edits of %s profiles without changing persisted data", async (mode) => {
    expect((await saveProfile(userId, TZ, { ...input, birthDate: "1998-01-01", goal: "maintain" })).ok).toBe(true);
    if (mode === "custom") {
      expect((await setCustomTargets(userId, TZ, { kcal: 2100, proteinG: 100, carbG: 250, fatG: 70, waterMl: 2000 })).ok).toBe(true);
    }
    const before = await db.profile.findUniqueOrThrow({ where: { userId } });
    const history = await db.targetHistory.findMany({ where: { userId } });
    const transaction = vi.spyOn(db, "$transaction");
    expect(await saveProfile(userId, TZ, { ...input, displayName: "Must not save" })).toEqual(blocked);
    expect(transaction).not.toHaveBeenCalled();
    expect(await db.profile.findUniqueOrThrow({ where: { userId } })).toEqual(before);
    expect(await db.targetHistory.findMany({ where: { userId } })).toEqual(history);
  });

  it("accepts underage maintain and gain", async () => {
    for (const goal of ["maintain", "gain"]) {
      expect((await saveProfile(userId, TZ, { ...input, goal })).ok).toBe(true);
      expect((await db.profile.findUniqueOrThrow({ where: { userId } })).goal).toBe(goal);
    }
  });

  it("blocks the day before 18 and accepts exactly 18 using the user's local date", async () => {
    const adultInput = { ...input, birthDate: "2008-11-05" };
    vi.setSystemTime(new Date("2026-11-04T16:59:59Z")); // 23:59:59 in Vietnam
    expect(await saveProfile(userId, TZ, adultInput)).toEqual(blocked);
    vi.setSystemTime(new Date("2026-11-04T17:00:00Z")); // midnight, 18th birthday in Vietnam
    const result = await saveProfile(userId, TZ, adultInput);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.targets.age).toBe(18);
    expect(result.targets.weightLossBlocked).toBe(false);
    expect(result.targets.calories.kcal).toBeLessThan(result.targets.tdee);
    const profile = await db.profile.findUniqueOrThrow({ where: { userId } });
    expect(profile.goal).toBe("lose");
    expect(profile.birthDate).toEqual(isoToDate("2008-11-05"));
    expect(await saveProfile(userId, "America/Los_Angeles", adultInput)).toEqual(blocked);
  });
});
