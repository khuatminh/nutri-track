import { randomUUID } from "node:crypto";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Same fixture date as the smoke suite; override with E2E_TEST_DATE when replaying later.
const DATE = process.env.E2E_TEST_DATE ?? "2026-11-04";
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function signUpAndOnboard(page: Page, testInfo: TestInfo) {
  const runId = randomUUID();
  await page.goto("/dang-ky");
  await page.getByLabel("Email").fill(`e2e-${testInfo.project.name}-${runId}@example.test`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(`Qa${randomUUID()}`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /tạo tài khoản/i }).click();
  await expect(page.getByRole("heading", { name: /mục tiêu của bạn/i })).toBeVisible();
  await page.getByRole("radio", { name: /Giữ cân/ }).check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Tên hiển thị").fill("QA Offline");
  await page.getByLabel("Ngày sinh").fill("1998-01-01");
  await page.getByLabel("Chiều cao").fill("162");
  await page.getByLabel("Cân nặng hiện tại").fill("62");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText(/Mục tiêu mỗi ngày/)).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Hoàn tất" }).click();
  await expect(page.getByRole("heading", { name: "Hôm nay", exact: true })).toBeVisible();
}

test("NFR-09 / QLD-28: offline save keeps the sheet + input, shows Thử lại, and retries into exactly one log", async ({ page, context }, testInfo) => {
  await signUpAndOnboard(page, testInfo);

  const name = `Món offline ${randomUUID().slice(0, 8)}`;
  await page.goto(`/nhat-ky/them?meal=lunch&date=${DATE}`);

  // Create a private food while online so the offline attempt does not depend on search.
  await page.getByRole("button", { name: "Tạo món mới", exact: true }).click();
  const create = page.getByRole("dialog");
  await create.getByLabel("Tên món", { exact: true }).fill(name);
  await create.getByLabel("Khối lượng một khẩu phần", { exact: true }).fill("100");
  await create.getByLabel("Năng lượng", { exact: true }).fill("100");
  for (const label of ["Protein", "Carb", "Chất béo"] as const) {
    await create.getByLabel(label, { exact: true }).fill("0");
  }
  await create.getByRole("button", { name: "Lưu món" }).click();
  await expect(create).not.toBeVisible();

  await page.getByRole("tab", { name: "Tự thêm" }).click();
  const item = page.getByRole("button", { name: new RegExp(`^${escapeRe(name)}`) });
  await expect(item).toBeVisible();

  await test.step("while offline the app keeps the dialog and input and shows a friendly retry", async () => {
    await context.setOffline(true);
    await item.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Số lượng").fill("1");
    await dialog.getByRole("button", { name: "Thêm vào nhật ký" }).click();
    await expect(dialog.getByText(/Không thể kết nối\. Kiểm tra mạng và thử lại/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Thử lại" })).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Số lượng")).toHaveValue("1");
  });

  await test.step("back online, Thử lại persists exactly one record", async () => {
    await context.setOffline(false);
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Thử lại" }).click();
    await expect(dialog).not.toBeVisible();
    // Hard navigation reads the server state, not the component's optimistic counter.
    await page.goto(`/nhat-ky?date=${DATE}`);
    const lunch = page.locator("#lunch");
    await expect(lunch.getByRole("button", { name: `Sửa ${name}`, exact: true })).toHaveCount(1);
    await expect(lunch).toContainText("100 kcal");
    await expect(lunch).not.toContainText("200 kcal");
  });
});

test("NFR-05: +250 ml water updates the DOM within 100 ms and rolls back when the save fails", async ({ page, context }, testInfo) => {
  await signUpAndOnboard(page, testInfo);
  await page.goto(`/hom-nay?date=${DATE}`);

  const total = page.getByTestId("water-total");
  const add250 = page.getByRole("button", { name: "Thêm 250 ml" });
  await expect(total).toHaveText("0");

  const samples: number[] = [];
  for (const expected of ["250", "500", "750"]) {
    // Measure from the native click to the first DOM mutation of the total.
    const ms = await page.evaluate(
      (want) =>
        new Promise<number>((resolve) => {
          const el = document.querySelector('[data-testid="water-total"]');
          const btn = Array.from(document.querySelectorAll("button")).find(
            (b) => b.getAttribute("aria-label") === "Thêm 250 ml",
          ) as HTMLButtonElement | undefined;
          if (!el || !btn) return resolve(-1);
          const start = performance.now();
          const observer = new MutationObserver(() => {
            if (el.textContent?.trim() === want) {
              observer.disconnect();
              resolve(performance.now() - start);
            }
          });
          observer.observe(el, { childList: true, subtree: true, characterData: true });
          btn.click();
          setTimeout(() => {
            observer.disconnect();
            resolve(el.textContent?.trim() === want ? performance.now() - start : -1);
          }, 2000);
        }),
      expected,
    );
    samples.push(ms);
    expect(ms, `optimistic DOM update to ${expected} ml`).toBeGreaterThan(0);
    expect(ms, `NFR-05: optimistic DOM update to ${expected} ml should be ≤100 ms`).toBeLessThanOrEqual(100);
    // Let the server action settle before the next sample.
    await expect(add250).toBeEnabled();
    await expect(total).toHaveText(expected);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const report = { samplesMs: samples.map((n) => Number(n.toFixed(2))), medianMs: Number(median.toFixed(2)), thresholdMs: 100 };
  await testInfo.attach("nfr-05-water-optimistic-latency", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  console.log("NFR-05 water optimistic latency", report);

  await test.step("a failed save rolls the optimistic total back and Thử lại applies it once", async () => {
    await context.setOffline(true);
    await add250.click();
    await expect(page.getByText(/Không thể kết nối\. Kiểm tra mạng và thử lại/).first()).toBeVisible();
    await expect(total).toHaveText("750");
    await context.setOffline(false);
    await page.getByRole("button", { name: "Thử lại" }).click();
    await expect(total).toHaveText("1.000");
    // Wait for the server action to finish (optimistic text alone is not proof).
    await expect(add250).toBeEnabled();
    await expect(page.getByRole("button", { name: /Lịch sử \(4\)/ })).toBeVisible();
    await page.reload();
    await expect(total).toHaveText("1.000");
    await expect(page.getByRole("button", { name: /Lịch sử \(4\)/ })).toBeVisible();
  });
});
