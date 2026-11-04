import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("QLD-42: macro warning, optional carb balance and custom profile confirmation persist", async ({ page }, testInfo) => {
  await page.goto("/dang-ky");
  await page.getByLabel("Email").fill(`qld42-${randomUUID()}@example.test`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(`Qa${randomUUID()}`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /tạo tài khoản/i }).click();
  await page.getByRole("radio", { name: /Giữ cân/ }).check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Tên hiển thị").fill("QLD42 Fixture");
  await page.getByLabel("Ngày sinh").fill("1998-01-01");
  await page.getByLabel("Chiều cao").fill("162");
  await page.getByLabel("Cân nặng hiện tại").fill("62");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Hoàn tất" }).click();
  await expect(page.getByRole("heading", { name: "Hôm nay", exact: true })).toBeVisible();
  await page.goto("/ho-so");
  const targets = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { name: "Mục tiêu hằng ngày", exact: true }) });
  const dialog = page.getByRole("dialog");

  await test.step("US-05.6: save a 25% mismatch without applying the suggestion", async () => {
    await page.getByRole("button", { name: "Chỉnh tay" }).click();
    await dialog.getByLabel("Kcal", { exact: true }).fill("2000");
    await dialog.getByLabel("Đạm", { exact: true }).fill("100");
    await dialog.getByLabel("Béo", { exact: true }).fill("40");
    for (const [carb, warns] of [["334", false], ["335", false], ["336", true], ["345", true]] as const) {
      await dialog.getByLabel("Tinh bột", { exact: true }).fill(carb);
      if (warns) await expect(dialog.getByRole("status")).toContainText("Macro không khớp kcal");
      else await expect(dialog.getByRole("status")).not.toBeVisible();
    }
    for (const [label, value] of [["Kcal", "2000"], ["Đạm", "100"], ["Tinh bột", "50"], ["Béo", "100"], ["Nước", "2100"]]) {
      await dialog.getByLabel(label!, { exact: true }).fill(value!);
    }
    await expect(dialog.getByRole("status")).toContainText("Macro không khớp kcal");
    await expect(dialog.getByRole("status")).toContainText("175 g");
    await testInfo.attach("macro-warning", { body: await page.screenshot({ path: testInfo.outputPath("macro-warning.png") }), contentType: "image/png" });
    await dialog.getByRole("button", { name: "Lưu mục tiêu", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    await expect(targets).toContainText("Tùy chỉnh");
    await expect(targets).toContainText("Tinh bột 50 g");
  });

  await test.step("US-05.6: apply carb balance, preserve protein/fat and persist", async () => {
    await page.getByRole("button", { name: "Chỉnh tay" }).click();
    await dialog.getByRole("button", { name: "Áp dụng cân bằng carb" }).click();
    await expect(dialog.getByLabel("Tinh bột", { exact: true })).toHaveValue("175");
    await expect(dialog.getByLabel("Đạm", { exact: true })).toHaveValue("100");
    await expect(dialog.getByLabel("Béo", { exact: true })).toHaveValue("100");
    await expect(dialog.getByRole("status")).not.toBeVisible();
    await dialog.getByRole("button", { name: "Lưu mục tiêu", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    await expect(targets).toContainText("Tinh bột 175 g");
  });

  const custom = await targets.innerText();
  await test.step("US-03.5: cancel saves nothing; keep preserves all targets", async () => {
    await page.getByLabel("Chiều cao", { exact: true }).fill("170");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(dialog.getByRole("button", { name: "Giữ mục tiêu tùy chỉnh" })).toBeVisible();
    await testInfo.attach("profile-confirmation", { body: await page.screenshot({ path: testInfo.outputPath("profile-confirmation.png") }), contentType: "image/png" });
    await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    await page.reload();
    await expect(page.getByLabel("Chiều cao", { exact: true })).toHaveValue("162");
    await page.getByLabel("Chiều cao", { exact: true }).fill("170");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await dialog.getByRole("button", { name: "Giữ mục tiêu tùy chỉnh" }).click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Chiều cao", { exact: true })).toHaveValue("170");
    expect(await targets.innerText()).toBe(custom);
  });

  await test.step("US-03.5: recalculate uses the new profile, not the previous one", async () => {
    await page.getByLabel("Chiều cao", { exact: true }).fill("180");
    await page.getByLabel("Ngày sinh").fill("1990-01-01");
    await page.getByLabel("Giới tính", { exact: true }).selectOption("male");
    await page.getByLabel("Mức vận động", { exact: true }).selectOption("active");
    await page.getByLabel("Mục tiêu", { exact: true }).selectOption("gain");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await dialog.getByRole("button", { name: "Tính lại tự động", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    await expect(targets).toContainText("Tự động");
    // Independent PRD oracle: Mifflin male × active PAL + default gain (275 kcal).
    const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()));
    const kcal = Math.round(((620 + 6.25 * 180 - 5 * (year - 1990) + 5) * 1.725 + 275) / 10) * 10;
    const protein = Math.round(1.8 * 62);
    const fat = Math.round(kcal * 0.27 / 9);
    const carb = Math.round((kcal - 4 * (1.8 * 62) - kcal * 0.27) / 4);
    await expect(targets).toContainText(`${new Intl.NumberFormat("vi-VN").format(kcal)} kcal`);
    await expect(targets).toContainText(`Đạm ${protein} g`);
    await expect(targets).toContainText(`Tinh bột ${carb} g`);
    await expect(targets).toContainText(`Béo ${fat} g`);
    await expect(page.getByLabel("Chiều cao", { exact: true })).toHaveValue("180");
  });
});
