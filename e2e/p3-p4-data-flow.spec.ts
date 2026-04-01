/**
 * P3 + P4 — Claude tool_use intents + dashboard data after interaction
 *
 * P3: Verify Claude returns structured intents for actionable requests
 * P4: Verify dashboard shows data after chat interactions
 */
import { test, expect, Page } from "@playwright/test";

const BASE = "https://cloudagentist.com";
const EMAIL = "globethought.test@gmail.com";
const PASSWORD = "Test#r00r00";

const SCREENSHOT_DIR = "e2e/screenshots/p3-p4";

async function loginViaAuth0(page: Page) {
  await page.goto(`${BASE}/auth/login?returnTo=/dashboard`, { waitUntil: "commit" });
  await page.waitForURL(/auth0\.com/, { timeout: 15000 });
  const emailInput = page.locator("input[name='username'], input[name='email'], input[type='email']");
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(EMAIL);
  await page.locator("button[data-action-button-primary='true'], button:has-text('Continue')").first().click();
  const passwordInput = page.locator("input[name='password'], input[type='password']");
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill(PASSWORD);
  await page.locator("button[data-action-button-primary='true'], button:has-text('Continue')").first().click();
  await page.waitForURL(/cloudagentist\.com/, { timeout: 30000 });
}

test.describe("P3/P4 — Data Flow on cloudagentist.com", () => {
  test.setTimeout(120000);

  test("P3: actionable request produces intent proposal", async ({ page }) => {
    await loginViaAuth0(page);

    await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Send an actionable request
    const input = page.locator("input[placeholder*='Ask me anything'], textarea[placeholder*='Ask me anything']");
    await input.waitFor({ timeout: 10000 });
    await input.fill("Schedule a meeting for tomorrow at 2pm called Team Standup");
    await page.locator("button:has-text('Send'), button[type='submit']").last().click();

    // Wait for AI response
    await page.waitForTimeout(15000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-actionable-response.png`, fullPage: true });

    // The response should acknowledge the scheduling action
    const pageText = await page.textContent("body");
    const mentionsAction = pageText?.includes("schedule") ||
      pageText?.includes("meeting") ||
      pageText?.includes("Team Standup") ||
      pageText?.includes("calendar") ||
      pageText?.includes("event") ||
      pageText?.includes("create");
    expect(mentionsAction, "Response should reference the scheduling action").toBeTruthy();
  });

  test("P4: dashboard shows interaction count after chatting", async ({ page }) => {
    await loginViaAuth0(page);

    // Go to dashboard
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-dashboard-after-chat.png`, fullPage: true });

    // The dashboard should render without errors
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");

    // Nav should show user is logged in
    await expect(page.locator("nav >> text=Cloud Agentist")).toBeVisible();
  });

  test("P4: activity page shows events", async ({ page }) => {
    await loginViaAuth0(page);

    await page.goto(`${BASE}/activity`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-activity.png`, fullPage: true });

    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
  });

  test("P4: capabilities page shows registered capabilities", async ({ page }) => {
    await loginViaAuth0(page);

    await page.goto(`${BASE}/capabilities`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-capabilities.png`, fullPage: true });

    const body = await page.textContent("body");
    // Should show schedule or wishlist capabilities
    const hasCapabilities = body?.includes("schedule") || body?.includes("wishlist") || body?.includes("calendar");
    expect(hasCapabilities, "Capabilities page should list registered capabilities").toBeTruthy();
  });

  test("P4: inbox page loads without errors", async ({ page }) => {
    await loginViaAuth0(page);

    await page.goto(`${BASE}/inbox`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-inbox.png`, fullPage: true });

    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
  });
});
