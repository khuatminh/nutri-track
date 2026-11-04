"use server";
import { crudAction } from "@/server/crud-action";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { THEME_COOKIE, type ThemePref } from "@/lib/theme";
import { requireUser } from "@/server/auth";
import { addWater, deleteWater, restoreWater, updateWater, type WaterDto } from "@/server/water/service";
import { addLog, addQuickLog, copyMeal, deleteMeal, restoreMeal, deleteLog, deleteLogs, restoreLog, setFavorite, updateLog, type LogDto } from "@/server/food-log/service";
import { createCustomFood, updateCustomFood, deleteCustomFood, listMyFoods } from "@/server/foods/custom";
import { createRecipe, deleteRecipe, duplicateRecipe, updateRecipe } from "@/server/recipes/service";
import { saveWeight, deleteWeight, updateWeight, listWeights } from "@/server/weight/service";
import { acceptRetarget, dismissRetarget, recalculateTargets, saveProfile, setCustomTargets, setHideWeight, setThemePref } from "@/server/profile/service";
import { deleteReminder, saveReminder, setReminderEnabled, snoozeReminder } from "@/server/reminders/service";
import { changePassword, deleteAccount } from "@/server/auth/service";
import { changePasswordSchema, fieldErrors } from "@/lib/validation/auth";
import { clearSessionCookie } from "@/server/auth";
import { redirect } from "next/navigation";
import type { Meal } from "@prisma/client";

// Every action resolves the user from the session; no userId is accepted from the client.

const refresh = () => {
  for (const p of ["/hom-nay", "/nhat-ky", "/bao-cao", "/can-nang", "/cong-thuc", "/ho-so"]) revalidatePath(p);
};

export async function addWaterAction(amountMl: number, date?: string, clientRequestId?: string) {
  const u = await requireUser();
  const r = await addWater(u.userId, u.timezone, { amountMl, date, clientRequestId });
  refresh();
  return r;
}
export async function updateWaterAction(id: string, amountMl: number) {
  const u = await requireUser();
  const r = await updateWater(u.userId, id, amountMl);
  refresh();
  return r;
}
export async function deleteWaterAction(id: string) {
  const u = await requireUser();
  const r = await deleteWater(u.userId, id);
  refresh();
  return r;
}
export async function restoreWaterAction(w: WaterDto) {
  const u = await requireUser();
  const r = await restoreWater(u.userId, w);
  refresh();
  return r;
}

export async function addLogAction(input: unknown, opts?: { allowFuture?: boolean }) {
  const u = await requireUser();
  const r = await addLog(u.userId, u.timezone, input, opts);
  refresh();
  return r;
}
export async function addQuickLogAction(input: unknown) {
  const u = await requireUser();
  const r = await addQuickLog(u.userId, u.timezone, input);
  refresh();
  return r;
}
export async function updateLogAction(id: string, input: unknown) {
  return crudAction(async (u) => {
    const r = await updateLog(u.userId, u.timezone, id, input);
    refresh();
    return r;
  });
}
export async function deleteLogAction(id: string) {
  return crudAction(async (u) => {
    const r = await deleteLog(u.userId, id);
    refresh();
    return r;
  });
}
export async function restoreLogAction(dto: LogDto) {
  return crudAction(async (u) => {
    const r = await restoreLog(u.userId, dto);
    refresh();
    return r;
  });
}
export async function undoLogsAction(ids: string[]) {
  const u = await requireUser();
  const n = await deleteLogs(u.userId, ids);
  refresh();
  return n;
}
export async function copyMealAction(input: { fromDate: string; fromMeal?: Meal; toDate: string; toMeal?: Meal }) {
  const u = await requireUser();
  const r = await copyMeal(u.userId, u.timezone, input);
  refresh();
  return r;
}
export async function favoriteAction(foodId: string, on: boolean) {
  const u = await requireUser();
  return setFavorite(u.userId, foodId, on);
}
export async function createFoodAction(input: unknown) {
  return crudAction(async (u) => {
    const r = await createCustomFood(u.userId, input);
    refresh();
    return r;
  });
}

export async function createRecipeAction(input: unknown) {
  const u = await requireUser();
  const r = await createRecipe(u.userId, input);
  refresh();
  return r;
}
export async function updateRecipeAction(id: string, input: unknown) {
  const u = await requireUser();
  const r = await updateRecipe(u.userId, id, input);
  refresh();
  return r;
}
export async function deleteRecipeAction(id: string) {
  const u = await requireUser();
  const r = await deleteRecipe(u.userId, id);
  refresh();
  return r;
}
export async function duplicateRecipeAction(id: string) {
  const u = await requireUser();
  const r = await duplicateRecipe(u.userId, id);
  refresh();
  return r;
}

export async function saveWeightAction(input: unknown, overwrite?: boolean) {
  return crudAction(async (u) => {
    const r = await saveWeight(u.userId, u.timezone, input, { overwrite });
    refresh();
    return r;
  });
}
export async function deleteWeightAction(id: string) {
  return crudAction(async (u) => {
    const r = await deleteWeight(u.userId, id);
    refresh();
    return r;
  });
}

export async function saveProfileAction(input: unknown) {
  const u = await requireUser();
  const r = await saveProfile(u.userId, u.timezone, input);
  refresh();
  return r;
}
export async function setCustomTargetsAction(input: unknown) {
  const u = await requireUser();
  const r = await setCustomTargets(u.userId, u.timezone, input);
  refresh();
  return r;
}
export async function recalculateTargetsAction() {
  const u = await requireUser();
  const r = await recalculateTargets(u.userId, u.timezone);
  refresh();
  return r;
}
export async function acceptRetargetAction() {
  const u = await requireUser();
  const r = await acceptRetarget(u.userId, u.timezone);
  refresh();
  return r;
}
export async function dismissRetargetAction() {
  const u = await requireUser();
  await dismissRetarget(u.userId, u.timezone);
  refresh();
}

export async function setThemeAction(pref: ThemePref) {
  const u = await requireUser();
  if (!["system", "light", "dark"].includes(pref)) return;
  await setThemePref(u.userId, pref);
  (await cookies()).set(THEME_COOKIE, pref, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
export async function setHideWeightAction(hide: boolean) {
  const u = await requireUser();
  await setHideWeight(u.userId, hide);
  refresh();
}

export async function saveReminderAction(input: unknown) {
  const u = await requireUser();
  const r = await saveReminder(u.userId, input);
  revalidatePath("/", "layout");
  return r;
}
export async function setReminderEnabledAction(id: string, enabled: boolean) {
  const u = await requireUser();
  const r = await setReminderEnabled(u.userId, id, enabled);
  revalidatePath("/", "layout");
  return r;
}
export async function snoozeReminderAction(id: string) {
  const u = await requireUser();
  return snoozeReminder(u.userId, id, 30);
}
export async function deleteReminderAction(id: string) {
  const u = await requireUser();
  const r = await deleteReminder(u.userId, id);
  revalidatePath("/", "layout");
  return r;
}

export async function changePasswordAction(input: { currentPassword: string; newPassword: string }) {
  const u = await requireUser();
  const p = changePasswordSchema.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Thông tin chưa hợp lệ", fields: fieldErrors(p.error) };
  return changePassword({ userId: u.userId, currentSessionToken: u.token, ...p.data });
}
export async function deleteAccountAction(password: string) {
  const u = await requireUser();
  const r = await deleteAccount(u.userId, password);
  if (!r.ok) return r;
  await clearSessionCookie();
  redirect("/dang-ky");
}

export async function deleteMealAction(input: { date: string; meal: Meal }) {
  return crudAction(async (u) => {
    const r = await deleteMeal(u.userId, input);
    refresh();
    return r;
  });
}
export async function restoreMealAction(dtos: LogDto[]) {
  return crudAction(async (u) => {
    const r = await restoreMeal(u.userId, dtos);
    refresh();
    return r;
  });
}
export async function updateFoodAction(id: string, input: unknown) {
  return crudAction(async (u) => {
    const r = await updateCustomFood(u.userId, id, input);
    refresh();
    return r;
  });
}
export async function deleteFoodAction(id: string) {
  return crudAction(async (u) => {
    const r = await deleteCustomFood(u.userId, id);
    refresh();
    return r;
  });
}
export async function listMyFoodsAction() {
  return crudAction((u) => listMyFoods(u.userId));
}
export async function listWeightsAction() {
  return crudAction((u) => listWeights(u.userId));
}
export async function updateWeightAction(id: string, input: unknown) {
  return crudAction(async (u) => {
    const r = await updateWeight(u.userId, u.timezone, id, input);
    refresh();
    return r;
  });
}
