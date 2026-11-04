import { expect, test } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR; // when set, also capture screenshots (light/dark × mobile/desktop)

test("đăng ký → onboarding → ghi bữa → dashboard", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: process.env.SCHEME === "dark" ? "dark" : "light" });
  // Projects run in parallel: make the email unique per project + run to avoid duplicate-registration races.
  const email = `e2e-${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto("/dang-ky");
  await expect(page.getByRole("heading", { name: /tạo tài khoản/i })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill("matkhau123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /tạo tài khoản/i }).click();

  await expect(page.getByRole("heading", { name: /mục tiêu của bạn/i })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Tên hiển thị").fill("Linh");
  await page.getByLabel("Ngày sinh").fill("1998-01-01");
  await page.getByLabel("Chiều cao").fill("162");
  await page.getByLabel("Cân nặng hiện tại").fill("62,4");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText(/Mục tiêu mỗi ngày/)).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Hoàn tất" }).click();

  await expect(page.getByRole("heading", { name: "Hôm nay" })).toBeVisible();
  await expect(page.getByText("Chưa có bữa ăn nào")).toBeVisible();

  await page.goto("/nhat-ky/them?meal=lunch");
  await page.getByLabel("Tìm món ăn").fill("pho bo");
  await page.getByRole("button", { name: /Phở bò/ }).first().click();
  await page.getByRole("button", { name: "Thêm vào nhật ký" }).click();
  await expect(page.getByText(/Đã thêm/)).toBeVisible();

  await page.goto("/hom-nay");
  await expect(page.getByText(/kcal còn lại|kcal vượt/)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: /Đạm/ })).toBeVisible();

  if (SHOTS) {
    await page.getByRole("button", { name: "Thêm 250 ml" }).click();
    for (const [name, path] of [["hom-nay", "/hom-nay"], ["nhat-ky", "/nhat-ky"], ["them-mon", "/nhat-ky/them"], ["bao-cao", "/bao-cao"], ["can-nang", "/can-nang"], ["cong-thuc", "/cong-thuc/moi"], ["ho-so", "/ho-so"]] as const) {
      await page.goto(path);
      await page.screenshot({ path: `${SHOTS}/${name}-${test.info().project.name}-${process.env.SCHEME ?? "light"}.png`, fullPage: true });
    }
  }
});
