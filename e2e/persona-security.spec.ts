import { test, expect, Page, Response } from "@playwright/test";
import fs from "fs";

const BASE = "https://cloudagentist.com";
const SCREENSHOT_DIR = "e2e/screenshots/persona-security";

interface Finding {
  id: number;
  classification: "vulnerability" | "weakness" | "informational";
  severity: "critical" | "high" | "medium" | "low" | "info";
  area: string;
  description: string;
  remediation: string;
}

const findings: Finding[] = [];
let findingId = 0;

function addFinding(
  classification: Finding["classification"],
  severity: Finding["severity"],
  area: string,
  description: string,
  remediation: string
) {
  findings.push({ id: ++findingId, classification, severity, area, description, remediation });
}

const allConsoleMessages: { page: string; type: string; text: string }[] = [];

async function loginViaAuth0(page: Page) {
  await page.goto(`${BASE}/auth/login?returnTo=/dashboard`, { waitUntil: "commit" });
  await page.waitForURL(/auth0\.com/, { timeout: 15000 });
  const emailInput = page.locator("input[name='username'], input[name='email'], input[type='email']");
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill("globethought.test@gmail.com");
  await page.locator("button[data-action-button-primary='true'], button:has-text('Continue')").first().click();
  const passwordInput = page.locator("input[name='password'], input[type='password']");
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill("Test#r00r00");
  await page.locator("button[data-action-button-primary='true'], button:has-text('Continue')").first().click();
  await page.waitForURL(/cloudagentist\.com/, { timeout: 30000 });
}

function collectConsole(page: Page, label: string) {
  page.on("console", (msg) => {
    allConsoleMessages.push({ page: label, type: msg.type(), text: msg.text() });
  });
}

test.describe("Security Auditor — Persona Tests", () => {
  test.setTimeout(180000);

  // ─────────────────────────────────────────────────────
  // 1. Security Headers
  // ─────────────────────────────────────────────────────
  test("1 — Security headers on public and authenticated pages", async ({ page }) => {
    const pagesToCheck = [
      { url: `${BASE}/`, label: "home" },
      { url: `${BASE}/privacy`, label: "privacy" },
      { url: `${BASE}/terms`, label: "terms" },
    ];

    const requiredHeaders: Record<string, { header: string; expected?: string }> = {
      "Content-Security-Policy": { header: "content-security-policy" },
      "X-Frame-Options": { header: "x-frame-options", expected: "DENY" },
      "Strict-Transport-Security": { header: "strict-transport-security" },
      "X-Content-Type-Options": { header: "x-content-type-options", expected: "nosniff" },
      "Referrer-Policy": { header: "referrer-policy" },
    };

    for (const pg of pagesToCheck) {
      const response = await page.goto(pg.url, { waitUntil: "domcontentloaded" });
      expect(response).not.toBeNull();
      const headers = response!.headers();

      console.log(`\n=== Headers for ${pg.label} (${pg.url}) ===`);
      for (const [name, { header, expected }] of Object.entries(requiredHeaders)) {
        const value = headers[header];
        if (!value) {
          console.log(`  MISSING: ${name}`);
          addFinding("weakness", "medium", "Security Headers",
            `Missing ${name} header on ${pg.label} page`,
            `Add ${name} header to Next.js config or middleware`);
        } else {
          console.log(`  ${name}: ${value}`);
          if (expected && !value.toUpperCase().includes(expected.toUpperCase())) {
            addFinding("weakness", "low", "Security Headers",
              `${name} on ${pg.label}: expected "${expected}", got "${value}"`,
              `Set ${name} to "${expected}"`);
          }
        }
      }
    }

    // Also check authenticated page headers
    await loginViaAuth0(page);
    const dashResp = await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    if (dashResp) {
      const dashHeaders = dashResp.headers();
      console.log(`\n=== Headers for dashboard (authenticated) ===`);
      for (const [name, { header }] of Object.entries(requiredHeaders)) {
        const value = dashHeaders[header];
        if (!value) {
          console.log(`  MISSING: ${name}`);
          addFinding("weakness", "medium", "Security Headers",
            `Missing ${name} header on authenticated dashboard`,
            `Ensure security headers apply to all routes including authenticated ones`);
        } else {
          console.log(`  ${name}: ${value}`);
        }
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-security-headers.png`, fullPage: true });
  });

  // ─────────────────────────────────────────────────────
  // 2. Auth Protection — unauthenticated access
  // ─────────────────────────────────────────────────────
  test("2 — Protected routes redirect to login when unauthenticated", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    collectConsole(page, "auth-protection");

    const protectedPaths = [
      "/dashboard",
      "/chat",
      "/settings",
      "/memories",
      "/activity",
      "/inbox",
      "/capabilities",
    ];

    for (const path of protectedPaths) {
      console.log(`\nTesting unauthenticated access to ${path}...`);
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });

      // Wait a moment for any client-side redirects
      await page.waitForTimeout(2000);
      const finalUrl = page.url();

      const isProtected =
        finalUrl.includes("auth0.com") ||
        finalUrl.includes("/auth/login") ||
        finalUrl.includes("/api/auth/login") ||
        finalUrl === `${BASE}/`;

      if (!isProtected) {
        // Check if page actually shows content or a login prompt
        const bodyText = await page.textContent("body");
        const hasLoginPrompt = bodyText?.toLowerCase().includes("sign in") || bodyText?.toLowerCase().includes("log in");
        if (!hasLoginPrompt) {
          addFinding("vulnerability", "high", "Auth Protection",
            `${path} is accessible without authentication. Final URL: ${finalUrl}`,
            `Add auth middleware to protect ${path}`);
          console.log(`  FAIL: accessible at ${finalUrl}`);
        } else {
          console.log(`  OK: shows login prompt at ${finalUrl}`);
        }
      } else {
        console.log(`  OK: redirected to ${finalUrl}`);
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-auth-protection.png`, fullPage: true });
    await context.close();
  });

  // ─────────────────────────────────────────────────────
  // 3. Session / Cookie handling
  // ─────────────────────────────────────────────────────
  test("3 — Session cookies are secure", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    collectConsole(page, "session-handling");

    await loginViaAuth0(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });

    const cookies = await context.cookies(BASE);
    console.log(`\n=== Cookies after login (${cookies.length} total) ===`);

    for (const cookie of cookies) {
      console.log(`\n  Cookie: ${cookie.name}`);
      console.log(`    Domain: ${cookie.domain}`);
      console.log(`    Path: ${cookie.path}`);
      console.log(`    HttpOnly: ${cookie.httpOnly}`);
      console.log(`    Secure: ${cookie.secure}`);
      console.log(`    SameSite: ${cookie.sameSite}`);
      console.log(`    Expires: ${cookie.expires === -1 ? "Session" : new Date(cookie.expires * 1000).toISOString()}`);

      // Session cookies should be HttpOnly and Secure
      const isSessionCookie = cookie.name.toLowerCase().includes("session") ||
        cookie.name.toLowerCase().includes("appSession") ||
        cookie.name.includes("__Secure") ||
        cookie.name.includes("next-auth");

      if (isSessionCookie || cookie.name.includes("appSession")) {
        if (!cookie.httpOnly) {
          addFinding("vulnerability", "high", "Session Handling",
            `Session cookie "${cookie.name}" is NOT HttpOnly — accessible to JavaScript`,
            `Set HttpOnly flag on session cookies`);
        }
        if (!cookie.secure) {
          addFinding("vulnerability", "high", "Session Handling",
            `Session cookie "${cookie.name}" is NOT Secure — sent over HTTP`,
            `Set Secure flag on all session cookies`);
        }
        if (cookie.sameSite === "None" || !cookie.sameSite) {
          addFinding("weakness", "medium", "Session Handling",
            `Session cookie "${cookie.name}" has SameSite=${cookie.sameSite || "not set"}`,
            `Set SameSite=Lax or Strict on session cookies`);
        }
      }

      // Any cookie without Secure flag on HTTPS site
      if (!cookie.secure) {
        addFinding("informational", "low", "Session Handling",
          `Cookie "${cookie.name}" is not Secure on HTTPS site`,
          `Consider setting Secure flag on all cookies`);
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-session-cookies.png`, fullPage: true });
    await context.close();
  });

  // ─────────────────────────────────────────────────────
  // 4. XSS in chat
  // ─────────────────────────────────────────────────────
  test("4 — XSS payloads in chat are rendered safely", async ({ page }) => {
    collectConsole(page, "xss-chat");

    await loginViaAuth0(page);
    await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const xssPayloads = [
      "<script>alert('xss')</script>",
      '<img src=x onerror=alert(1)>',
      "[Click me](javascript:alert(1))",
      '<iframe src="https://evil.com"></iframe>',
    ];

    // Set up alert detection
    let alertFired = false;
    page.on("dialog", async (dialog) => {
      alertFired = true;
      addFinding("vulnerability", "critical", "XSS",
        `Alert dialog triggered by XSS payload: "${dialog.message()}"`,
        `Sanitize all user input before rendering in chat`);
      await dialog.dismiss();
    });

    const chatInput = page.locator("textarea, input[type='text']").first();
    const sendButton = page.locator("button:has-text('Send'), button[type='submit']").first();

    for (let i = 0; i < xssPayloads.length; i++) {
      const payload = xssPayloads[i];
      console.log(`\nSending XSS payload ${i + 1}: ${payload}`);

      try {
        await chatInput.waitFor({ timeout: 5000 });
        await chatInput.fill(payload);
        await sendButton.click();
        await page.waitForTimeout(3000);

        // Check for script tags in DOM
        const scriptInDom = await page.evaluate(() => {
          const messages = document.querySelectorAll("[class*='message'], [class*='chat'], [class*='bubble']");
          for (const msg of messages) {
            if (msg.querySelector("script") || msg.querySelector("iframe")) {
              return true;
            }
          }
          return false;
        });

        if (scriptInDom) {
          addFinding("vulnerability", "critical", "XSS",
            `XSS payload rendered as HTML element: ${payload}`,
            `Use proper output encoding; never render raw HTML from user input`);
        }

        // Check for javascript: URLs in links
        const jsLinks = await page.evaluate(() => {
          const links = document.querySelectorAll("a[href^='javascript:']");
          return links.length;
        });

        if (jsLinks > 0) {
          addFinding("vulnerability", "high", "XSS",
            `javascript: URL found in rendered link from payload: ${payload}`,
            `Sanitize href attributes; block javascript: protocol in user content`);
        }
      } catch (e) {
        console.log(`  Could not send payload: ${e}`);
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-xss-payload-${i + 1}.png`, fullPage: true });
    }

    if (!alertFired) {
      console.log("\nNo alert dialogs fired — good sign for XSS protection.");
    }
  });

  // ─────────────────────────────────────────────────────
  // 5. IDOR — API calls with actor IDs
  // ─────────────────────────────────────────────────────
  test("5 — IDOR check on API requests", async ({ page }) => {
    collectConsole(page, "idor");

    const apiCalls: { url: string; method: string; status: number; hasActorId: boolean }[] = [];

    page.on("response", (resp) => {
      const url = resp.url();
      if (url.includes("/api/") || url.includes("a.run.app") || url.includes(":3")) {
        const hasActorId = /actor[_-]?id|actorId/i.test(url) || /\/actors\//.test(url);
        apiCalls.push({ url, method: resp.request().method(), status: resp.status(), hasActorId });
      }
    });

    await loginViaAuth0(page);

    // Visit pages that trigger API calls
    const pagesToVisit = ["/dashboard", "/chat", "/activity", "/memories", "/capabilities", "/inbox"];
    for (const path of pagesToVisit) {
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log(`  Could not visit ${path}: ${e}`);
      }
    }

    console.log(`\n=== API Calls Observed (${apiCalls.length}) ===`);
    for (const call of apiCalls) {
      console.log(`  ${call.method} ${call.url} -> ${call.status} ${call.hasActorId ? "[HAS ACTOR ID]" : ""}`);
    }

    const callsWithActorId = apiCalls.filter(c => c.hasActorId);
    if (callsWithActorId.length > 0) {
      addFinding("weakness", "medium", "IDOR",
        `${callsWithActorId.length} API call(s) include actor IDs in URLs: ${callsWithActorId.map(c => c.url).join(", ")}`,
        `Ensure server-side authorization validates actor ownership, not just presence of an ID`);
    } else {
      console.log("\nNo actor IDs observed in API URLs — may use session-based lookup.");
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-idor-api.png`, fullPage: true });
  });

  // ─────────────────────────────────────────────────────
  // 6. API / Internal URL exposure
  // ─────────────────────────────────────────────────────
  test("6 — No internal service URLs leaked to browser", async ({ page }) => {
    collectConsole(page, "api-exposure");

    const leakedUrls: { page: string; url: string; context: string }[] = [];

    await loginViaAuth0(page);

    const pagesToCheck = ["/dashboard", "/chat", "/settings", "/activity"];
    for (const path of pagesToCheck) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(2000);

      // Check page source for internal URLs
      const pageContent = await page.content();

      const internalPatterns = [
        /[\w-]+\.a\.run\.app/g,
        /localhost:\d{4}/g,
        /127\.0\.0\.1:\d{4}/g,
        /0\.0\.0\.0:\d{4}/g,
        /internal[\w.-]*\.svc\.cluster/g,
      ];

      for (const pattern of internalPatterns) {
        const matches = pageContent.match(pattern);
        if (matches) {
          for (const match of [...new Set(matches)]) {
            leakedUrls.push({ page: path, url: match, context: "page source" });
          }
        }
      }

      // Also check all loaded scripts
      const scriptContents = await page.evaluate(() => {
        const scripts = document.querySelectorAll("script");
        return Array.from(scripts).map(s => s.textContent || "").join("\n");
      });

      for (const pattern of internalPatterns) {
        const matches = scriptContents.match(pattern);
        if (matches) {
          for (const match of [...new Set(matches)]) {
            leakedUrls.push({ page: path, url: match, context: "inline script" });
          }
        }
      }
    }

    console.log(`\n=== Internal URL Exposure ===`);
    if (leakedUrls.length > 0) {
      for (const leak of leakedUrls) {
        console.log(`  LEAKED on ${leak.page} (${leak.context}): ${leak.url}`);
      }
      // Deduplicate by URL
      const uniqueUrls = [...new Set(leakedUrls.map(l => l.url))];
      addFinding("vulnerability", "medium", "API Exposure",
        `Internal service URL(s) leaked to browser: ${uniqueUrls.join(", ")}`,
        `Proxy all backend calls through Next.js API routes; never expose internal URLs to client`);
    } else {
      console.log("  No internal URLs found in client-side code.");
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-api-exposure.png`, fullPage: true });
  });

  // ─────────────────────────────────────────────────────
  // 7. Console errors across all pages
  // ─────────────────────────────────────────────────────
  test("7 — Console errors and warnings across all pages", async ({ page }) => {
    const consoleLog: { page: string; type: string; text: string }[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleLog.push({ page: "", type: msg.type(), text: msg.text() });
      }
    });

    await loginViaAuth0(page);

    const pages = ["/dashboard", "/chat", "/settings", "/activity", "/memories", "/capabilities", "/inbox"];
    for (const path of pages) {
      // Tag upcoming messages with current page
      const startIdx = consoleLog.length;
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log(`  Error loading ${path}: ${e}`);
      }
      // Backfill page name
      for (let i = startIdx; i < consoleLog.length; i++) {
        consoleLog[i].page = path;
      }
    }

    console.log(`\n=== Console Errors & Warnings (${consoleLog.length}) ===`);
    for (const entry of consoleLog) {
      console.log(`  [${entry.type}] ${entry.page}: ${entry.text.substring(0, 200)}`);
    }

    // Check for security-relevant errors
    const securityKeywords = ["cors", "csp", "mixed content", "insecure", "certificate", "blocked", "refused", "token", "unauthorized", "forbidden"];
    const securityErrors = consoleLog.filter(e =>
      securityKeywords.some(kw => e.text.toLowerCase().includes(kw))
    );

    if (securityErrors.length > 0) {
      for (const err of securityErrors) {
        addFinding("weakness", "medium", "Console Errors",
          `Security-relevant console ${err.type} on ${err.page}: ${err.text.substring(0, 150)}`,
          `Investigate and resolve security-related console messages`);
      }
    }

    if (consoleLog.length > 0 && securityErrors.length === 0) {
      addFinding("informational", "info", "Console Errors",
        `${consoleLog.length} console error(s)/warning(s) found, none security-relevant`,
        `Review and fix console errors for production readiness`);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-console-errors.png`, fullPage: true });
  });

  // ─────────────────────────────────────────────────────
  // 8. Sensitive data in HTML source
  // ─────────────────────────────────────────────────────
  test("8 — No sensitive data leaked in HTML source", async ({ page }) => {
    collectConsole(page, "sensitive-data");

    await loginViaAuth0(page);

    const pagesToCheck = ["/dashboard", "/chat", "/settings"];
    const leaks: { page: string; type: string; snippet: string }[] = [];

    for (const path of pagesToCheck) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(2000);

      const html = await page.content();

      // Check for JWT tokens
      const jwtPattern = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g;
      const jwtMatches = html.match(jwtPattern);
      if (jwtMatches) {
        for (const jwt of jwtMatches) {
          leaks.push({ page: path, type: "JWT Token", snippet: jwt.substring(0, 50) + "..." });
        }
      }

      // Check for API keys
      const apiKeyPatterns = [
        /(?:api[_-]?key|apikey|secret|password|token)\s*[:=]\s*["'][^"']{8,}["']/gi,
        /sk-[A-Za-z0-9]{20,}/g,
        /AKIA[A-Z0-9]{16}/g,
      ];
      for (const pattern of apiKeyPatterns) {
        const matches = html.match(pattern);
        if (matches) {
          for (const m of matches) {
            leaks.push({ page: path, type: "API Key/Secret", snippet: m.substring(0, 50) });
          }
        }
      }

      // Check for email addresses (outside of expected UI elements)
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emailMatches = html.match(emailPattern);
      if (emailMatches) {
        const uniqueEmails = [...new Set(emailMatches)];
        for (const email of uniqueEmails) {
          // Skip known-expected emails
          if (!email.includes("cloudagentist.com") && !email.includes("auth0.com")) {
            leaks.push({ page: path, type: "Email address", snippet: email });
          }
        }
      }
    }

    console.log(`\n=== Sensitive Data in HTML ===`);
    if (leaks.length > 0) {
      for (const leak of leaks) {
        console.log(`  ${leak.type} on ${leak.page}: ${leak.snippet}`);
        const severity = leak.type === "JWT Token" ? "high" : leak.type === "API Key/Secret" ? "critical" : "low";
        addFinding(
          leak.type === "Email address" ? "informational" : "vulnerability",
          severity as Finding["severity"],
          "Sensitive Data Exposure",
          `${leak.type} found in HTML source on ${leak.page}: ${leak.snippet}`,
          `Never embed sensitive data in HTML; use server-side session lookups`
        );
      }
    } else {
      console.log("  No sensitive data found in HTML source.");
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-sensitive-data.png`, fullPage: true });
  });

  // ─────────────────────────────────────────────────────
  // 9. CORS check
  // ─────────────────────────────────────────────────────
  test("9 — CORS policy check", async ({ page }) => {
    collectConsole(page, "cors");

    const corsIssues: { url: string; issue: string }[] = [];
    const crossOriginRequests: { url: string; origin: string; status: number }[] = [];

    page.on("response", (resp) => {
      const url = resp.url();
      if (!url.includes("cloudagentist.com") && !url.includes("auth0.com") && !url.includes("cdn")) {
        crossOriginRequests.push({
          url,
          origin: new URL(url).origin,
          status: resp.status(),
        });
      }
    });

    page.on("console", (msg) => {
      if (msg.text().toLowerCase().includes("cors")) {
        corsIssues.push({ url: "console", issue: msg.text() });
      }
    });

    await loginViaAuth0(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    console.log(`\n=== CORS Analysis ===`);
    console.log(`Cross-origin requests: ${crossOriginRequests.length}`);
    for (const req of crossOriginRequests) {
      console.log(`  ${req.url} (${req.status})`);
    }

    if (corsIssues.length > 0) {
      for (const issue of corsIssues) {
        console.log(`  CORS issue: ${issue.issue}`);
      }
      addFinding("weakness", "medium", "CORS",
        `${corsIssues.length} CORS error(s) detected in console`,
        `Review CORS configuration; ensure Access-Control-Allow-Origin is properly scoped`);
    }

    // Check for overly permissive CORS
    const resp = await page.request.fetch(`${BASE}/api/auth/me`, {
      headers: { "Origin": "https://evil.com" },
    });
    const corsHeader = resp.headers()["access-control-allow-origin"];
    if (corsHeader === "*") {
      addFinding("vulnerability", "high", "CORS",
        `API returns Access-Control-Allow-Origin: * — allows any origin`,
        `Restrict CORS to specific trusted origins`);
    } else if (corsHeader === "https://evil.com") {
      addFinding("vulnerability", "high", "CORS",
        `API reflects arbitrary Origin header in CORS response`,
        `Whitelist specific origins; do not reflect Origin header`);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-cors.png`, fullPage: true });
  });

  // ─────────────────────────────────────────────────────
  // 10. Rate limiting in chat
  // ─────────────────────────────────────────────────────
  test("10 — Rate limiting on chat messages", async ({ page }) => {
    collectConsole(page, "rate-limit");

    await loginViaAuth0(page);
    await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const chatInput = page.locator("textarea, input[type='text']").first();
    const sendButton = page.locator("button:has-text('Send'), button[type='submit']").first();

    let messagesSent = 0;
    let rateLimited = false;
    const responseStatuses: number[] = [];

    // Monitor API responses for 429
    page.on("response", (resp) => {
      if (resp.url().includes("/api/") && resp.url().includes("chat")) {
        responseStatuses.push(resp.status());
        if (resp.status() === 429) {
          rateLimited = true;
        }
      }
    });

    console.log("\n=== Rate Limiting Test — Sending 10 rapid messages ===");
    for (let i = 0; i < 10; i++) {
      try {
        await chatInput.waitFor({ timeout: 5000 });
        await chatInput.fill(`Rate limit test message ${i + 1}`);
        await sendButton.click();
        messagesSent++;
        // Minimal delay — testing rapid fire
        await page.waitForTimeout(500);
      } catch (e) {
        console.log(`  Message ${i + 1} failed: ${e}`);
        break;
      }
    }

    console.log(`  Messages sent: ${messagesSent}`);
    console.log(`  Rate limited: ${rateLimited}`);
    console.log(`  Response statuses: ${responseStatuses.join(", ")}`);

    if (!rateLimited && messagesSent >= 10) {
      addFinding("weakness", "medium", "Rate Limiting",
        `No rate limiting detected after sending ${messagesSent} rapid messages in chat`,
        `Implement rate limiting on chat API (e.g., 5 messages/10 seconds per user)`);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-rate-limiting.png`, fullPage: true });
  });

  // ─────────────────────────────────────────────────────
  // Final report
  // ─────────────────────────────────────────────────────
  test("99 — Generate security audit report", async () => {
    const report = {
      audit: "Cloud Agentist Security Audit",
      date: new Date().toISOString(),
      totalFindings: findings.length,
      summary: {
        vulnerabilities: findings.filter(f => f.classification === "vulnerability").length,
        weaknesses: findings.filter(f => f.classification === "weakness").length,
        informational: findings.filter(f => f.classification === "informational").length,
      },
      bySeverity: {
        critical: findings.filter(f => f.severity === "critical").length,
        high: findings.filter(f => f.severity === "high").length,
        medium: findings.filter(f => f.severity === "medium").length,
        low: findings.filter(f => f.severity === "low").length,
        info: findings.filter(f => f.severity === "info").length,
      },
      findings,
    };

    console.log("\n" + "=".repeat(60));
    console.log("SECURITY AUDIT REPORT — Cloud Agentist");
    console.log("=".repeat(60));
    console.log(JSON.stringify(report, null, 2));
    console.log("=".repeat(60));

    fs.writeFileSync(
      `${SCREENSHOT_DIR}/security-audit-report.json`,
      JSON.stringify(report, null, 2)
    );
  });
});
