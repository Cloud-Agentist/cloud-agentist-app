import { test, Page, BrowserContext } from "@playwright/test";

const DIR = "e2e/screenshots/final";

async function loginViaAuth0(page: Page) {
  await page.context().clearCookies();
  await page.goto("/auth/login?returnTo=/dashboard", { waitUntil: "commit" });
  await page.waitForURL(/auth0\.com|localhost:3100/, { timeout: 15000 });
  if (page.url().includes("auth0.com")) {
    await page.locator("input[name='username'], input[name='email'], input[type='email']").first().fill("test-user-1@example.com");
    await page.locator("input[name='password'], input[type='password']").first().fill("YuyjM7nRw26CQ@3");
    await page.locator("button[data-action-button-primary='true']").click();
    await page.waitForURL(/localhost:3100/, { timeout: 30000 });
  }
}

test.describe("Final state screenshots", () => {
  test.setTimeout(120000);
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await loginViaAuth0(page);
  });

  test.afterAll(async () => { await context.close(); });

  test("Capture all pages", async () => {
    // Landing (unauthenticated)
    const page2 = await context.browser()!.newPage();
    await page2.context().clearCookies();
    await page2.goto("http://localhost:3100/", { waitUntil: "commit" });
    await page2.locator("h1").waitFor({ timeout: 10000 });
    await page2.screenshot({ path: `${DIR}/landing.png`, fullPage: true });
    await page2.close();

    // 404
    const page3 = await context.browser()!.newPage();
    await page3.goto("http://localhost:3100/nonexistent-xyz", { waitUntil: "commit" });
    await page3.waitForTimeout(2000);
    await page3.screenshot({ path: `${DIR}/404.png`, fullPage: true });
    await page3.close();

    // Authenticated pages
    const pages = [
      { path: "/dashboard", name: "dashboard" },
      { path: "/chat", name: "chat" },
      { path: "/inbox", name: "inbox" },
      { path: "/capabilities", name: "capabilities" },
      { path: "/memories", name: "memories" },
      { path: "/activity", name: "activity" },
      { path: "/settings", name: "settings" },
    ];

    for (const pg of pages) {
      await page.goto(pg.path, { waitUntil: "commit" });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${DIR}/${pg.name}.png`, fullPage: true });
    }
  });
});
