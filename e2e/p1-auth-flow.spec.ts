/**
 * P1 — End-to-end auth flow verification on cloudagentist.com
 *
 * Tests: signup/login → dashboard loads → navigate pages → logout
 */
import { test, expect, Page } from "@playwright/test";

const BASE = "https://cloudagentist.com";
const EMAIL = "globethought.test@gmail.com";
const PASSWORD = "Test#r00r00";

const SCREENSHOT_DIR = "e2e/screenshots/p1-auth";

async function loginViaAuth0(page: Page) {
  await page.goto(`${BASE}/auth/login?returnTo=/dashboard`, { waitUntil: "commit" });

  // Wait for Auth0 login page
  await page.waitForURL(/auth0\.com/, { timeout: 15000 });

  // Step 1: Enter email
  const emailInput = page.locator("input[name='username'], input[name='email'], input[type='email']");
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(EMAIL);

  // Click Continue to proceed to password step
  const continueBtn = page.locator("button[data-action-button-primary='true'], button:has-text('Continue')").first();
  await continueBtn.click();

  // Step 2: Enter password (may be on same page or new screen)
  const passwordInput = page.locator("input[name='password'], input[type='password']");
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill(PASSWORD);

  // Click Continue/Log in to submit
  const submitBtn = page.locator("button[data-action-button-primary='true'], button:has-text('Continue')").first();
  await submitBtn.click();

  // Handle possible scenarios:
  // 1. Redirect back to app (login successful)
  // 2. "Sign up" prompt if account doesn't exist
  // 3. Error message
  try {
    await page.waitForURL(/cloudagentist\.com/, { timeout: 15000 });
  } catch {
    // Check if we need to sign up instead
    const bodyText = await page.textContent("body");
    if (bodyText?.includes("Sign up") && bodyText?.includes("Don't have an account")) {
      // Account doesn't exist — click Sign up
      await page.click("text=Sign up");
      await page.waitForTimeout(2000);

      // Fill signup form
      const signupEmail = page.locator("input[name='email'], input[type='email']");
      await signupEmail.waitFor({ timeout: 5000 });
      await signupEmail.fill(EMAIL);

      const signupPassword = page.locator("input[name='password'], input[type='password']");
      await signupPassword.fill(PASSWORD);

      const signupBtn = page.locator("button[data-action-button-primary='true'], button:has-text('Continue')").first();
      await signupBtn.click();

      // May need to accept terms or authorize
      await page.waitForURL(/cloudagentist\.com|authorize/, { timeout: 30000 });
      if (page.url().includes("authorize")) {
        // Accept consent screen if shown
        const acceptBtn = page.locator("button:has-text('Accept'), button:has-text('Allow')");
        if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await acceptBtn.click();
        }
        await page.waitForURL(/cloudagentist\.com/, { timeout: 15000 });
      }
    } else {
      // Take diagnostic screenshot
      await page.screenshot({ path: `${SCREENSHOT_DIR}/login-error.png` });
      throw new Error(`Login failed. Page shows: ${bodyText?.substring(0, 200)}`);
    }
  }
}

test.describe("P1 — Auth Flow on cloudagentist.com", () => {
  test.setTimeout(120000);

  test("landing page loads", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole("heading", { name: "Cloud Agentist" })).toBeVisible();
    await expect(page.locator("text=Get started")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-landing.png`, fullPage: true });
  });

  test("login → dashboard", async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: { url: string; status: number }[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        networkErrors.push({ url: res.url(), status: res.status() });
      }
    });

    await loginViaAuth0(page);

    // Should be on /dashboard after login
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-dashboard.png`, fullPage: true });

    // Dashboard should show user greeting (not "Application error")
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("server-side exception");

    // Should show nav with Cloud Agentist branding
    await expect(page.locator("nav >> text=Cloud Agentist")).toBeVisible();

    // Log any errors for debugging
    if (consoleErrors.length > 0) {
      console.log("Console errors on dashboard:", consoleErrors);
    }
    if (networkErrors.length > 0) {
      console.log("Network errors on dashboard:", networkErrors);
    }
  });

  test("navigate authenticated pages", async ({ page }) => {
    const pageErrors: Record<string, string[]> = {};

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const current = new URL(page.url()).pathname;
        if (!pageErrors[current]) pageErrors[current] = [];
        pageErrors[current].push(msg.text());
      }
    });

    await loginViaAuth0(page);
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    const pages = [
      { path: "/chat", expect: "suggestion chip or input" },
      { path: "/inbox", expect: "inbox content" },
      { path: "/capabilities", expect: "capabilities list" },
      { path: "/memories", expect: "memories page" },
      { path: "/activity", expect: "activity feed" },
      { path: "/settings", expect: "settings page" },
    ];

    for (const p of pages) {
      await page.goto(`${BASE}${p.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000); // Allow SSR content to render
      const name = p.path.replace("/", "");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03-${name}.png`, fullPage: true });

      // Page should not show server error
      const body = await page.textContent("body");
      expect(body, `${p.path} should not show server error`).not.toContain("Application error");
      expect(body, `${p.path} should not show server error`).not.toContain("server-side exception");

      // Nav should still be visible (session persists)
      await expect(page.locator("nav >> text=Cloud Agentist")).toBeVisible();
    }

    // Report errors per page
    for (const [path, errors] of Object.entries(pageErrors)) {
      if (errors.length > 0) {
        console.log(`Console errors on ${path}:`, errors);
      }
    }
  });

  test("logout → redirect to landing", async ({ page }) => {
    await loginViaAuth0(page);
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    // Click sign out
    await page.click("text=Sign out");

    // Should redirect to landing page (or Auth0 logout then landing)
    await page.waitForURL(/cloudagentist\.com\/?$|auth0\.com.*logout/, { timeout: 15000 });

    // If redirected to Auth0 logout, wait for final redirect
    if (page.url().includes("auth0.com")) {
      await page.waitForURL(/cloudagentist\.com/, { timeout: 15000 });
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-logged-out.png`, fullPage: true });

    // Should see landing page, not dashboard
    const body = await page.textContent("body");
    expect(body).toContain("Get started");
  });
});
