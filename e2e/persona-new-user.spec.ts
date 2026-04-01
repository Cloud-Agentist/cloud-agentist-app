import { test, expect, Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "e2e/screenshots/persona-new-user";
const BASE_URL = "https://cloudagentist.com";

// Ensure screenshot directory exists
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

interface Finding {
  page: string;
  expected: string;
  actual: string;
  severity: "critical" | "high" | "medium" | "low";
  screenshot: string;
}

const findings: Finding[] = [];

function addFinding(
  page: string,
  expected: string,
  actual: string,
  severity: Finding["severity"],
  screenshot: string
) {
  findings.push({ page, expected, actual, severity, screenshot });
}

async function screenshot(page: Page, name: string): Promise<string> {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function loginViaAuth0(page: Page) {
  await page.goto(`${BASE_URL}/auth/login?returnTo=/dashboard`, {
    waitUntil: "commit",
  });
  await page.waitForURL(/auth0\.com/, { timeout: 15000 });
  const emailInput = page.locator(
    "input[name='username'], input[name='email'], input[type='email']"
  );
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill("globethought.test@gmail.com");
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
  await passwordInput.fill("Test#r00r00");
  await page
    .locator(
      "button[data-action-button-primary='true'], button:has-text('Continue')"
    )
    .first()
    .click();
  await page.waitForURL(/cloudagentist\.com/, { timeout: 30000 });
}

test.describe("New User Persona - Full Onboarding Journey", () => {
  test.setTimeout(120000);

  // ─── 1. Landing Page First Impression ───────────────────────────
  test("1. Landing page first impression", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await screenshot(page, "01-landing-full");

    // Check for hero / value proposition
    const h1 = page.locator("h1").first();
    const h1Visible = await h1.isVisible().catch(() => false);
    if (!h1Visible) {
      addFinding(
        BASE_URL,
        "Clear H1 headline with value proposition",
        "No H1 visible on landing page",
        "high",
        "01-landing-full.png"
      );
    } else {
      const h1Text = await h1.textContent();
      console.log(`Landing H1: "${h1Text}"`);
    }

    // Check for CTA buttons
    const ctaButtons = page.locator(
      'a:has-text("Sign"), a:has-text("Get Started"), a:has-text("Try"), a:has-text("Login"), a:has-text("Log in"), button:has-text("Sign"), button:has-text("Get Started")'
    );
    const ctaCount = await ctaButtons.count();
    console.log(`CTA buttons found: ${ctaCount}`);
    if (ctaCount === 0) {
      addFinding(
        BASE_URL,
        "Visible CTA buttons (Sign Up, Get Started, etc.)",
        "No CTA buttons found on landing page",
        "high",
        "01-landing-full.png"
      );
    }

    // Check for broken images
    const images = page.locator("img");
    const imgCount = await images.count();
    for (let i = 0; i < imgCount; i++) {
      const img = images.nth(i);
      const naturalWidth = await img.evaluate(
        (el: HTMLImageElement) => el.naturalWidth
      );
      if (naturalWidth === 0) {
        const src = await img.getAttribute("src");
        addFinding(
          BASE_URL,
          `Image "${src}" should load correctly`,
          "Image has naturalWidth=0 (broken)",
          "medium",
          "01-landing-full.png"
        );
      }
    }

    // Check for layout issues - viewport screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await screenshot(page, "01-landing-mobile");
    await page.setViewportSize({ width: 1280, height: 720 });

    // Console errors
    if (consoleErrors.length > 0) {
      addFinding(
        BASE_URL,
        "No console errors on landing page",
        `${consoleErrors.length} console errors: ${consoleErrors.slice(0, 3).join("; ")}`,
        "medium",
        "01-landing-full.png"
      );
    }
  });

  // ─── 2. Sign up / Login Flow ────────────────────────────────────
  test("2. Sign up / login flow", async ({ page }) => {
    // Go to landing page first
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Find and click login/signup link
    const loginLink = page.locator(
      'a:has-text("Sign"), a:has-text("Login"), a:has-text("Log in"), a:has-text("Get Started")'
    ).first();
    const loginLinkVisible = await loginLink.isVisible().catch(() => false);

    if (loginLinkVisible) {
      await loginLink.click();
      await page.waitForTimeout(2000);
      await screenshot(page, "02-login-redirect");
    } else {
      // Try direct navigation
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "commit" });
      await page.waitForTimeout(2000);
      await screenshot(page, "02-login-redirect");
    }

    // Now do full Auth0 login
    await page.goto(`${BASE_URL}/auth/login?returnTo=/dashboard`, {
      waitUntil: "commit",
    });

    try {
      await page.waitForURL(/auth0\.com/, { timeout: 15000 });
      await page.waitForTimeout(1000);
      await screenshot(page, "02-auth0-login-page");

      // Check Auth0 page branding
      const auth0Title = await page.title();
      console.log(`Auth0 page title: "${auth0Title}"`);

      // Check if app name is shown
      const pageText = await page.locator("body").textContent();
      if (
        pageText &&
        !pageText.includes("Cloud Agentist") &&
        !pageText.includes("cloud-agentist")
      ) {
        addFinding(
          "Auth0 Login Page",
          'Auth0 login should show "Cloud Agentist" branding',
          `Auth0 page does not mention Cloud Agentist. Title: "${auth0Title}"`,
          "medium",
          "02-auth0-login-page.png"
        );
      }

      // Fill email
      const emailInput = page.locator(
        "input[name='username'], input[name='email'], input[type='email']"
      );
      await emailInput.waitFor({ timeout: 10000 });
      await emailInput.fill("globethought.test@gmail.com");
      await page
        .locator(
          "button[data-action-button-primary='true'], button:has-text('Continue')"
        )
        .first()
        .click();
      await page.waitForTimeout(1500);
      await screenshot(page, "02-auth0-password-step");

      // Fill password
      const passwordInput = page.locator(
        "input[name='password'], input[type='password']"
      );
      await passwordInput.waitFor({ timeout: 10000 });
      await passwordInput.fill("Test#r00r00");
      await page
        .locator(
          "button[data-action-button-primary='true'], button:has-text('Continue')"
        )
        .first()
        .click();

      await page.waitForURL(/cloudagentist\.com/, { timeout: 30000 });
      await page.waitForTimeout(2000);
      await screenshot(page, "02-post-login-landing");

      const postLoginUrl = page.url();
      console.log(`Post-login URL: ${postLoginUrl}`);
      if (!postLoginUrl.includes("/dashboard")) {
        addFinding(
          postLoginUrl,
          "Should redirect to /dashboard after login",
          `Redirected to ${postLoginUrl} instead`,
          "medium",
          "02-post-login-landing.png"
        );
      }
    } catch (e) {
      await screenshot(page, "02-login-error");
      addFinding(
        "Auth0 Login",
        "Login flow should complete successfully",
        `Login failed: ${(e as Error).message}`,
        "critical",
        "02-login-error.png"
      );
    }
  });

  // ─── 3. Dashboard First-Run ─────────────────────────────────────
  test("3. Dashboard first-run experience", async ({ page }) => {
    await loginViaAuth0(page);
    await page.waitForTimeout(2000);
    await screenshot(page, "03-dashboard-initial");

    const dashUrl = page.url();
    console.log(`Dashboard URL: ${dashUrl}`);

    // Check for onboarding elements
    const bodyText = await page.locator("body").textContent();

    // Check for welcome message or onboarding cards
    const hasWelcome =
      bodyText?.toLowerCase().includes("welcome") ||
      bodyText?.toLowerCase().includes("get started") ||
      bodyText?.toLowerCase().includes("onboarding");
    if (!hasWelcome) {
      addFinding(
        dashUrl,
        "Dashboard should show welcome/onboarding for new users",
        "No welcome message or onboarding guidance found",
        "medium",
        "03-dashboard-initial.png"
      );
    }

    // Check for quick-action cards or feature discovery
    const cards = page.locator('[class*="card"], [class*="Card"]');
    const cardCount = await cards.count();
    console.log(`Dashboard cards found: ${cardCount}`);

    // Check if there are helpful labels/descriptions
    const headings = page.locator("h2, h3");
    const headingCount = await headings.count();
    for (let i = 0; i < headingCount; i++) {
      const text = await headings.nth(i).textContent();
      console.log(`Dashboard heading ${i}: "${text}"`);
    }

    // Check for any error states
    const errorElements = page.locator(
      '[class*="error"], [class*="Error"], [role="alert"]'
    );
    const errorCount = await errorElements.count();
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorElements.nth(i).textContent();
        addFinding(
          dashUrl,
          "No errors on dashboard",
          `Error element found: "${errorText}"`,
          "high",
          "03-dashboard-initial.png"
        );
      }
    }

    // Scroll and capture more
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, "03-dashboard-scrolled");
  });

  // ─── 4. Chat First Message ──────────────────────────────────────
  test("4. Chat first message", async ({ page }) => {
    await loginViaAuth0(page);

    // Navigate to chat
    await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await screenshot(page, "04-chat-empty");

    // Look for the chat input
    const chatInput = page.locator(
      'textarea, input[type="text"][placeholder*="message" i], input[type="text"][placeholder*="chat" i], input[placeholder*="type" i], textarea[placeholder*="message" i]'
    );
    const chatInputVisible = await chatInput.first().isVisible().catch(() => false);

    if (!chatInputVisible) {
      // Maybe chat is on dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    const inputLocator = page.locator(
      'textarea, input[placeholder*="message" i], input[placeholder*="type" i], input[placeholder*="chat" i]'
    ).first();
    const inputVisible = await inputLocator.isVisible().catch(() => false);

    if (!inputVisible) {
      addFinding(
        `${BASE_URL}/chat`,
        "Chat input should be visible",
        "Could not find chat input field",
        "high",
        "04-chat-empty.png"
      );
      return;
    }

    // Type hello
    await inputLocator.fill("hello");
    await screenshot(page, "04-chat-typed-hello");

    // Submit - try Enter key or send button
    const sendButton = page.locator(
      'button[type="submit"], button:has-text("Send"), button[aria-label*="send" i]'
    ).first();
    const sendVisible = await sendButton.isVisible().catch(() => false);

    if (sendVisible) {
      await sendButton.click();
    } else {
      await inputLocator.press("Enter");
    }

    // Wait for response
    await page.waitForTimeout(10000);
    await screenshot(page, "04-chat-response");

    // Check if there's a response
    const messages = page.locator(
      '[class*="message" i], [class*="Message"], [class*="chat" i], [class*="bubble" i], [role="log"] > *'
    );
    const msgCount = await messages.count();
    console.log(`Chat messages visible: ${msgCount}`);

    if (msgCount < 2) {
      // Check for any loading or error indicators
      const bodyText = await page.locator("body").textContent();
      if (bodyText?.toLowerCase().includes("error")) {
        addFinding(
          `${BASE_URL}/chat`,
          "Chat should respond to 'hello'",
          "Error state detected in chat",
          "high",
          "04-chat-response.png"
        );
      } else {
        addFinding(
          `${BASE_URL}/chat`,
          "Chat should show at least 2 messages (user + bot response)",
          `Only ${msgCount} message elements found`,
          "medium",
          "04-chat-response.png"
        );
      }
    }
  });

  // ─── 5. Suggestion Chips ───────────────────────────────────────
  test("5. Suggestion chips interaction", async ({ page }) => {
    await loginViaAuth0(page);
    await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Also check dashboard for chips
    if (
      !(await page
        .locator('button[class*="chip" i], button[class*="suggest" i], [class*="chip" i] button, [class*="suggestion" i]')
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    await screenshot(page, "05-suggestion-chips-before");

    // Look for suggestion chips / quick actions
    const chips = page.locator(
      'button[class*="chip" i], button[class*="suggest" i], [class*="chip" i], [class*="suggestion" i] button, [class*="quick" i] button'
    );
    const chipCount = await chips.count();
    console.log(`Suggestion chips found: ${chipCount}`);

    if (chipCount === 0) {
      addFinding(
        page.url(),
        "Suggestion chips should be present for new user guidance",
        "No suggestion chips found on chat or dashboard",
        "medium",
        "05-suggestion-chips-before.png"
      );
      return;
    }

    // Click first chip
    const firstChip = chips.first();
    const chipText = await firstChip.textContent();
    console.log(`Clicking chip: "${chipText}"`);
    await firstChip.click();
    await page.waitForTimeout(5000);
    await screenshot(page, "05-suggestion-chips-after");
  });

  // ─── 6. Navigation Discovery ───────────────────────────────────
  test("6. Navigation discovery", async ({ page }) => {
    await loginViaAuth0(page);
    await page.waitForTimeout(2000);

    // Check for main navigation
    const nav = page.locator("nav, [role='navigation']").first();
    const navVisible = await nav.isVisible().catch(() => false);
    await screenshot(page, "06-nav-overview");

    if (!navVisible) {
      // Check for hamburger / mobile nav
      const hamburger = page.locator(
        'button[aria-label*="menu" i], button[class*="hamburger" i], button[class*="menu" i]'
      );
      if (await hamburger.first().isVisible().catch(() => false)) {
        await hamburger.first().click();
        await page.waitForTimeout(500);
        await screenshot(page, "06-nav-mobile-menu");
      } else {
        addFinding(
          page.url(),
          "Navigation should be visible or accessible via menu",
          "No nav element or hamburger menu found",
          "high",
          "06-nav-overview.png"
        );
      }
    }

    // Collect all nav links
    const navLinks = page.locator("nav a, [role='navigation'] a, aside a");
    const linkCount = await navLinks.count();
    console.log(`Navigation links found: ${linkCount}`);
    const linkTexts: string[] = [];
    for (let i = 0; i < linkCount; i++) {
      const text = await navLinks.nth(i).textContent();
      const href = await navLinks.nth(i).getAttribute("href");
      linkTexts.push(`"${text?.trim()}" -> ${href}`);
    }
    console.log("Nav links:", linkTexts.join(", "));

    // Try to navigate to key pages
    const keyPages = ["/dashboard", "/chat", "/activity", "/approvals"];
    for (const pagePath of keyPages) {
      await page.goto(`${BASE_URL}${pagePath}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(1500);
      const status = page.url();
      await screenshot(page, `06-nav-${pagePath.replace("/", "")}`);

      // Check for 404 or error pages
      const bodyText = await page.locator("body").textContent();
      if (
        bodyText?.includes("404") ||
        bodyText?.includes("not found") ||
        bodyText?.toLowerCase().includes("page not found")
      ) {
        addFinding(
          `${BASE_URL}${pagePath}`,
          `${pagePath} should be a valid page`,
          "Got 404 / not found",
          "high",
          `06-nav-${pagePath.replace("/", "")}.png`
        );
      }
    }
  });

  // ─── 7. Empty States ───────────────────────────────────────────
  test("7. Empty states for data pages", async ({ page }) => {
    await loginViaAuth0(page);

    const emptyPages = [
      { path: "/memories", name: "memories" },
      { path: "/activity", name: "activity" },
      { path: "/inbox", name: "inbox" },
      { path: "/approvals", name: "approvals" },
    ];

    for (const { path: pagePath, name } of emptyPages) {
      await page.goto(`${BASE_URL}${pagePath}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(2000);
      await screenshot(page, `07-empty-${name}`);

      const bodyText = await page.locator("body").textContent();
      const url = page.url();

      // Check if redirected away (might not be a valid route)
      if (!url.includes(pagePath)) {
        addFinding(
          `${BASE_URL}${pagePath}`,
          `${pagePath} should be a valid page`,
          `Redirected to ${url}`,
          "medium",
          `07-empty-${name}.png`
        );
        continue;
      }

      // Check for helpful empty state
      const hasEmptyState =
        bodyText?.toLowerCase().includes("no ") ||
        bodyText?.toLowerCase().includes("empty") ||
        bodyText?.toLowerCase().includes("nothing") ||
        bodyText?.toLowerCase().includes("get started") ||
        bodyText?.toLowerCase().includes("you don't have");

      // Check for error states
      if (bodyText?.includes("500") || bodyText?.toLowerCase().includes("server error")) {
        addFinding(
          `${BASE_URL}${pagePath}`,
          `${pagePath} should show empty state, not error`,
          "Server error displayed",
          "critical",
          `07-empty-${name}.png`
        );
      }

      console.log(`${name}: empty state present=${hasEmptyState}, url=${url}`);
    }
  });

  // ─── 8. Footer Links (Privacy & Terms) ─────────────────────────
  test("8. Footer links - Privacy and Terms", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, "08-footer");

    // Check for Privacy Policy link
    const privacyLink = page.locator(
      'a:has-text("Privacy"), a[href*="privacy"]'
    ).first();
    const privacyVisible = await privacyLink.isVisible().catch(() => false);

    if (!privacyVisible) {
      addFinding(
        BASE_URL,
        "Privacy Policy link should be in footer",
        "No Privacy Policy link found",
        "high",
        "08-footer.png"
      );
    } else {
      // Dismiss any fixed banner overlaying the footer (e.g. cookie consent)
      const fixedBanner = page.locator("div.fixed.bottom-0");
      if (await fixedBanner.isVisible().catch(() => false)) {
        // Try clicking accept/dismiss button inside it
        const dismissBtn = fixedBanner.locator("button").first();
        if (await dismissBtn.isVisible().catch(() => false)) {
          await dismissBtn.click();
          await page.waitForTimeout(500);
        } else {
          // Force-hide it via JS
          await fixedBanner.evaluate((el: HTMLElement) => el.style.display = "none");
        }
      }
      await privacyLink.click();
      await page.waitForTimeout(2000);
      await screenshot(page, "08-privacy-page");
      const privacyText = await page.locator("body").textContent();
      if (!privacyText || privacyText.length < 100) {
        addFinding(
          page.url(),
          "Privacy Policy page should have substantive content",
          `Privacy page has only ${privacyText?.length || 0} chars of text`,
          "high",
          "08-privacy-page.png"
        );
      }
      if (privacyText?.includes("Lorem") || privacyText?.includes("TODO")) {
        addFinding(
          page.url(),
          "Privacy Policy should have real content",
          "Placeholder text detected (Lorem/TODO)",
          "high",
          "08-privacy-page.png"
        );
      }
    }

    // Check Terms of Service
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const termsLink = page.locator(
      'a:has-text("Terms"), a[href*="terms"]'
    ).first();
    const termsVisible = await termsLink.isVisible().catch(() => false);

    if (!termsVisible) {
      addFinding(
        BASE_URL,
        "Terms of Service link should be in footer",
        "No Terms of Service link found",
        "high",
        "08-footer.png"
      );
    } else {
      // Dismiss any fixed banner overlaying the footer
      const fixedBanner2 = page.locator("div.fixed.bottom-0");
      if (await fixedBanner2.isVisible().catch(() => false)) {
        const dismissBtn2 = fixedBanner2.locator("button").first();
        if (await dismissBtn2.isVisible().catch(() => false)) {
          await dismissBtn2.click();
          await page.waitForTimeout(500);
        } else {
          await fixedBanner2.evaluate((el: HTMLElement) => el.style.display = "none");
        }
      }
      await termsLink.click();
      await page.waitForTimeout(2000);
      await screenshot(page, "08-terms-page");
      const termsText = await page.locator("body").textContent();
      if (!termsText || termsText.length < 100) {
        addFinding(
          page.url(),
          "Terms of Service page should have substantive content",
          `Terms page has only ${termsText?.length || 0} chars of text`,
          "high",
          "08-terms-page.png"
        );
      }
    }
  });

  // ─── 9. Cookie Banner ──────────────────────────────────────────
  test("9. Cookie banner behavior", async ({ page }) => {
    // Clear cookies to simulate fresh visit
    await page.context().clearCookies();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await screenshot(page, "09-cookie-banner-check");

    // Look for cookie banner
    const cookieBanner = page.locator(
      '[class*="cookie" i], [class*="Cookie"], [class*="consent" i], [id*="cookie" i], [aria-label*="cookie" i], [class*="banner" i]:has-text("cookie")'
    );
    const bannerVisible = await cookieBanner.first().isVisible().catch(() => false);

    if (!bannerVisible) {
      // Also check for GDPR-style banners
      const gdprBanner = page.locator(
        '[class*="gdpr" i], [class*="privacy-banner" i]'
      );
      const gdprVisible = await gdprBanner.first().isVisible().catch(() => false);
      if (!gdprVisible) {
        addFinding(
          BASE_URL,
          "Cookie/consent banner should appear for new visitors",
          "No cookie or consent banner detected",
          "low",
          "09-cookie-banner-check.png"
        );
      }
    } else {
      // Try to accept/dismiss
      const acceptBtn = page.locator(
        'button:has-text("Accept"), button:has-text("OK"), button:has-text("Got it"), button:has-text("Agree")'
      ).first();
      if (await acceptBtn.isVisible().catch(() => false)) {
        await acceptBtn.click();
        await page.waitForTimeout(500);
        await screenshot(page, "09-cookie-banner-dismissed");
        // Check it's gone
        const stillVisible = await cookieBanner.first().isVisible().catch(() => false);
        if (stillVisible) {
          addFinding(
            BASE_URL,
            "Cookie banner should dismiss after accepting",
            "Banner still visible after clicking accept",
            "medium",
            "09-cookie-banner-dismissed.png"
          );
        }
      }
    }
  });

  // ─── 10. Sign Out ──────────────────────────────────────────────
  test("10. Sign out flow", async ({ page }) => {
    await loginViaAuth0(page);
    await page.waitForTimeout(2000);
    await screenshot(page, "10-before-signout");

    // Look for sign out / logout button
    const logoutLocators = [
      page.locator('a:has-text("Sign out"), a:has-text("Log out"), a:has-text("Logout"), a:has-text("Sign Out")'),
      page.locator('button:has-text("Sign out"), button:has-text("Log out"), button:has-text("Logout")'),
      page.locator('a[href*="logout"], a[href*="signout"]'),
    ];

    let logoutFound = false;
    for (const locator of logoutLocators) {
      if (await locator.first().isVisible().catch(() => false)) {
        logoutFound = true;
        await screenshot(page, "10-logout-button-visible");
        await locator.first().click();
        await page.waitForTimeout(3000);
        await screenshot(page, "10-after-signout");

        // Verify we're logged out
        const postLogoutUrl = page.url();
        console.log(`Post-logout URL: ${postLogoutUrl}`);

        // Try to access dashboard - should redirect to login
        await page.goto(`${BASE_URL}/dashboard`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(2000);
        await screenshot(page, "10-post-logout-dashboard-access");
        break;
      }
    }

    if (!logoutFound) {
      // Check for user menu / avatar dropdown
      const userMenu = page.locator(
        'button[class*="avatar" i], button[class*="user" i], button[class*="profile" i], [class*="avatar" i]'
      );
      if (await userMenu.first().isVisible().catch(() => false)) {
        await userMenu.first().click();
        await page.waitForTimeout(500);
        await screenshot(page, "10-user-menu-open");

        // Now look for logout in dropdown
        for (const locator of logoutLocators) {
          if (await locator.first().isVisible().catch(() => false)) {
            logoutFound = true;
            await locator.first().click();
            await page.waitForTimeout(3000);
            await screenshot(page, "10-after-signout");
            break;
          }
        }
      }

      if (!logoutFound) {
        addFinding(
          page.url(),
          "Sign out button should be easily discoverable",
          "Could not find sign out / logout button",
          "high",
          "10-before-signout.png"
        );
      }
    }
  });

  // ─── Final Summary ─────────────────────────────────────────────
  test.afterAll(() => {
    console.log("\n" + "=".repeat(80));
    console.log("NEW USER PERSONA TEST - FINDINGS SUMMARY");
    console.log("=".repeat(80));

    if (findings.length === 0) {
      console.log("No issues found!");
    } else {
      const bySeverity = {
        critical: findings.filter((f) => f.severity === "critical"),
        high: findings.filter((f) => f.severity === "high"),
        medium: findings.filter((f) => f.severity === "medium"),
        low: findings.filter((f) => f.severity === "low"),
      };

      for (const [sev, items] of Object.entries(bySeverity)) {
        if (items.length > 0) {
          console.log(`\n--- ${sev.toUpperCase()} (${items.length}) ---`);
          for (const f of items) {
            console.log(`  Page: ${f.page}`);
            console.log(`  Expected: ${f.expected}`);
            console.log(`  Actual: ${f.actual}`);
            console.log(`  Screenshot: ${f.screenshot}`);
            console.log("");
          }
        }
      }

      console.log(`\nTotal findings: ${findings.length}`);
      console.log(
        `  Critical: ${bySeverity.critical.length}, High: ${bySeverity.high.length}, Medium: ${bySeverity.medium.length}, Low: ${bySeverity.low.length}`
      );
    }

    // Write findings to JSON file
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, "findings.json"),
      JSON.stringify(findings, null, 2)
    );
    console.log(`\nFindings saved to ${SCREENSHOT_DIR}/findings.json`);
    console.log("=".repeat(80));
  });
});
