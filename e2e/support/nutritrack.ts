import { randomUUID } from "node:crypto";
import { expect, type Page, type TestInfo } from "@playwright/test";

/** Registers an isolated account and completes onboarding (with the default reminders enabled). */
export async function registerAndOnboard(page: Page, testInfo: TestInfo): Promise<{ email: string; name: string }> {
  const runId = randomUUID();
  const email = `e2e-${testInfo.project.name}-${runId}@example.test`;
  const name = `QLD44 ${runId.slice(0, 8)}`;
  await page.goto("/dang-ky");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(`Qa${randomUUID()}`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /tạo tài khoản/i }).click();
  await expect(page.getByRole("heading", { name: /mục tiêu của bạn/i })).toBeVisible();

  await page.getByRole("radio", { name: /Giữ cân/ }).check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Tên hiển thị").fill("QA QLD44");
  await page.getByLabel("Ngày sinh").fill("1998-01-01");
  await page.getByLabel("Chiều cao").fill("162");
  await page.getByLabel("Cân nặng hiện tại").fill("62");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText(/Mục tiêu mỗi ngày/)).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Hoàn tất" }).click();
  await expect(page.getByRole("heading", { name: "Hôm nay", exact: true })).toBeVisible();
  return { email, name };
}

export interface FoodFixture {
  name: string;
  kcal: string;
  protein: string;
  carb: string;
  fat: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
  unit?: string;
  grams?: string;
}

/** Creates a custom food through the UI. Leaves the add-food screen with the food searchable. */
export async function createCustomFood(page: Page, food: FoodFixture) {
  await page.getByRole("button", { name: "Tạo món mới", exact: true }).last().click();
  const dialog = page.getByRole("dialog");
  const values: Array<[string, string | undefined]> = [
    ["Tên món", food.name],
    ["Đơn vị khẩu phần", food.unit ?? "phần QA"],
    ["Khối lượng một khẩu phần", food.grams ?? "100"],
    ["Năng lượng", food.kcal],
    ["Protein", food.protein],
    ["Carb", food.carb],
    ["Chất béo", food.fat],
    ["Chất xơ (tùy chọn)", food.fiber],
    ["Đường (tùy chọn)", food.sugar],
    ["Natri (tùy chọn)", food.sodium],
  ];
  for (const [label, value] of values) {
    if (value !== undefined) await dialog.getByLabel(label, { exact: true }).fill(value);
  }
  await dialog.getByRole("button", { name: "Lưu món" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^${food.name}`) })).toBeVisible();
}

/** Opens a food's portion sheet, logs it at 1 serving, and returns to the diary. */
export async function logFood(page: Page, name: string, date: string) {
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("kcal");
  await dialog.getByRole("button", { name: "Thêm vào nhật ký" }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto(`/nhat-ky?date=${date}`);
}
