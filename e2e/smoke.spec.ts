import { test, expect } from "@playwright/test";

test.describe("LifeLift Smoke Tests", () => {

  test("landing page renders correctly", async ({ page }) => {
    await page.goto("/");

    // Title
    await expect(page.locator("h1")).toContainText("LifeLift");

    // Tagline
    await expect(page.locator("text=Your AI that acts")).toBeVisible();

    // Feature cards
    await expect(page.locator("text=Just talk")).toBeVisible();
    await expect(page.locator("text=You're in control")).toBeVisible();
    await expect(page.locator("text=It remembers you")).toBeVisible();

    // CTA buttons
    await expect(page.locator("text=Get started")).toBeVisible();
    await expect(page.locator("text=Sign in")).toBeVisible();

    // Screenshot for visual inspection
    await page.screenshot({ path: "e2e/screenshots/landing.png", fullPage: true });
  });

  test("Get started button links to auth login", async ({ page }) => {
    await page.goto("/");

    const link = page.locator("a", { hasText: "Get started" });
    await expect(link).toBeVisible();

    const href = await link.getAttribute("href");
    expect(href).toContain("/auth/login");
    expect(href).toContain("returnTo=/dashboard");
  });

  test("capabilities page renders with registered actions", async ({ page }) => {
    // Clear cookies first to avoid stale session
    await page.context().clearCookies();
    await page.goto("/capabilities");

    // Should show the page title
    await expect(page.locator("text=What can your AI do")).toBeVisible();

    // Should show at least some capabilities (the page works without auth)
    const capCards = page.locator("text=schedule.event.create");

    // Check if capabilities loaded (may show empty state if registry is down)
    const pageContent = await page.textContent("body");
    const hasCapabilities = pageContent?.includes("schedule.") || pageContent?.includes("wishlist.");
    const hasEmptyState = pageContent?.includes("No capabilities registered");

    expect(hasCapabilities || hasEmptyState).toBeTruthy();

    await page.screenshot({ path: "e2e/screenshots/capabilities.png", fullPage: true });
  });

  test("dashboard redirects to login when unauthenticated", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");

    // Should redirect to Auth0
    await page.waitForURL(/auth0\.com/, { timeout: 10000 });
    expect(page.url()).toContain("auth0.com");
  });

  test("inbox redirects to login when unauthenticated", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/inbox");

    await page.waitForURL(/auth0\.com/, { timeout: 10000 });
    expect(page.url()).toContain("auth0.com");
  });

  test("chat page redirects to login when unauthenticated", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/chat");

    // Should redirect to Auth0
    await page.waitForURL(/auth0\.com/, { timeout: 10000 });
    expect(page.url()).toContain("auth0.com");
  });

  test("approvals page redirects to inbox", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/approvals");

    // Should redirect to /inbox
    await page.waitForURL(/\/inbox/, { timeout: 5000 });
    expect(page.url()).toContain("/inbox");
  });

  test("no console errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("Auth0")) {
        errors.push(msg.text());
      }
    });

    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out expected warnings
    const realErrors = errors.filter(
      (e) => !e.includes("JWE") && !e.includes("Auth0") && !e.includes("favicon")
    );

    expect(realErrors).toEqual([]);
  });

  test("nav bar has correct links", async ({ page }) => {
    await page.context().clearCookies();
    // Use capabilities page (doesn't require auth)
    await page.goto("/capabilities");

    const nav = page.locator("nav");
    await expect(nav.locator("text=Dashboard")).toBeVisible();
    await expect(nav.locator("text=Chat")).toBeVisible();
    await expect(nav.locator("text=Inbox")).toBeVisible();
  });
});
