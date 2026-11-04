import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    // Raw traces contain session cookies and submitted passwords. Enable only
    // for private diagnosis; sanitize before attaching them to an issue.
    trace: process.env.E2E_PRIVATE_TRACE === "1" ? "retain-on-failure" : "off",
    screenshot: "only-on-failure",
  },
  projects: (["light", "dark"] as const).flatMap((colorScheme) => [
    {
      name: `mobile-${colorScheme}`,
      use: { ...devices["Pixel 5"], viewport: { width: 393, height: 851 }, colorScheme },
    },
    {
      name: `desktop-${colorScheme}`,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, colorScheme },
    },
  ]),
});
