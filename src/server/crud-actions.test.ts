import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), refresh: vi.fn(), updateLog: vi.fn(), deleteMeal: vi.fn(), restoreMeal: vi.fn(),
  createFood: vi.fn(), updateFood: vi.fn(), deleteFood: vi.fn(), listFoods: vi.fn(),
  updateWeight: vi.fn(), saveWeight: vi.fn(), deleteWeight: vi.fn(), listWeights: vi.fn(),
}));
vi.mock("@/server/auth", () => ({ getSession: mocks.session, requireUser: vi.fn(), clearSessionCookie: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("@/server/food-log/service", () => ({ updateLog: mocks.updateLog, deleteMeal: mocks.deleteMeal, restoreMeal: mocks.restoreMeal }));
vi.mock("@/server/foods/custom", () => ({ createCustomFood: mocks.createFood, updateCustomFood: mocks.updateFood, deleteCustomFood: mocks.deleteFood, listMyFoods: mocks.listFoods }));
vi.mock("@/server/weight/service", () => ({ updateWeight: mocks.updateWeight, saveWeight: mocks.saveWeight, deleteWeight: mocks.deleteWeight, listWeights: mocks.listWeights }));
import { createFoodAction, updateFoodAction, deleteFoodAction, listMyFoodsAction, deleteMealAction, restoreMealAction, updateLogAction, listWeightsAction, updateWeightAction, saveWeightAction, deleteWeightAction } from "@/app/(app)/actions";

describe("QLD-41 action contract", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({ userId: "session-owner", timezone: "Asia/Ho_Chi_Minh" });
  });
  it("uses the session owner and exposes soft warnings on both create/edit", async () => {
    const result = { ok: true, food: { id: "food" }, warnKcalMismatch: true };
    mocks.createFood.mockResolvedValue(result);
    mocks.updateFood.mockResolvedValue(result);
    const input = { userId: "attacker", name: "Món" };
    expect(await createFoodAction(input)).toEqual(result);
    expect(await updateFoodAction("food", input)).toEqual(result);
    expect(mocks.createFood).toHaveBeenCalledWith("session-owner", input);
    expect(mocks.updateFood).toHaveBeenCalledWith("session-owner", "food", input);
  });
  it("routes every new mutation through session ownership and invalidates affected views", async () => {
    for (const fn of [mocks.deleteMeal, mocks.restoreMeal, mocks.updateWeight, mocks.deleteWeight, mocks.saveWeight, mocks.deleteFood, mocks.updateLog]) fn.mockResolvedValue({ ok: true });
    await deleteMealAction({ date: "2026-01-01", meal: "lunch" });
    await restoreMealAction([]);
    await updateWeightAction("weight", { date: "2026-01-01", weightKg: 62 });
    await deleteWeightAction("weight");
    await saveWeightAction({ date: "2026-01-01", weightKg: 62 }, true);
    await deleteFoodAction("food");
    await updateLogAction("log", { servingId: null, quantity: 100 });
    expect(mocks.deleteMeal).toHaveBeenCalledWith("session-owner", { date: "2026-01-01", meal: "lunch" });
    expect(mocks.restoreMeal).toHaveBeenCalledWith("session-owner", []);
    expect(mocks.updateWeight).toHaveBeenCalledWith("session-owner", "Asia/Ho_Chi_Minh", "weight", { date: "2026-01-01", weightKg: 62 });
    expect(mocks.deleteWeight).toHaveBeenCalledWith("session-owner", "weight");
    expect(mocks.updateLog).toHaveBeenCalledWith("session-owner", "Asia/Ho_Chi_Minh", "log", { servingId: null, quantity: 100 });
    for (const path of ["/hom-nay", "/nhat-ky", "/bao-cao", "/can-nang"]) expect(mocks.refresh).toHaveBeenCalledWith(path);
  });
  it("lists only session-owned rows", async () => {
    mocks.listFoods.mockResolvedValue([]);
    mocks.listWeights.mockResolvedValue([]);
    expect(await listMyFoodsAction()).toEqual([]);
    expect(await listWeightsAction()).toEqual([]);
    expect(mocks.listFoods).toHaveBeenCalledWith("session-owner");
    expect(mocks.listWeights).toHaveBeenCalledWith("session-owner");
  });
  it("returns stable Vietnamese error envelopes for validation, conflict, not-found and unexpected failures", async () => {
    mocks.updateWeight.mockResolvedValueOnce({ ok: false, error: "Ngày đã có cân nặng", needsConfirm: true });
    expect(await updateWeightAction("id", {})).toMatchObject({ ok: false, code: "CONFLICT", message: "Ngày đã có cân nặng", needsConfirm: true });
    mocks.updateWeight.mockResolvedValueOnce({ ok: false, error: "Cân nặng chưa hợp lệ", fields: { weightKg: "Không hợp lệ" } });
    expect(await updateWeightAction("id", {})).toMatchObject({ ok: false, code: "VALIDATION_ERROR", message: "Cân nặng chưa hợp lệ" });
    mocks.updateFood.mockResolvedValueOnce({ ok: false, error: "Không tìm thấy món của bạn" });
    expect(await updateFoodAction("id", {})).toMatchObject({ ok: false, code: "NOT_FOUND", message: "Không tìm thấy món của bạn" });
    mocks.listWeights.mockRejectedValue(new Error("private db connection string"));
    expect(await listWeightsAction()).toEqual({ ok: false, code: "INTERNAL_ERROR", message: "Không thể hoàn tất thao tác. Vui lòng thử lại", error: "Không thể hoàn tất thao tác. Vui lòng thử lại" });
  });
  it("rejects unauthenticated calls before running the service", async () => {
    mocks.session.mockResolvedValue(null);
    expect(await deleteFoodAction("id")).toMatchObject({ ok: false, code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập lại" });
    expect(mocks.deleteFood).not.toHaveBeenCalled();
  });
});
