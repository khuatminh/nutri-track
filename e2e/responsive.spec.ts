import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { register } from "../src/server/auth/service";
import { saveProfile } from "../src/server/profile/service";
import { addQuickLog } from "../src/server/food-log/service";
import { db } from "../src/server/db";
import { todayIn, isoToDate, addDays } from "../src/lib/dates";

const routes = ["/hom-nay", "/nhat-ky", "/nhat-ky/them", "/can-nang", "/bao-cao", "/cong-thuc", "/ho-so"];

async function assertLayout(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))).toMatchObject({ scroll: await page.evaluate(() => innerWidth) });

  const undersized = await page.locator('button, a[href], input, select, [role="switch"], summary').evaluateAll((nodes) =>
    nodes.flatMap((node) => {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (!el.checkVisibility() || rect.width === 0 || rect.height === 0) return [];
      return rect.width < 44 || rect.height < 44
        ? [{ tag: el.tagName, name: el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 70), width: rect.width, height: rect.height }]
        : [];
    }),
  );
  expect(undersized, `Touch targets on ${page.url()}`).toEqual([]);
}

test("NFR-01: seven screens reflow and every rendered control is at least 44×44", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  const timezone = "Asia/Ho_Chi_Minh";
  const date = todayIn(timezone);
  const account = await register({ email: `layout-${randomUUID()}@example.test`, password: randomUUID(), timezone });
  if (!account.ok) throw new Error(account.error);
  try {
    const profile = await saveProfile(account.userId, timezone, {
      displayName: "Layout QA", sex: "female", birthDate: "1998-01-01", heightCm: 162,
      weightKg: 62, activityLevel: "sedentary", goal: "maintain",
    });
    expect(profile.ok).toBe(true);
    await context.addCookies([{ name: "nt_session", value: account.token, url: baseURL!, httpOnly: true }]);
    // Check empty states before populating the same seven screens.
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await assertLayout(page);
    }
    const logged = await addQuickLog(account.userId, timezone, {
      date, meal: "lunch", name: "Cơm gạo lứt với ức gà áp chảo, rau củ luộc và sốt sữa chua không đường", kcal: 5000,
      proteinG: 500, carbG: 500, fatG: 200,
    });
    expect(logged.ok).toBe(true);
    await db.waterLog.create({ data: { userId: account.userId, logDate: isoToDate(date), loggedAt: new Date(), amountMl: 250 } });
    await db.weightLog.createMany({ data: [
      { userId: account.userId, logDate: isoToDate(addDays(date, -1)), weightKg: 63 },
      { userId: account.userId, logDate: isoToDate(date), weightKg: 62 },
    ], skipDuplicates: true });
    await db.recipe.create({ data: { userId: account.userId, name: "Công thức kiểm tra", nameUnaccented: "cong thuc kiem tra", servings: 2 } });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      if (route === "/hom-nay") {
        await expect(page.getByText("Vượt", { exact: true })).toHaveCount(3);
        await testInfo.attach("dashboard-over-target", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      }
      await assertLayout(page);
      if (route === "/ho-so") {
        const toggle = page.getByRole("switch", { name: "Bật nhắc uống nước" });
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-checked", "true");
        await assertLayout(page);
      }
    }
  } finally {
    await db.user.delete({ where: { id: account.userId } });
  }
});
