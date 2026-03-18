import { test, expect, Page } from "@playwright/test";
import fs from "fs";

const SCREENSHOT_DIR = "e2e/screenshots/persona-review";

// Collector for all findings across pages
interface Finding {
  page: string;
  persona: string;
  severity: "critical" | "high" | "medium" | "low";
  finding: string;
}

const findings: Finding[] = [];
const allConsoleErrors: { page: string; message: string }[] = [];
const allNetworkErrors: { page: string; url: string; status: number }[] = [];
const pageLoadTimes: { page: string; ms: number }[] = [];

function addFinding(page: string, persona: string, severity: Finding["severity"], finding: string) {
  findings.push({ page, persona, severity, finding });
}

test.describe("7-Persona LifeLift Review", () => {
  test.setTimeout(60000);
  // ─── Landing Page (public) ───────────────────────────────────
  test("Landing Page review", async ({ page }) => {
    const errors: string[] = [];
    const networkErrors: { url: string; status: number }[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
        allConsoleErrors.push({ page: "/", message: msg.text() });
      }
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        networkErrors.push({ url: res.url(), status: res.status() });
        allNetworkErrors.push({ page: "/", url: res.url(), status: res.status() });
      }
    });

    await page.context().clearCookies();
    const start = Date.now();
    const initialResponse = await page.goto("/", { waitUntil: "commit" });
    await page.locator("h1").waitFor({ timeout: 15000 });
    const loadTime = Date.now() - start;
    pageLoadTimes.push({ page: "/", ms: loadTime });

    // Grab HTML + text once to avoid repeated locator queries that hang with HMR
    const html = await page.content();
    const pageText = await page.textContent("body");
    const htmlLower = html.toLowerCase();
    const textLower = pageText?.toLowerCase() || "";

    // Screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-landing-full.png`, fullPage: true });

    // Response headers (synchronous, no page interaction needed)
    const headers = initialResponse?.headers() || {};

    // ── UX Persona ──
    if (html.includes("<img") && !html.match(/<img[^>]+alt="/)) {
      addFinding("/", "UX", "medium", "Image(s) missing alt text for accessibility");
    }
    const h1Matches = html.match(/<h1[\s>]/g);
    if (!h1Matches || h1Matches.length !== 1) {
      addFinding("/", "UX", "medium", `Landing page has ${h1Matches?.length || 0} h1 elements (should be exactly 1)`);
    }
    if (!html.includes("<main")) {
      addFinding("/", "UX", "medium", "No <main> landmark element — poor a11y structure");
    }

    // ── Product Owner Persona ──
    if (!textLower.includes("lifelift")) {
      addFinding("/", "PO", "high", "Hero heading does not contain product name");
    }
    if (!htmlLower.includes('href="/auth/login') && !htmlLower.includes("href=\"/signup")) {
      addFinding("/", "PO", "critical", "No sign-up/login CTA on landing page");
    }

    // SEO
    const title = await page.title();
    if (!title || title === "Create Next App" || title.length < 5) {
      addFinding("/", "PO", "medium", `Page title is generic or missing: "${title}"`);
    }
    if (!htmlLower.includes('meta name="description"')) {
      addFinding("/", "PO", "low", "No meta description tag — poor SEO");
    }
    if (!htmlLower.includes('property="og:image"')) {
      addFinding("/", "PO", "low", "No Open Graph image — poor social sharing appearance");
    }

    // ── End User Persona ──
    const jargonTerms = ["cognition", "actor", "intent", "governance", "embodiment", "faculty"];
    for (const term of jargonTerms) {
      if (textLower.includes(term)) {
        addFinding("/", "End User", "medium", `Landing page uses platform jargon: "${term}"`);
      }
    }

    // ── Legal Persona ──
    if (!htmlLower.includes('href') || !htmlLower.includes("privacy")) {
      addFinding("/", "Legal", "high", "No privacy policy link on landing page");
    }
    if (!htmlLower.includes("terms")) {
      addFinding("/", "Legal", "high", "No terms of service link on landing page");
    }
    if (!htmlLower.includes("cookie") && !htmlLower.includes("consent")) {
      addFinding("/", "Legal", "medium", "No cookie consent banner detected");
    }
    if (!textLower.includes("ai") && !textLower.includes("artificial intelligence")) {
      addFinding("/", "Legal", "medium", "No AI disclosure on landing page");
    }

    // ── Security Persona ──
    if (!headers["content-security-policy"]) {
      addFinding("/", "Security", "high", "No Content-Security-Policy header");
    }
    if (!headers["x-frame-options"]) {
      addFinding("/", "Security", "medium", "No X-Frame-Options header (clickjacking risk)");
    }
    if (!headers["strict-transport-security"]) {
      addFinding("/", "Security", "medium", "No HSTS header — HTTPS not enforced");
    }
    if (!headers["x-content-type-options"]) {
      addFinding("/", "Security", "medium", "No X-Content-Type-Options header");
    }
    if (!headers["referrer-policy"]) {
      addFinding("/", "Security", "medium", "No Referrer-Policy header");
    }

    // ── Compliance Persona ──
    if (!textLower.includes("data") && !textLower.includes("privacy")) {
      addFinding("/", "Compliance", "medium", "No data handling disclosure on landing page");
    }

    // ── QA Persona ──
    if (loadTime > 3000) {
      addFinding("/", "QA", "high", `Landing page load time ${loadTime}ms exceeds 3s threshold`);
    }
    const realErrors = errors.filter(
      (e) => !e.includes("JWE") && !e.includes("Auth0") && !e.includes("favicon")
    );
    if (realErrors.length > 0) {
      addFinding("/", "QA", "high", `Console errors on landing page: ${realErrors.join("; ").substring(0, 200)}`);
    }
    if (networkErrors.length > 0) {
      addFinding("/", "QA", "high", `Network errors on landing: ${networkErrors.map(e => `${e.status} ${e.url}`).join("; ").substring(0, 200)}`);
    }
    if (htmlLower.includes('href="#"') || htmlLower.includes('href=""')) {
      addFinding("/", "QA", "low", "Dead link(s) found (href='#' or empty)");
    }
  });

  // ─── Capabilities Page (public, no auth required) ───────────
  test("Capabilities Page review", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
        allConsoleErrors.push({ page: "/capabilities", message: msg.text() });
      }
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        allNetworkErrors.push({ page: "/capabilities", url: res.url(), status: res.status() });
      }
    });

    await page.context().clearCookies();
    const start = Date.now();
    await page.goto("/capabilities");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - start;
    pageLoadTimes.push({ page: "/capabilities", ms: loadTime });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-capabilities-full.png`, fullPage: true });

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-capabilities-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });

    const pageText = await page.textContent("body");

    // ── UX ──
    const hasEmptyState = pageText?.includes("No capabilities");
    const hasCapabilities = pageText?.includes("schedule.") || pageText?.includes("wishlist.");
    if (hasEmptyState) {
      addFinding("/capabilities", "UX", "medium", "Empty state shown — no capabilities registered or registry unreachable");
    }

    // ── End User ──
    if (hasCapabilities) {
      // Check if action names are human-readable
      if (pageText?.includes("schedule.event.create") && !pageText?.includes("Schedule")) {
        addFinding("/capabilities", "End User", "medium", "Action IDs shown without human-readable labels");
      }
    }

    // ── PO ──
    // Check for "Try it" affordance
    const tryItLinks = await page.locator("a:has-text('Try it'), button:has-text('Try it'), a:has-text('try')").count();
    if (hasCapabilities && tryItLinks === 0) {
      addFinding("/capabilities", "PO", "low", "No 'Try it' CTAs on capability cards — missed engagement opportunity");
    }

    // ── Security ──
    // Capabilities page is public — is that intentional?
    addFinding("/capabilities", "Security", "low", "Capabilities page accessible without auth — exposes system capabilities to unauthenticated users");

    // ── QA ──
    if (loadTime > 3000) {
      addFinding("/capabilities", "QA", "medium", `Capabilities page load time ${loadTime}ms exceeds 3s threshold`);
    }
    const realErrors = errors.filter(e => !e.includes("JWE") && !e.includes("Auth0") && !e.includes("favicon"));
    if (realErrors.length > 0) {
      addFinding("/capabilities", "QA", "high", `Console errors: ${realErrors.join("; ").substring(0, 200)}`);
    }
  });

  // ─── Auth Flow ───────────────────────────────────────────────
  test("Auth flow review", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.context().clearCookies();

    // Click "Get started" on landing
    await page.goto("/");
    const getStartedLink = page.locator("a", { hasText: "Get started" });
    const href = await getStartedLink.getAttribute("href");

    // Verify it goes to auth
    if (!href?.includes("/auth/login")) {
      addFinding("auth", "QA", "high", "Get started button does not link to /auth/login");
    }

    // Navigate to dashboard (should redirect to Auth0)
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-auth0-login.png`, fullPage: true });

    if (currentUrl.includes("auth0.com")) {
      // ── UX ──
      // Check if Auth0 page loaded properly
      const loginForm = await page.locator("input[name='username'], input[name='email'], input[type='email']").count();
      if (loginForm === 0) {
        addFinding("auth", "UX", "high", "Auth0 login form not rendering — check tenant configuration");
      }

      // ── Security ──
      if (!currentUrl.includes("https://")) {
        addFinding("auth", "Security", "critical", "Auth0 redirect not using HTTPS");
      }

      // Check for PKCE parameters
      if (!currentUrl.includes("code_challenge")) {
        addFinding("auth", "Security", "medium", "Auth flow may not be using PKCE (no code_challenge in URL)");
      }

      // ── End User ──
      // Check if there's social login
      const socialButtons = await page.locator("button[data-provider], a[data-provider], .social-button, [class*='social']").count();
      if (socialButtons === 0) {
        addFinding("auth", "End User", "low", "No social login options — higher friction for signup");
      }

      // ── Compliance ──
      const authPageText = await page.textContent("body");
      if (authPageText && !authPageText.toLowerCase().includes("privacy") && !authPageText.toLowerCase().includes("terms")) {
        addFinding("auth", "Compliance", "medium", "Auth0 login page has no privacy/terms links");
      }
    } else {
      addFinding("auth", "QA", "critical", `Dashboard did not redirect to Auth0 — landed on ${currentUrl}`);
    }

    // Check all protected routes redirect
    const protectedRoutes = ["/chat", "/inbox", "/memories", "/settings", "/activity"];
    for (const route of protectedRoutes) {
      await page.context().clearCookies();
      await page.goto(route);
      await page.waitForTimeout(2000);
      const url = page.url();
      if (!url.includes("auth0.com") && !url.includes("/auth/login") && !url.includes("/inbox")) {
        addFinding("auth", "Security", "critical", `Protected route ${route} accessible without authentication`);
      }
    }

    // ── JWE/session errors ──
    const jweErrors = errors.filter(e => e.includes("JWE") || e.includes("decrypt"));
    if (jweErrors.length > 0) {
      addFinding("auth", "QA", "medium", `JWE/session decryption errors detected (${jweErrors.length} occurrences)`);
    }
  });

  // ─── Authenticated Pages (using cookies from Auth0) ──────────
  // Since we can't programmatically log into Auth0 without credentials,
  // we'll test what we can access and capture the state
  test("Protected pages — unauthenticated state review", async ({ page }) => {
    await page.context().clearCookies();

    // Test each protected page's redirect behavior and timing
    const protectedPages = [
      { path: "/dashboard", name: "Dashboard" },
      { path: "/chat", name: "Chat" },
      { path: "/inbox", name: "Inbox" },
      { path: "/memories", name: "Memories" },
      { path: "/settings", name: "Settings" },
      { path: "/activity", name: "Activity" },
    ];

    for (const pg of protectedPages) {
      await page.context().clearCookies();
      const start = Date.now();
      await page.goto(pg.path);
      await page.waitForTimeout(3000);
      const redirectTime = Date.now() - start;

      if (redirectTime > 5000) {
        addFinding(pg.path, "UX", "medium", `Redirect to login takes ${redirectTime}ms — user sees blank/flash`);
      }

      // Check for flash of protected content before redirect
      const bodyText = await page.textContent("body").catch(() => "");
      if (bodyText && bodyText.length > 100 && !page.url().includes("auth0")) {
        addFinding(pg.path, "Security", "high", `Protected content briefly visible before auth redirect on ${pg.path}`);
      }
    }

    // ── QA: Check /approvals → /inbox redirect ──
    await page.context().clearCookies();
    await page.goto("/approvals");
    await page.waitForTimeout(2000);
    // It should redirect to /inbox (which then redirects to auth)
    const approvalUrl = page.url();
    if (!approvalUrl.includes("/inbox") && !approvalUrl.includes("auth0")) {
      addFinding("/approvals", "QA", "medium", "/approvals did not redirect to /inbox");
    }
  });

  // ─── Nav Structure Review ────────────────────────────────────
  test("Navigation structure review", async ({ page }) => {
    await page.context().clearCookies();
    // Use capabilities page since it doesn't require auth
    await page.goto("/capabilities");
    await page.waitForLoadState("domcontentloaded");

    const nav = page.locator("nav");
    const navExists = await nav.count();

    if (navExists === 0) {
      addFinding("nav", "UX", "high", "No <nav> element found — poor semantic structure");
      return;
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-nav-desktop.png` });

    // ── UX: Check nav items ──
    const expectedLinks = ["Dashboard", "Chat", "Inbox"];
    for (const linkText of expectedLinks) {
      const link = nav.locator(`text=${linkText}`);
      if (await link.count() === 0) {
        addFinding("nav", "UX", "medium", `Nav missing "${linkText}" link`);
      }
    }

    // Check for skip-to-content link (a11y)
    const skipLink = await page.locator("a[href='#main'], a[href='#content'], a:has-text('Skip to')").count();
    if (skipLink === 0) {
      addFinding("nav", "UX", "low", "No skip-to-content link for keyboard/screen-reader users");
    }

    // Check ARIA landmarks
    const mainLandmark = await page.locator("main, [role='main']").count();
    if (mainLandmark === 0) {
      addFinding("nav", "UX", "medium", "No <main> landmark element — poor a11y structure");
    }

    // ── UX: Mobile nav ──
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-nav-mobile.png` });

    // Check for hamburger menu
    const hamburger = await page.locator("button[aria-label*='menu'], button[aria-label*='Menu'], button:has(svg)").count();
    if (hamburger === 0) {
      addFinding("nav", "UX", "medium", "No mobile hamburger menu detected");
    }

    // ── PO: Missing nav items ──
    // Memories and Settings should also be navigable
    const memoriesLink = await page.locator("a[href*='memories'], a:has-text('Memories')").count();
    const settingsLink = await page.locator("a[href*='settings'], a:has-text('Settings')").count();
    if (memoriesLink === 0) {
      addFinding("nav", "PO", "low", "Memories page not discoverable from main nav");
    }
    if (settingsLink === 0) {
      addFinding("nav", "PO", "low", "Settings page not discoverable from main nav on mobile");
    }

    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ─── Performance & SEO Basics ────────────────────────────────
  // SEO and security header checks are performed inline in the Landing Page test above

  // ─── 404 / Error Page ────────────────────────────────────────
  test("Error handling review", async ({ page }) => {
    await page.context().clearCookies();

    // Hit a non-existent route
    const response = await page.goto("/nonexistent-page-xyz");
    await page.waitForLoadState("domcontentloaded");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-404-page.png`, fullPage: true });

    const status = response?.status();
    if (status !== 404) {
      addFinding("/404", "QA", "medium", `Non-existent page returned ${status} instead of 404`);
    }

    const bodyText = await page.textContent("body");
    if (bodyText?.includes("Application error") || bodyText?.includes("Internal Server Error")) {
      addFinding("/404", "QA", "high", "Non-existent page shows server error instead of friendly 404");
    }

    // ── UX ──
    const hasHomeLink = await page.locator("a[href='/'], a:has-text('home'), a:has-text('Home')").count();
    if (hasHomeLink === 0 && status === 404) {
      addFinding("/404", "UX", "low", "404 page has no link back to home");
    }
  });

  // ─── Write Report ────────────────────────────────────────────
  test.afterAll(async () => {
    // Deduplicate findings
    const seen = new Set<string>();
    const deduped = findings.filter((f) => {
      const key = `${f.severity}|${f.finding}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by severity
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    deduped.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Build report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: deduped.length,
        critical: deduped.filter((f) => f.severity === "critical").length,
        high: deduped.filter((f) => f.severity === "high").length,
        medium: deduped.filter((f) => f.severity === "medium").length,
        low: deduped.filter((f) => f.severity === "low").length,
      },
      pageLoadTimes,
      consoleErrors: allConsoleErrors.length,
      networkErrors: allNetworkErrors.length,
      findings: deduped,
      consoleErrorDetails: allConsoleErrors,
      networkErrorDetails: allNetworkErrors,
    };

    // Write JSON report
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    fs.writeFileSync(
      `${SCREENSHOT_DIR}/persona-review-report.json`,
      JSON.stringify(report, null, 2)
    );

    // Write markdown report
    let md = `# 7-Persona LifeLift Review Report\n\n`;
    md += `**Generated:** ${report.timestamp}\n\n`;
    md += `## Summary\n\n`;
    md += `| Severity | Count |\n|----------|-------|\n`;
    md += `| Critical | ${report.summary.critical} |\n`;
    md += `| High | ${report.summary.high} |\n`;
    md += `| Medium | ${report.summary.medium} |\n`;
    md += `| Low | ${report.summary.low} |\n`;
    md += `| **Total** | **${report.summary.total}** |\n\n`;

    md += `## Page Load Times\n\n`;
    for (const plt of pageLoadTimes) {
      md += `- ${plt.page}: ${plt.ms}ms\n`;
    }
    md += `\n`;

    md += `## Findings (Prioritized Backlog)\n\n`;
    md += `| # | Severity | Page | Persona | Finding |\n`;
    md += `|---|----------|------|---------|---------|\n`;
    deduped.forEach((f, i) => {
      md += `| ${i + 1} | ${f.severity.toUpperCase()} | ${f.page} | ${f.persona} | ${f.finding} |\n`;
    });

    md += `\n## Console Errors\n\n`;
    if (allConsoleErrors.length === 0) {
      md += `None detected.\n`;
    } else {
      for (const e of allConsoleErrors) {
        md += `- **${e.page}**: ${e.message.substring(0, 150)}\n`;
      }
    }

    md += `\n## Network Errors\n\n`;
    if (allNetworkErrors.length === 0) {
      md += `None detected.\n`;
    } else {
      for (const e of allNetworkErrors) {
        md += `- **${e.page}**: ${e.status} ${e.url}\n`;
      }
    }

    fs.writeFileSync(`${SCREENSHOT_DIR}/persona-review-report.md`, md);
  });
});
