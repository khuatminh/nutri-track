import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// PRD §8.2 / QA-24 oracle: entered through the UI, independent of app helpers.
const FOOD = { kcal: 180, protein: 10, carb: 20, fat: 6, fiber: 2, sugar: 3, sodium: 100 };
const DATE = process.env.E2E_TEST_DATE ?? "2026-11-04";
const PREVIOUS = new Date(`${DATE}T00:00:00Z`);
PREVIOUS.setUTCDate(PREVIOUS.getUTCDate() - 1);
const PREVIOUS_DATE = PREVIOUS.toISOString().slice(0, 10);
const SHORT_DATE = DATE.split("-").reverse().join("/");
const PREVIOUS_SHORT = PREVIOUS_DATE.split("-").reverse().join("/");
const fmt = (n: number, digits = 0) =>
  new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

async function assertDashboard(page: Page, name: string, grams: number) {
  const factor = grams / 100;
  await expect(
    page.getByRole("img", { name: new RegExp(`Đã ăn ${fmt(FOOD.kcal * factor)} trên mục tiêu`) }),
  ).toBeVisible();
  for (const [label, value] of [
    ["Đạm", FOOD.protein],
    ["Tinh bột", FOOD.carb],
    ["Béo", FOOD.fat],
  ] as const) {
    await expect(
      page.getByRole("progressbar", {
        name: new RegExp(`^${label}.*: ${fmt(value * factor, 1)} trên`),
      }),
    ).toBeVisible();
  }
  const lunch = page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Bữa trưa", exact: true }) });
  await expect(lunch).toContainText(name);
  await expect(lunch).toContainText(`${fmt(FOOD.kcal * factor)} kcal`);
}

async function addFood(page: Page, name: string, date: string, quantity: string, unit: string) {
  await page.goto(`/nhat-ky/them?meal=lunch&date=${date}`);
  await page.getByLabel("Tìm món ăn").fill(name);
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Đơn vị", { exact: true }).selectOption({ label: unit });
  await dialog.getByLabel("Số lượng").fill(quantity);
  return dialog;
}

test("QA-24: registration → onboarding → serving → persisted dashboard → weekly/monthly reports", async ({
  page,
  browser,
}, testInfo) => {
  // NFR-07: any Content-Security-Policy violation reported by the browser fails the test.
  const cspViolations: string[] = [];
  page.on("console", (msg) => {
    if (/content security policy|violates the following/i.test(msg.text())) {
      cspViolations.push(msg.text());
    }
  });
  const runId = randomUUID();
  const name = `QA fixture ${runId}`;
  const color = testInfo.project.use.colorScheme ?? "light";
  const birthYear = Number(DATE.slice(0, 4)) - 28;
  await testInfo.attach("execution-context", {
    body: JSON.stringify(
      {
        baseline: "5293671",
        testDate: DATE,
        previousDate: PREVIOUS_DATE,
        timezone: "Asia/Ho_Chi_Minh",
        browser: browser.version(),
        viewport: testInfo.project.use.viewport,
        color,
        fixture: FOOD,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await page.clock.setFixedTime(new Date(`${DATE}T12:00:00+07:00`));

  await test.step("US-01.1 / US-03.4: create isolated account and complete onboarding", async () => {
    await page.goto("/dang-ky");
    await page.getByLabel("Email").fill(`e2e-${testInfo.workerIndex}-${runId}@example.test`);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(`Qa${randomUUID()}`);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /tạo tài khoản/i }).click();
    await expect(page.getByRole("heading", { name: /mục tiêu của bạn/i })).toBeVisible();
    await page.getByRole("radio", { name: /Giữ cân/ }).check();
    await page.getByRole("button", { name: "Tiếp tục" }).click();
    await page.getByLabel("Tên hiển thị").fill("QA Automation");
    await page.getByLabel("Ngày sinh").fill(`${birthYear}-01-01`);
    await page.getByLabel("Chiều cao").fill("162");
    await page.getByLabel("Cân nặng hiện tại").fill("62");
    await page.getByRole("button", { name: "Tiếp tục" }).click();
    await expect(page.getByText(/Mục tiêu mỗi ngày/)).toBeVisible();
    await page.getByRole("button", { name: "Tiếp tục" }).click();
    await page.getByRole("button", { name: "Hoàn tất" }).click();
    await expect(page.getByRole("heading", { name: "Hôm nay", exact: true })).toBeVisible();
    await expect(page.getByText("Chưa có bữa ăn nào")).toBeVisible();
  });

  await test.step("NFR-02: selected theme survives reload", async () => {
    await page.goto("/ho-so");
    const theme = page.getByRole("radio", { name: color === "dark" ? "Tối" : "Sáng", exact: true });
    await theme.click();
    await expect(theme).toHaveAttribute("aria-checked", "true");
    // Wait for the server action's response before checking persisted state.
    await expect
      .poll(async () => (await page.context().cookies()).find((c) => c.name === "nt_theme")?.value)
      .toBe(color);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", color);
  });

  await test.step("US-09.1: create known seven-nutrient fixture through UI", async () => {
    await page.goto(`/nhat-ky/them?meal=lunch&date=${DATE}`);
    await page.getByRole("button", { name: "Tạo món mới", exact: true }).click();
    const dialog = page.getByRole("dialog");
    for (const [label, value] of [
      ["Tên món", name],
      ["Đơn vị khẩu phần", "phần QA"],
      ["Khối lượng một khẩu phần", "100"],
      ["Năng lượng", "180"],
      ["Protein", "10"],
      ["Carb", "20"],
      ["Chất béo", "6"],
      ["Chất xơ (tùy chọn)", "2"],
      ["Đường (tùy chọn)", "3"],
      ["Natri (tùy chọn)", "100"],
    ]) {
      await dialog.getByLabel(label!, { exact: true }).fill(value!);
    }
    await dialog.getByRole("button", { name: "Lưu món" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`^${name}`) })).toBeVisible();
  });

  await test.step("US-07.2–4: reject zero then log 1,5 × 100 g = 270 kcal / P15 C30 F9", async () => {
    const dialog = await addFood(page, name, DATE, "0", "phần QA (100 g)");
    await dialog.getByRole("button", { name: "Thêm vào nhật ký" }).click();
    await expect(dialog.getByText("Nhập số lượng lớn hơn 0")).toBeVisible();
    await dialog.getByLabel("Số lượng").fill("1,5");
    await expect(dialog).toContainText("270 kcal");
    for (const text of ["P 15,0 g", "C 30,0 g", "F 9,0 g"])
      await expect(dialog).toContainText(text);
    await dialog.getByRole("button", { name: "Thêm vào nhật ký" }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "Xong (1)", exact: true }).click();
    await expect(
      page.locator("#lunch").getByRole("button", { name: `Sửa ${name}`, exact: true }),
    ).toBeVisible();
    await expect(page.locator("#lunch")).toContainText("270 kcal");
  });

  await test.step("US-13.3/5: exact dashboard nutrients survive reload", async () => {
    await page.goto(`/hom-nay?date=${DATE}`);
    await assertDashboard(page, name, 150);
    await page.reload();
    await assertDashboard(page, name, 150);
    await expect(page.locator("html")).toHaveAttribute("data-theme", color);
    await testInfo.attach("dashboard", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });

  await test.step("US-07.2: record second day using grams", async () => {
    const dialog = await addFood(page, name, PREVIOUS_DATE, "100", "gam (g)");
    await expect(dialog).toContainText("180 kcal");
    await dialog.getByRole("button", { name: "Thêm vào nhật ký" }).click();
    await expect(dialog).not.toBeVisible();
    await page.goto(`/hom-nay?date=${PREVIOUS_DATE}`);
    await assertDashboard(page, name, 100);
    await page.goto(`/hom-nay?date=${DATE}`);
    await assertDashboard(page, name, 150);
  });

  for (const view of ["week", "month"] as const) {
    await test.step(`US-19.2/3 / US-20.1: ${view} report has exact dates, totals and average over two logged days`, async () => {
      await page.goto(`/bao-cao?view=${view}&date=${DATE}`);
      await page.reload();
      await expect(page.getByText(/Trung bình trên/)).toContainText(
        view === "week" ? "2/7" : "2/30",
      );
      await expect(
        page
          .locator("div.rounded-lg")
          .filter({ has: page.getByText("Kcal trung bình/ngày", { exact: true }) }),
      ).toContainText("225");
      await page.getByText("Xem dạng bảng", { exact: true }).click();
      const table = page.getByRole("table", { name: "Kcal mỗi ngày", exact: true });
      for (const [date, kcal] of [
        [SHORT_DATE, "270"],
        [PREVIOUS_SHORT, "180"],
      ]) {
        const row = table
          .getByRole("row")
          .filter({ has: page.getByRole("cell", { name: date, exact: true }) });
        await expect(row.getByRole("cell").nth(1)).toHaveText(kcal!);
      }
      for (const [label, value] of [
        ["■ Đạm", "12,5 g"],
        ["● Tinh bột", "25,0 g"],
        ["◆ Béo", "7,5 g"],
        ["Chất xơ", "2,5 g"],
        ["Đường", "3,8 g"],
        ["Natri", "125 mg"],
      ]) {
        await expect(
          page
            .locator("dl > div")
            .filter({ has: page.locator("dt").getByText(label!, { exact: true }) }),
        ).toContainText(value!);
      }
      await testInfo.attach(`report-${view}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    });
  }
  expect(cspViolations, "CSP violations in browser console").toEqual([]);
});
