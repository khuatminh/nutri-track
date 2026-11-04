import type { Prisma } from "@prisma/client";
import { computeTargets, checkCustomKcal, type ComputedTargets } from "@/lib/nutrition";
import { dateToIso, isoToDate, todayIn } from "@/lib/dates";
import { customTargetsSchema, profileInputSchema, underageWeightLossError, type UnderageWeightLossError, type CustomTargetsInput, type ProfileInput } from "@/lib/validation/profile";
import { fieldErrors } from "@/lib/validation/auth";
import { db } from "@/server/db";
import { WEIGHT_SUGGEST_DELTA_KG } from "@/lib/nutrition/constants";

export type ServiceResult<T = object> = ({ ok: true } & T) | UnderageWeightLossError | { ok: false; error: string; fields?: Record<string, string> };

export interface TargetSet {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  waterMl: number;
}

type Tx = Prisma.TransactionClient;

async function writeTargetHistory(tx: Tx, userId: string, effectiveFrom: string, t: TargetSet) {
  const data = { kcal: t.kcal, proteinG: t.proteinG, carbG: t.carbG, fatG: t.fatG, waterMl: t.waterMl };
  await tx.targetHistory.upsert({
    where: { userId_effectiveFrom: { userId, effectiveFrom: isoToDate(effectiveFrom) } },
    create: { userId, effectiveFrom: isoToDate(effectiveFrom), ...data },
    update: data,
  });
}

export function toTargetSet(c: ComputedTargets, waterMl = c.waterMl): TargetSet {
  return { kcal: c.calories.kcal, proteinG: c.macros.proteinG, carbG: c.macros.carbG, fatG: c.macros.fatG, waterMl };
}

export async function getProfile(userId: string) {
  return db.profile.findUnique({ where: { userId } });
}

/**
 * US-03/05: create or update the profile and (re)compute auto targets.
 * Targets apply from today onward; past days keep their TargetHistory (US-18.2).
 */
export async function saveProfile(userId: string, timezone: string, raw: unknown): Promise<ServiceResult<{ targets: ComputedTargets }>> {
  const parsed = profileInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ", fields: fieldErrors(parsed.error) };
  const input: ProfileInput = parsed.data;
  const today = todayIn(timezone);
  const restriction = underageWeightLossError(input, today);
  if (restriction) return restriction;
  const targets = computeTargets({ ...input, rateKgPerWeek: input.goalRateKgPerWeek, today });
  if (targets.age < 13 || targets.age > 100) {
    return { ok: false, error: "Tuổi phải từ 13 đến 100", fields: { birthDate: "Tuổi phải từ 13 đến 100" } };
  }
  const existing = await db.profile.findUnique({ where: { userId } });
  const keepCustom = existing?.targetsMode === "custom";
  const set = toTargetSet(targets, existing?.waterTargetCustom ? existing.waterTargetMl : targets.waterMl);

  await db.$transaction(async (tx) => {
    const base = {
      displayName: input.displayName,
      sex: input.sex,
      birthDate: isoToDate(input.birthDate),
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      activityLevel: input.activityLevel,
      goal: input.goal,
      goalRateKgPerWeek: input.goalRateKgPerWeek ?? null,
      targetWeightKg: input.targetWeightKg ?? null,
    };
    if (existing && keepCustom) {
      // Custom targets are preserved; the user is asked to keep/replace via recalculateTargets (US-18.2).
      await tx.profile.update({ where: { userId }, data: base });
      return;
    }
    const targetData = {
      calorieTarget: set.kcal,
      proteinG: set.proteinG,
      carbG: set.carbG,
      fatG: set.fatG,
      waterTargetMl: set.waterMl,
      targetsEffectiveFrom: isoToDate(today),
      targetsWeightKg: input.weightKg,
      retargetDismissedKg: null,
    };
    await tx.profile.upsert({
      where: { userId },
      create: { userId, ...base, ...targetData, targetsMode: "auto" },
      update: { ...base, ...targetData },
    });
    await writeTargetHistory(tx, userId, today, set);
  });
  return { ok: true, targets };
}

/** US-05.4: manual targets with safety checks. */
export async function setCustomTargets(userId: string, timezone: string, raw: unknown): Promise<ServiceResult<{ needsConfirm?: boolean }>> {
  const parsed = customTargetsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Mục tiêu chưa hợp lệ", fields: fieldErrors(parsed.error) };
  const t: CustomTargetsInput = parsed.data;
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) return { ok: false, error: "Bạn cần hoàn tất hồ sơ trước" };
  const check = checkCustomKcal(t.kcal, profile.sex);
  if (check === "blocked") {
    return { ok: false, error: "Mục tiêu dưới 800 kcal/ngày không an toàn nên không thể lưu", fields: { kcal: "Tối thiểu 800 kcal" } };
  }
  if (check === "needs_confirm" && !t.confirmedBelowFloor) {
    return { ok: true, needsConfirm: true }; // caller must re-submit with confirmation; nothing saved
  }
  const today = todayIn(timezone);
  const set: TargetSet = { kcal: t.kcal, proteinG: t.proteinG, carbG: t.carbG, fatG: t.fatG, waterMl: t.waterMl };
  await db.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId },
      data: {
        calorieTarget: set.kcal,
        proteinG: set.proteinG,
        carbG: set.carbG,
        fatG: set.fatG,
        waterTargetMl: set.waterMl,
        waterTargetCustom: true,
        targetsMode: "custom",
        targetsEffectiveFrom: isoToDate(today),
        targetsWeightKg: profile.weightKg,
        retargetDismissedKg: null,
      },
    });
    await writeTargetHistory(tx, userId, today, set);
  });
  return { ok: true };
}

/** Switch back to auto targets, recomputing from the current profile (US-05.4 "Tính lại"). */
export async function recalculateTargets(userId: string, timezone: string, opts: { weightKg?: number } = {}): Promise<ServiceResult<{ targets: ComputedTargets }>> {
  const p = await db.profile.findUnique({ where: { userId } });
  if (!p) return { ok: false, error: "Bạn cần hoàn tất hồ sơ trước" };
  const today = todayIn(timezone);
  const weightKg = opts.weightKg ?? p.weightKg;
  const targets = computeTargets({
    sex: p.sex,
    birthDate: dateToIso(p.birthDate),
    today,
    heightCm: p.heightCm,
    weightKg,
    activityLevel: p.activityLevel,
    goal: p.goal,
    rateKgPerWeek: p.goalRateKgPerWeek ?? undefined,
  });
  const set = toTargetSet(targets, p.waterTargetCustom ? p.waterTargetMl : targets.waterMl);
  await db.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId },
      data: {
        weightKg,
        calorieTarget: set.kcal,
        proteinG: set.proteinG,
        carbG: set.carbG,
        fatG: set.fatG,
        waterTargetMl: set.waterMl,
        targetsMode: "auto",
        targetsEffectiveFrom: isoToDate(today),
        targetsWeightKg: weightKg,
        retargetDismissedKg: null,
      },
    });
    await writeTargetHistory(tx, userId, today, set);
  });
  return { ok: true, targets };
}

export interface RetargetSuggestion {
  newWeightKg: number;
  current: TargetSet;
  proposed: TargetSet;
  isCustom: boolean;
}

/**
 * US-18.1/18.3: suggest recomputing when the latest weight log drifts ≥ 1 kg from the weight
 * used for the last target calculation, and again only after a further ≥ 1 kg if declined.
 */
export async function getRetargetSuggestion(userId: string, timezone: string): Promise<RetargetSuggestion | null> {
  const p = await db.profile.findUnique({ where: { userId } });
  if (!p) return null;
  const latest = await db.weightLog.findFirst({ where: { userId }, orderBy: { logDate: "desc" } });
  if (!latest) return null;
  const w = latest.weightKg;
  if (Math.abs(w - p.targetsWeightKg) < WEIGHT_SUGGEST_DELTA_KG - 1e-9) return null;
  if (p.retargetDismissedKg != null && Math.abs(w - p.retargetDismissedKg) < WEIGHT_SUGGEST_DELTA_KG - 1e-9) return null;
  const proposed = computeTargets({
    sex: p.sex,
    birthDate: dateToIso(p.birthDate),
    today: todayIn(timezone),
    heightCm: p.heightCm,
    weightKg: w,
    activityLevel: p.activityLevel,
    goal: p.goal,
    rateKgPerWeek: p.goalRateKgPerWeek ?? undefined,
  });
  return {
    newWeightKg: w,
    current: { kcal: p.calorieTarget, proteinG: p.proteinG, carbG: p.carbG, fatG: p.fatG, waterMl: p.waterTargetMl },
    proposed: toTargetSet(proposed, p.waterTargetCustom ? p.waterTargetMl : proposed.waterMl),
    isCustom: p.targetsMode === "custom",
  };
}

export async function acceptRetarget(userId: string, timezone: string) {
  const s = await getRetargetSuggestion(userId, timezone);
  if (!s) return { ok: false as const, error: "Không có gợi ý cập nhật" };
  return recalculateTargets(userId, timezone, { weightKg: s.newWeightKg });
}

export async function dismissRetarget(userId: string, timezone: string): Promise<void> {
  const s = await getRetargetSuggestion(userId, timezone);
  if (s) await db.profile.update({ where: { userId }, data: { retargetDismissedKg: s.newWeightKg } });
}

/** Targets in effect on a date: latest TargetHistory row with effective_from ≤ date (PRD §8.4). */
export async function targetsForDate(userId: string, isoDate: string): Promise<TargetSet | null> {
  const row =
    (await db.targetHistory.findFirst({ where: { userId, effectiveFrom: { lte: isoToDate(isoDate) } }, orderBy: { effectiveFrom: "desc" } })) ??
    (await db.targetHistory.findFirst({ where: { userId }, orderBy: { effectiveFrom: "asc" } }));
  return row && { kcal: row.kcal, proteinG: row.proteinG, carbG: row.carbG, fatG: row.fatG, waterMl: row.waterMl };
}

export async function setThemePref(userId: string, themePref: "system" | "light" | "dark"): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { themePref } });
}

export async function setHideWeight(userId: string, hide: boolean): Promise<void> {
  await db.profile.update({ where: { userId }, data: { hideWeight: hide } });
}
