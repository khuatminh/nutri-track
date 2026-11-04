import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createCustomFood, registerAndOnboard } from "./support/nutritrack";

const TODAY =
  process.env.E2E_TEST_DATE ??
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const ONLY_DESKTOP_LIGHT = "NFR-03/QLD-44 runs once per CI in desktop-light";

const FOOD = { kcal: "180", protein: "10", carb: "20", fat: "6", fiber: "2", sugar: "3", sodium: "100" };

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-light", ONLY_DESKTOP_LIGHT);
});

async function expectNoAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
  expect(summary, `axe violations on ${label}: ${JSON.stringify(summary, null, 2)}`).toEqual([]);
}

async function addDiaryEntry(page: Page, name: string) {
  await page.goto(`/nhat-ky/them?date=${TODAY}&meal=lunch`);
  await createCustomFood(page, { name, ...FOOD });
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Thêm vào nhật ký" }).click();
  await expect(dialog).not.toBeVisible();
}

test("US-06.1 / US-06.4 / US-07.1: autofocus, renamed tab, prefilled custom food and micronutrients", async ({ page }, testInfo) => {
  await registerAndOnboard(page, testInfo);
  const name = `Món QLD44 ${Date.now()}`;
  await page.goto(`/nhat-ky/them?date=${TODAY}&meal=lunch`);

  await test.step("US-06.1: the search field is focused and the tab is named correctly", async () => {
    await expect(page.getByLabel("Tìm món ăn")).toBeFocused();
    await expect(page.getByRole("tab", { name: "Món của tôi", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tự thêm", exact: true })).toHaveCount(0);
  });

  await test.step("US-06.4: empty state CTA prefills the typed dish name", async () => {
    await page.getByLabel("Tìm món ăn").fill(name);
    await expect(page.getByRole("heading", { name: /Không tìm thấy/ })).toBeVisible();
    await page
      .getByRole("heading", { name: /Không tìm thấy/ })
      .locator("..")
      .getByRole("button", { name: "Tạo món mới" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Tên món", { exact: true })).toHaveValue(name);
    for (const [label, value] of [
      ["Đơn vị khẩu phần", "phần QA"],
      ["Khối lượng một khẩu phần", "100"],
      ["Năng lượng", FOOD.kcal],
      ["Protein", FOOD.protein],
      ["Carb", FOOD.carb],
      ["Chất béo", FOOD.fat],
      ["Chất xơ (tùy chọn)", FOOD.fiber],
      ["Đường (tùy chọn)", FOOD.sugar],
      ["Natri (tùy chọn)", FOOD.sodium],
    ] as const) {
      await dialog.getByLabel(label, { exact: true }).fill(value);
    }
    await dialog.getByRole("button", { name: "Lưu món" }).click();
    await expect(dialog).not.toBeVisible();
  });

  await test.step("US-07.1: fiber, sugar and sodium follow the selected serving and quantity", async () => {
    await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Chất xơ 2,0 g · Đường 3,0 g · Natri 100 mg");
    await dialog.getByLabel("Số lượng").fill("1,5");
    await expect(dialog).toContainText("Chất xơ 3,0 g · Đường 4,5 g · Natri 150 mg");
    await dialog.getByLabel("Đơn vị", { exact: true }).selectOption({ label: "gam (g)" });
    await dialog.getByLabel("Số lượng").fill("50");
    await expect(dialog).toContainText("Chất xơ 1,0 g · Đường 1,5 g · Natri 50 mg");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();

    await page.getByRole("tab", { name: "Món của tôi", exact: true }).click();
    await expect(page.getByRole("button", { name: new RegExp(`^${name}`) })).toBeVisible();
  });
});

test("US-26.2: clicking a web notification opens the matching action screen", async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-11-05T12:00:00+07:00"));
  await page.addInitScript(() => {
    type FakeNotification = {
      title: string;
      body?: string;
      onclick: (() => void) | null;
      close: () => void;
    };
    const list: FakeNotification[] = [];
    class MockNotification {
      static permission: NotificationPermission = "granted";
      static requestPermission = async () => "granted" as NotificationPermission;
      title: string;
      body?: string;
      onclick: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor(title: string, options?: NotificationOptions) {
        this.title = title;
        this.body = options?.body;
        list.push(this as unknown as FakeNotification);
      }
      close() {}
    }
    Object.defineProperty(window, "Notification", { value: MockNotification, configurable: true });
    Object.defineProperty(document, "visibilityState", { get: () => "hidden", configurable: true });
    Object.defineProperty(document, "hidden", { get: () => true, configurable: true });
    (window as unknown as { __ntNotifications: FakeNotification[] }).__ntNotifications = list;
  });

  await registerAndOnboard(page, testInfo);
  type FakeNotification = { title: string; body?: string; onclick: (() => void) | null };
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          (window as unknown as { __ntNotifications: FakeNotification[] }).__ntNotifications.map((n) => n.body ?? ""),
        ),
    )
    .toEqual(expect.arrayContaining([expect.stringContaining("nước")]));

  await test.step("water notification adds 250 ml", async () => {
    await page.evaluate(() => {
      const notifications = (window as unknown as { __ntNotifications: FakeNotification[] }).__ntNotifications;
      notifications.find((n) => n.body?.includes("nước"))?.onclick?.();
    });
    await expect(page.locator('[data-testid="water-total"]')).toContainText("250");
  });

  await test.step("meal notification opens the add-food screen for that meal", async () => {
    await page.evaluate(() => {
      const notifications = (window as unknown as { __ntNotifications: FakeNotification[] }).__ntNotifications;
      notifications.find((n) => n.body?.includes("bữa trưa"))?.onclick?.();
    });
    await expect(page).toHaveURL(/\/nhat-ky\/them\?meal=lunch/);
  });
});

test("NFR-03: axe WCAG 2.1 AA is clean on /nhat-ky and the date input keeps a focus ring", async ({ page }, testInfo) => {
  await registerAndOnboard(page, testInfo);
  await addDiaryEntry(page, `Món axe ${Date.now()}`);
  await page.goto("/nhat-ky");
  await expect(page.getByRole("main")).toBeVisible();
  await expectNoAxeViolations(page, "nhật ký");

  await page.getByRole("link", { name: "Ngày trước" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("#date-pick")).toBeFocused();
  const outline = await page.locator("#date-pick").evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
  });
  expect(outline.style, "date input must not use outline: none").not.toBe("none");
  expect(outline.width, "date input must show a focus ring").toBeGreaterThan(0);
});
