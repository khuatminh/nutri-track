import { test, expect } from "@playwright/test";

// Skeleton: full register -> onboarding -> log meal -> dashboard flow is extended by QA (QLD-4).
test("trang đăng nhập hiển thị", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /đăng nhập/i })).toBeVisible();
});
