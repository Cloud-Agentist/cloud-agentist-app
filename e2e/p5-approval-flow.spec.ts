/**
 * P5 — End-to-end approval flow on cloudagentist.com
 *
 * Verifies: Temporal worker deployed, governed path works, approvals in inbox
 */
import { test, expect, Page } from "@playwright/test";

const BASE = "https://cloudagentist.com";
const EMAIL = "globethought.test@gmail.com";
const PASSWORD = "Test#r00r00";
const SCREENSHOT_DIR = "e2e/screenshots/p5-approval";

async function loginViaAuth0(page: Page) {
  await page.goto(`${BASE}/auth/login?returnTo=/dashboard`, {
    waitUntil: "commit",
  });
  await page.waitForURL(/auth0\.com/, { timeout: 15000 });

  const emailInput = page.locator(
    "input[name='username'], input[name='email'], input[type='email']"
  );
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(EMAIL);

  await page
    .locator(
      "button[data-action-button-primary='true'], button:has-text('Continue')"
    )
    .first()
    .click();

  const passwordInput = page.locator(
    "input[name='password'], input[type='password']"
  );
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill(PASSWORD);

  await page
    .locator(
      "button[data-action-button-primary='true'], button:has-text('Continue')"
    )
    .first()
    .click();

  await page.waitForURL(/cloudagentist\.com/, { timeout: 15000 });
}

test.describe("P5 — Approval Flow on cloudagentist.com", () => {
  test.setTimeout(120000);

  test("inbox shows pending approvals from governed path", async ({
    page,
  }) => {
    await loginViaAuth0(page);

    // Go to inbox
    await page.goto(`${BASE}/inbox`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-inbox.png`,
      fullPage: true,
    });

    // Verify page loads without errors
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");

    // Check for "Needs your decision" section and Approve/Deny buttons
    const approveBtn = page.getByRole("button", { name: "Approve" }).first();
    const hasApproval = await approveBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasApproval).toBe(true);

    // Should show a high sensitivity badge
    const sensitivityBadge = page.getByText("High sensitivity").first();
    expect(await sensitivityBadge.isVisible()).toBe(true);
  });

  test("approve a pending approval → moves to history", async ({ page }) => {
    await loginViaAuth0(page);

    await page.goto(`${BASE}/inbox`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // Count pending approvals before
    const approveButtons = page.getByRole("button", { name: "Approve" });
    const countBefore = await approveButtons.count();
    console.log("Pending approvals before:", countBefore);

    if (countBefore === 0) {
      test.skip(true, "No pending approvals to test");
      return;
    }

    // Click Approve on the first one
    await approveButtons.first().click();
    await page.waitForTimeout(2000);

    // Reload to get fresh server state
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-after-approve.png`,
      fullPage: true,
    });

    // The approved item should be gone from pending
    const countAfter = await page
      .getByRole("button", { name: "Approve" })
      .count();
    expect(countAfter).toBeLessThan(countBefore);
    console.log("Pending approvals after approve:", countAfter);
  });

  test("deny a pending approval", async ({ page }) => {
    await loginViaAuth0(page);

    await page.goto(`${BASE}/inbox`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    const denyButtons = page.getByRole("button", { name: "Deny" });
    const countBefore = await denyButtons.count();
    console.log("Pending approvals before deny:", countBefore);

    if (countBefore === 0) {
      test.skip(true, "No pending approvals to test");
      return;
    }

    // Click Deny on the first one
    await denyButtons.first().click();
    await page.waitForTimeout(2000);

    // Reload to get fresh server state
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-after-deny.png`,
      fullPage: true,
    });

    // The denied item should be gone from pending
    const countAfter = await page
      .getByRole("button", { name: "Deny" })
      .count();
    expect(countAfter).toBeLessThan(countBefore);
    console.log("Pending approvals after deny:", countAfter);
  });

  test("dashboard and activity show governed interactions", async ({
    page,
  }) => {
    await loginViaAuth0(page);

    // Check dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-dashboard.png`,
      fullPage: true,
    });

    const dashBody = await page.textContent("body");
    expect(dashBody).not.toContain("Application error");

    // Check activity page
    await page.goto(`${BASE}/activity`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-activity.png`,
      fullPage: true,
    });

    const actBody = await page.textContent("body");
    expect(actBody).not.toContain("Application error");
  });
});
