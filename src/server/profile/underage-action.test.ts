import { afterEach, expect, it, vi } from "vitest";
import { UNDERAGE_WEIGHT_LOSS_MESSAGE } from "@/lib/validation/profile";

vi.mock("@/server/auth", () => ({
  requireUser: vi.fn(async () => ({ userId: "session-user", timezone: "Asia/Ho_Chi_Minh" })),
  clearSessionCookie: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/db", () => ({ db: {} })); // Any DB access on the blocked path fails this test.

import { saveProfileAction } from "@/app/(app)/actions";

afterEach(() => vi.useRealTimers());

it("onboarding action returns the complete underage error from the real service", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-04T16:59:59Z"));
  const result = await saveProfileAction({
    displayName: "Underage",
    sex: "female",
    birthDate: "2008-11-05",
    heightCm: 162,
    weightKg: 62,
    activityLevel: "sedentary",
    goal: "lose",
  });
  expect(result).toEqual({
    ok: false,
    code: "UNDERAGE_WEIGHT_LOSS_BLOCKED",
    weightLossBlocked: true,
    suggestedGoal: "maintain",
    error: UNDERAGE_WEIGHT_LOSS_MESSAGE,
    message: UNDERAGE_WEIGHT_LOSS_MESSAGE,
    fields: { goal: UNDERAGE_WEIGHT_LOSS_MESSAGE },
  });
});
