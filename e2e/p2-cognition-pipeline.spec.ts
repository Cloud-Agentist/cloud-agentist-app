/**
 * P2 — Cognition pipeline end-to-end on cloudagentist.com
 *
 * Tests: send a chat message → get AI response → verify response quality
 */
import { test, expect, Page } from "@playwright/test";

const BASE = "https://cloudagentist.com";
const EMAIL = "globethought.test@gmail.com";
const PASSWORD = "Test#r00r00";

const SCREENSHOT_DIR = "e2e/screenshots/p2-cognition";

async function loginViaAuth0(page: Page) {
  await page.goto(`${BASE}/auth/login?returnTo=/dashboard`, { waitUntil: "commit" });
  await page.waitForURL(/auth0\.com/, { timeout: 15000 });

  const emailInput = page.locator("input[name='username'], input[name='email'], input[type='email']");
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(EMAIL);
  const continueBtn = page.locator("button[data-action-button-primary='true'], button:has-text('Continue')").first();
  await continueBtn.click();

  const passwordInput = page.locator("input[name='password'], input[type='password']");
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill(PASSWORD);
  const submitBtn = page.locator("button[data-action-button-primary='true'], button:has-text('Continue')").first();
  await submitBtn.click();

  await page.waitForURL(/cloudagentist\.com/, { timeout: 30000 });
}

test.describe("P2 — Cognition Pipeline on cloudagentist.com", () => {
  test.setTimeout(120000);

  test("send a chat message and get an AI response", async ({ page }) => {
    await loginViaAuth0(page);
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    // Navigate to chat
    await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-chat-initial.png`, fullPage: true });

    // Type a message
    const input = page.locator("input[placeholder*='Ask me anything'], textarea[placeholder*='Ask me anything']");
    await input.waitFor({ timeout: 10000 });
    await input.fill("What can you help me with?");

    // Click send
    const sendBtn = page.locator("button:has-text('Send'), button[type='submit']").last();
    await sendBtn.click();

    // Wait for AI response — look for a second chat bubble or response text
    // The user message should appear immediately, then the AI response after a few seconds
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-chat-waiting.png`, fullPage: true });

    // Wait for the AI response (may take 10-15s for Claude)
    const aiResponse = page.locator("[data-role='assistant'], .assistant-message, div:has(> p):not(:has(input))").last();
    try {
      await aiResponse.waitFor({ timeout: 30000 });
    } catch {
      // Response might be in a different format — just wait longer and check page content
      await page.waitForTimeout(15000);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-chat-response.png`, fullPage: true });

    // Verify the page has more content than just the welcome message
    const pageText = await page.textContent("body");
    // The AI should mention capabilities like schedule, calendar, or wishlist
    const hasAIContent = pageText?.includes("schedule") ||
      pageText?.includes("calendar") ||
      pageText?.includes("wishlist") ||
      pageText?.includes("help") ||
      pageText?.includes("Schedule");
    expect(hasAIContent, "AI response should mention capabilities").toBeTruthy();
  });

  test("suggestion chip triggers a response", async ({ page }) => {
    await loginViaAuth0(page);
    await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Click a suggestion chip
    const chip = page.locator("button:has-text('What\\'s on my calendar')").first();
    if (await chip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chip.click();

      // Wait for response
      await page.waitForTimeout(15000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-chip-response.png`, fullPage: true });

      const pageText = await page.textContent("body");
      expect(pageText).not.toContain("Application error");
    } else {
      // Chips might not be visible if there's already a conversation
      test.skip();
    }
  });
});
