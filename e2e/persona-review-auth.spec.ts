import { test, expect, Page, BrowserContext } from "@playwright/test";
import fs from "fs";

const SCREENSHOT_DIR = "e2e/screenshots/persona-review";

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

// Login helper — goes through Auth0 Universal Login
async function loginViaAuth0(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/auth/login?returnTo=/dashboard", { waitUntil: "commit" });

  // Wait for Auth0 login page
  await page.waitForURL(/auth0\.com|localhost:3100/, { timeout: 15000 });

  if (page.url().includes("auth0.com")) {
    // Fill email
    const emailInput = page.locator("input[name='username'], input[name='email'], input[type='email']");
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill(email);

    // Fill password
    const passwordInput = page.locator("input[name='password'], input[type='password']");
    await passwordInput.fill(password);

    // Click the primary continue button (not Google)
    const submitBtn = page.locator("button[data-action-button-primary='true']");
    await submitBtn.click();

    // Wait for redirect back to app
    await page.waitForURL(/localhost:3100/, { timeout: 30000 });
  }
}

test.describe("Authenticated Pages — 7-Persona Review", () => {
  test.setTimeout(120000);

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Collect errors across all navigation
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!text.includes("favicon") && !text.includes("webpack")) {
          allConsoleErrors.push({ page: page.url(), message: text });
        }
      }
    });
    page.on("response", (res) => {
      if (res.status() >= 400 && !res.url().includes("favicon")) {
        allNetworkErrors.push({ page: page.url(), url: res.url(), status: res.status() });
      }
    });

    // Login
    await loginViaAuth0(page, "test-user-1@example.com", "YuyjM7nRw26CQ@3");
  });

  test.afterAll(async () => {
    // Merge findings with existing report if present
    const existingPath = `${SCREENSHOT_DIR}/persona-review-report.json`;
    let existingFindings: Finding[] = [];
    try {
      const existing = JSON.parse(fs.readFileSync(existingPath, "utf-8"));
      existingFindings = existing.findings || [];
    } catch {}

    const allFindings = [...existingFindings, ...findings];

    // Dedup
    const seen = new Set<string>();
    const deduped = allFindings.filter((f) => {
      const key = `${f.severity}|${f.finding}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    deduped.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

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

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    fs.writeFileSync(`${SCREENSHOT_DIR}/persona-review-auth-report.json`, JSON.stringify(report, null, 2));

    // Markdown
    let md = `# Authenticated Pages — 7-Persona Review\n\n`;
    md += `**Generated:** ${report.timestamp}\n\n`;
    md += `## Summary: ${report.summary.total} findings\n`;
    md += `Critical: ${report.summary.critical} | High: ${report.summary.high} | Medium: ${report.summary.medium} | Low: ${report.summary.low}\n\n`;
    md += `| # | Severity | Page | Persona | Finding |\n|---|----------|------|---------|---------|\n`;
    deduped.forEach((f, i) => {
      md += `| ${i + 1} | ${f.severity.toUpperCase()} | ${f.page} | ${f.persona} | ${f.finding} |\n`;
    });
    md += `\n## Console Errors (${allConsoleErrors.length})\n`;
    for (const e of allConsoleErrors.slice(0, 20)) {
      md += `- ${e.message.substring(0, 150)}\n`;
    }
    md += `\n## Network Errors (${allNetworkErrors.length})\n`;
    for (const e of allNetworkErrors.slice(0, 20)) {
      md += `- ${e.status} ${e.url.substring(0, 120)}\n`;
    }
    fs.writeFileSync(`${SCREENSHOT_DIR}/persona-review-auth-report.md`, md);

    await context.close();
  });

  // ─── Dashboard ───────────────────────────────────────────────
  test("Dashboard review", async () => {
    const start = Date.now();
    await page.goto("/dashboard", { waitUntil: "commit" });
    // Wait for page content to appear
    await page.locator("h1, h2, [class*='greeting'], [class*='stat']").first().waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000); // Let async data load
    const loadTime = Date.now() - start;
    pageLoadTimes.push({ page: "/dashboard", ms: loadTime });

    const html = await page.content();
    const text = await page.textContent("body") || "";
    const textLower = text.toLowerCase();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-dashboard-full.png`, fullPage: true });

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-dashboard-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });

    // ── UX ──
    // Check for greeting
    if (!textLower.includes("good morning") && !textLower.includes("good afternoon") &&
        !textLower.includes("good evening") && !textLower.includes("hello") &&
        !textLower.includes("welcome") && !textLower.includes("hi,")) {
      addFinding("/dashboard", "UX", "medium", "No personalized greeting on dashboard");
    }

    // Check for empty states
    if (textLower.includes("no ") && textLower.includes("yet")) {
      // That's fine — empty states exist
    }

    // Check stat cards are present
    const hasStats = textLower.includes("pending") || textLower.includes("interaction") ||
                     textLower.includes("goal") || textLower.includes("fact");
    if (!hasStats) {
      addFinding("/dashboard", "UX", "medium", "Dashboard missing stat cards (pending/interactions/goals/facts)");
    }

    // Check loading skeleton wasn't stuck
    if (html.includes("animate-pulse") && !text.trim()) {
      addFinding("/dashboard", "QA", "high", "Dashboard stuck on loading skeleton — data not loading");
    }

    // ── PO ──
    // Check for onboarding / first-run experience
    // (First test user may have no data)
    if (textLower.includes("get started") || textLower.includes("try asking") || textLower.includes("start a conversation")) {
      // Good — onboarding CTA exists
    }

    // ── End User ──
    if (textLower.includes("actor")) {
      addFinding("/dashboard", "End User", "medium", 'Dashboard uses "actor" terminology — consider "your AI" or "assistant"');
    }

    // ── Security ──
    // Check that user info is displayed
    if (textLower.includes("test-user-1") || textLower.includes("example.com")) {
      addFinding("/dashboard", "Security", "low", "Full email displayed on dashboard — consider showing display name only");
    }

    // ── QA ──
    if (loadTime > 5000) {
      addFinding("/dashboard", "QA", "medium", `Dashboard load time ${loadTime}ms — slow for returning users`);
    }
  });

  // ─── Chat ───────────────────────────────────────────────────
  test("Chat page review", async () => {
    const start = Date.now();
    await page.goto("/chat", { waitUntil: "commit" });
    await page.waitForTimeout(3000); // Let chat load
    const loadTime = Date.now() - start;
    pageLoadTimes.push({ page: "/chat", ms: loadTime });

    const html = await page.content();
    const text = await page.textContent("body") || "";
    const textLower = text.toLowerCase();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-chat-full.png`, fullPage: true });

    // ── UX ──
    // Check for input area
    const hasInput = html.includes("<textarea") || html.includes("<input");
    if (!hasInput) {
      addFinding("/chat", "UX", "critical", "No text input/textarea on chat page — users can't type");
    }

    // Check for suggestion chips
    if (textLower.includes("schedule") || textLower.includes("wishlist") || textLower.includes("what can")) {
      // Good — suggestion chips present
    } else {
      addFinding("/chat", "UX", "medium", "No suggestion chips visible — new users don't know what to try");
    }

    // Check for placeholder text in input
    if (!html.includes("placeholder")) {
      addFinding("/chat", "UX", "low", "Chat input has no placeholder text — add hint like 'Ask me anything...'");
    }

    // ── End User ──
    // Try clicking a suggestion chip if available
    const chipLocator = page.locator("button:has-text('schedule'), button:has-text('Schedule'), button:has-text('wishlist'), button:has-text('Wishlist')").first();
    const chipVisible = await chipLocator.isVisible().catch(() => false);
    if (chipVisible) {
      await chipLocator.click();
      await page.waitForTimeout(5000); // Wait for response

      await page.screenshot({ path: `${SCREENSHOT_DIR}/11-chat-after-chip.png`, fullPage: true });

      const afterText = await page.textContent("body") || "";
      // Check if we got a response
      if (!afterText.includes("...") && afterText.length === text.length) {
        addFinding("/chat", "QA", "high", "Suggestion chip click produced no response");
      }
    }

    // ── Security ──
    // Check for XSS in chat input
    // (We won't actually test injection, just check if there's sanitization in the rendering)
    if (html.includes("dangerouslySetInnerHTML")) {
      addFinding("/chat", "Security", "high", "Chat uses dangerouslySetInnerHTML — potential XSS risk");
    }

    // ── PO ──
    // Check for message history persistence indicator
    if (textLower.includes("previous") || textLower.includes("history") || textLower.includes("earlier")) {
      // Good — history is mentioned
    }

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-chat-mobile.png`, fullPage: true });

    // Check if input is visible on mobile without scrolling
    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible().catch(() => false)) {
      const box = await textarea.boundingBox();
      if (box && box.y > 700) {
        addFinding("/chat", "UX", "medium", "Chat input not visible above fold on mobile — requires scrolling to type");
      }
    }

    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ─── Inbox ──────────────────────────────────────────────────
  test("Inbox page review", async () => {
    const start = Date.now();
    await page.goto("/inbox", { waitUntil: "commit" });
    await page.waitForTimeout(3000);
    const loadTime = Date.now() - start;
    pageLoadTimes.push({ page: "/inbox", ms: loadTime });

    const html = await page.content();
    const text = await page.textContent("body") || "";
    const textLower = text.toLowerCase();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-inbox-full.png`, fullPage: true });

    // ── UX ──
    // Check for clear empty state
    if (textLower.includes("all clear") || textLower.includes("no pending") || textLower.includes("nothing to")) {
      // Good empty state
    } else if (!textLower.includes("approve") && !textLower.includes("deny")) {
      addFinding("/inbox", "UX", "medium", "Inbox shows neither approvals nor clear empty state");
    }

    // Check for section headers
    if (!textLower.includes("pending") && !textLower.includes("recent") && !textLower.includes("decision")) {
      addFinding("/inbox", "UX", "low", "Inbox lacks section headers — users can't distinguish pending vs history");
    }

    // ── PO ──
    // Check for polling indicator
    if (!html.includes("poll") && !html.includes("refresh") && !html.includes("auto")) {
      addFinding("/inbox", "PO", "low", "No auto-refresh indicator — users don't know inbox updates automatically");
    }

    // ── Compliance ──
    // Approval records should show timestamps
    if (textLower.includes("approved") || textLower.includes("denied")) {
      if (!textLower.includes("ago") && !textLower.match(/\d{4}-\d{2}/) && !textLower.includes("today") && !textLower.includes("yesterday")) {
        addFinding("/inbox", "Compliance", "medium", "Approval decisions shown without timestamps — audit trail gap");
      }
    }

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-inbox-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ─── Capabilities (authenticated view) ──────────────────────
  test("Capabilities page (authenticated) review", async () => {
    await page.goto("/capabilities", { waitUntil: "commit" });
    await page.waitForTimeout(2000);

    const html = await page.content();
    const text = await page.textContent("body") || "";

    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-capabilities-auth.png`, fullPage: true });

    // ── UX ──
    // Check sensitivity indicators have labels/tooltips
    if (html.includes("sensitivity") || html.includes("Sensitivity")) {
      // Good — sensitivity is labeled
    } else {
      // Check for colored badges without explanation
      const badges = await page.locator("[class*='badge'], [class*='pill']").count().catch(() => 0);
      if (badges > 0) {
        addFinding("/capabilities", "UX", "medium", "Capability sensitivity badges have no tooltip/legend explaining levels");
      }
    }

    // ── End User ──
    // "actor" terminology
    if (text.includes("your actor")) {
      addFinding("/capabilities", "End User", "medium", '"What can your actor do?" heading uses platform jargon — try "What can your AI do?"');
    }
  });

  // ─── Memories ───────────────────────────────────────────────
  test("Memories page review", async () => {
    const start = Date.now();
    await page.goto("/memories", { waitUntil: "commit" });
    await page.waitForTimeout(3000);
    const loadTime = Date.now() - start;
    pageLoadTimes.push({ page: "/memories", ms: loadTime });

    const html = await page.content();
    const text = await page.textContent("body") || "";
    const textLower = text.toLowerCase();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-memories-full.png`, fullPage: true });

    // ── UX ──
    // Check for add memory form
    if (html.includes("<textarea") || html.includes("Add") || textLower.includes("add a goal")) {
      // Good — can add memories
    } else {
      addFinding("/memories", "UX", "medium", "No visible way to add memories/goals from the memories page");
    }

    // Check for empty state
    if (textLower.includes("no memories") || textLower.includes("start chatting") || textLower.includes("empty")) {
      // Fine — empty state exists
    }

    // ── Compliance/Privacy ──
    // Check for delete capability
    if (html.includes("delete") || html.includes("Delete") || html.includes("remove") || html.includes("trash")) {
      // Good — deletion available (right to erasure)
    } else {
      addFinding("/memories", "Compliance", "high", "No delete button on memories — users cannot exercise right to erasure");
    }

    // Check for data export
    if (!textLower.includes("export") && !textLower.includes("download")) {
      addFinding("/memories", "Compliance", "medium", "No data export option on memories page — GDPR portability gap");
    }

    // ── Security ──
    // Memory content should be sanitized
    if (html.includes("dangerouslySetInnerHTML")) {
      addFinding("/memories", "Security", "high", "Memories rendered with dangerouslySetInnerHTML — XSS risk if memory content is user-influenced");
    }

    // ── PO ──
    // Check for memory categories
    if (textLower.includes("goal") || textLower.includes("preference") || textLower.includes("fact") || textLower.includes("experience")) {
      // Good — categorized
    } else {
      addFinding("/memories", "PO", "low", "Memories not categorized — harder for users to understand what the AI knows about them");
    }

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-memories-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ─── Activity ───────────────────────────────────────────────
  test("Activity page review", async () => {
    await page.goto("/activity", { waitUntil: "commit" });
    await page.waitForTimeout(3000);

    const html = await page.content();
    const text = await page.textContent("body") || "";
    const textLower = text.toLowerCase();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-activity-full.png`, fullPage: true });

    // ── UX ──
    // Check two-column layout on desktop
    // (We can see this in the screenshot)

    // Check for event type badges
    if (textLower.includes("event") || textLower.includes("recent")) {
      // Good
    } else {
      addFinding("/activity", "UX", "low", "Activity page shows no events — consider a first-run explanation");
    }

    // ── Compliance ──
    // Check for timestamps on events
    if (textLower.includes("ago") || textLower.match(/\d{1,2}:\d{2}/) || textLower.includes("today")) {
      // Good — timestamps present
    }

    // ── QA ──
    // Check if page has any content
    if (text.trim().length < 50) {
      addFinding("/activity", "QA", "medium", "Activity page appears mostly empty — check data loading");
    }
  });

  // ─── Settings ───────────────────────────────────────────────
  test("Settings page review", async () => {
    await page.goto("/settings", { waitUntil: "commit" });
    await page.waitForTimeout(3000);

    const html = await page.content();
    const text = await page.textContent("body") || "";
    const textLower = text.toLowerCase();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/16-settings-full.png`, fullPage: true });

    // ── UX ──
    // Check for profile section
    if (!textLower.includes("profile") && !textLower.includes("account") && !textLower.includes("settings")) {
      addFinding("/settings", "UX", "medium", "Settings page has no clear profile/account section");
    }

    // Check for avatar
    if (html.includes("avatar") || html.includes("img") || html.includes("picture")) {
      // Good
    }

    // ── Security ──
    // Check if actor ID is exposed
    if (html.match(/[a-f0-9]{8}-[a-f0-9]{4}/)) {
      addFinding("/settings", "Security", "low", "Internal actor UUID exposed on settings page — not a risk but may confuse users");
    }

    // Check for session management
    if (!textLower.includes("sign out") && !textLower.includes("log out") && !textLower.includes("logout")) {
      addFinding("/settings", "Security", "medium", "No sign-out option visible on settings page");
    }

    // ── Compliance ──
    // Check for data management links
    if (!textLower.includes("delete") && !textLower.includes("export") && !textLower.includes("download")) {
      addFinding("/settings", "Compliance", "medium", "Settings has no data deletion or export options — GDPR gap");
    }

    // ── PO ──
    // Check for keyboard shortcuts hint
    if (textLower.includes("keyboard") || textLower.includes("shortcut") || textLower.includes("cmd")) {
      // Good — keyboard shortcuts mentioned
    }

    // ── End User ──
    if (textLower.includes("actor id") || textLower.includes("actor type")) {
      addFinding("/settings", "End User", "medium", 'Settings exposes "Actor ID" and "Actor type" — platform jargon, not user-facing concepts');
    }

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/16-settings-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ─── Cross-page checks ──────────────────────────────────────
  test("Cross-page navigation & consistency", async () => {
    // Check nav badge shows on authenticated pages
    await page.goto("/dashboard", { waitUntil: "commit" });
    await page.waitForTimeout(2000);

    const nav = page.locator("nav");
    const navExists = await nav.count();

    if (navExists > 0) {
      // Check Inbox badge
      const inboxLink = nav.locator("a:has-text('Inbox')");
      if (await inboxLink.count() > 0) {
        const badgeNearInbox = await nav.locator("[class*='badge'], [class*='count'], span").count();
        // Badge polling should be working
      }

      // Check active state highlighting
      const activeLinks = await nav.locator("[class*='active'], [aria-current]").count();
      if (activeLinks === 0) {
        addFinding("nav", "UX", "medium", "Nav links don't show active/current state highlighting");
      }
    }

    // ── QA: Test logout flow ──
    const signOutLink = page.locator("a:has-text('Sign out'), a:has-text('Logout'), a[href*='logout']");
    if (await signOutLink.count() > 0) {
      // Don't actually sign out — just verify the link exists and points to auth/logout
      const href = await signOutLink.first().getAttribute("href");
      if (!href?.includes("/auth/logout") && !href?.includes("logout")) {
        addFinding("nav", "QA", "medium", "Sign out link does not point to /auth/logout");
      }
    }
  });
});
