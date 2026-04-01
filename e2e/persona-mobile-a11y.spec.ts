import { test, expect, Page, Browser } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "e2e/screenshots/persona-mobile-a11y";
const BASE_URL = "https://cloudagentist.com";

interface Finding {
  viewport: string;
  area: string;
  severity: "critical" | "high" | "medium" | "low";
  finding: string;
}

const findings: Finding[] = [];

function addFinding(viewport: string, area: string, severity: Finding["severity"], finding: string) {
  findings.push({ viewport, area, severity, finding });
}

const VIEWPORTS = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-14-pro", width: 393, height: 852 },
  { name: "ipad", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

async function loginViaAuth0(page: Page) {
  await page.goto(`${BASE_URL}/auth/login?returnTo=/dashboard`, { waitUntil: "commit" });
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

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

test.describe("Mobile Usability & Accessibility", () => {
  test.setTimeout(180000);

  // ── 1-5: Viewport-specific tests ──────────────────────────────

  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {

      test("1. Landing page", async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();
        await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1500);
        await screenshot(page, `${vp.name}-landing`);

        // Check CTA buttons are visible and tappable (min 44px)
        const ctaButtons = page.locator("a[href*='login'], a[href*='signup'], button").filter({ hasText: /.+/ });
        const ctaCount = await ctaButtons.count();
        for (let i = 0; i < Math.min(ctaCount, 5); i++) {
          const box = await ctaButtons.nth(i).boundingBox();
          if (box && (box.width < 44 || box.height < 44)) {
            addFinding(vp.name, "landing", "medium",
              `CTA button too small for touch: ${box.width.toFixed(0)}x${box.height.toFixed(0)}px`);
          }
        }

        // Check text is not overflowing horizontally
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        if (bodyWidth > vp.width + 5) {
          addFinding(vp.name, "landing", "high",
            `Horizontal overflow: body scrollWidth ${bodyWidth}px > viewport ${vp.width}px`);
        }

        // Check font sizes are readable (>= 12px)
        const smallText = await page.evaluate(() => {
          const els = document.querySelectorAll("p, span, a, li, td, th, label");
          let count = 0;
          els.forEach(el => {
            const size = parseFloat(getComputedStyle(el).fontSize);
            if (size < 12 && el.textContent && el.textContent.trim().length > 0) count++;
          });
          return count;
        });
        if (smallText > 0) {
          addFinding(vp.name, "landing", "medium", `${smallText} text elements with font-size < 12px`);
        }

        await context.close();
      });

      test("2. Navigation", async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();
        await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1000);

        const isMobile = vp.width < 768;

        if (isMobile) {
          // Look for hamburger / mobile menu button
          const hamburger = page.locator(
            "button[aria-label*='menu' i], button[aria-label*='nav' i], button:has(svg), [data-testid='mobile-menu']"
          );
          const hamburgerCount = await hamburger.count();
          if (hamburgerCount === 0) {
            addFinding(vp.name, "navigation", "high", "No hamburger/mobile menu button found on mobile viewport");
          } else {
            await hamburger.first().click();
            await page.waitForTimeout(500);
            await screenshot(page, `${vp.name}-nav-open`);

            // Check if nav links are now visible
            const navLinks = page.locator("nav a, [role='menu'] a, [role='navigation'] a");
            const visibleLinks = await navLinks.count();
            if (visibleLinks === 0) {
              addFinding(vp.name, "navigation", "high", "Mobile menu opened but no nav links visible");
            }

            // Close menu
            await hamburger.first().click().catch(() => {
              // Some menus close by clicking elsewhere
              page.locator("body").click({ position: { x: 10, y: 10 } });
            });
          }
        } else {
          // Desktop: check nav links are visible
          const navLinks = page.locator("nav a, header a").filter({ hasText: /.+/ });
          const navCount = await navLinks.count();
          if (navCount === 0) {
            addFinding(vp.name, "navigation", "medium", "No navigation links found in header/nav");
          }
          await screenshot(page, `${vp.name}-nav`);
        }

        await context.close();
      });

      test("3. Chat page", async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();
        await loginViaAuth0(page);

        await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(2000);
        await screenshot(page, `${vp.name}-chat`);

        // Check chat input is visible
        const chatInput = page.locator(
          "input[type='text'], textarea, [contenteditable='true'], input[placeholder*='message' i], textarea[placeholder*='message' i]"
        );
        const inputCount = await chatInput.count();
        if (inputCount === 0) {
          addFinding(vp.name, "chat", "high", "No chat input field found");
        } else {
          const inputBox = await chatInput.first().boundingBox();
          if (inputBox) {
            // Check input is within viewport
            if (inputBox.y + inputBox.height > vp.height) {
              addFinding(vp.name, "chat", "medium", "Chat input is below the visible viewport");
            }
            // Check input is wide enough to be usable
            if (inputBox.width < 150) {
              addFinding(vp.name, "chat", "medium",
                `Chat input too narrow: ${inputBox.width.toFixed(0)}px`);
            }
          }

          // Try typing in the input
          await chatInput.first().fill("Hello, testing mobile usability");
          await screenshot(page, `${vp.name}-chat-typed`);
        }

        // Check send button
        const sendBtn = page.locator(
          "button[type='submit'], button[aria-label*='send' i], button:has(svg)"
        ).last();
        const sendBtnCount = await sendBtn.count();
        if (sendBtnCount === 0) {
          addFinding(vp.name, "chat", "medium", "No send button found");
        } else {
          const sendBox = await sendBtn.boundingBox();
          if (sendBox && (sendBox.width < 44 || sendBox.height < 44)) {
            addFinding(vp.name, "chat", "medium",
              `Send button too small for touch: ${sendBox.width.toFixed(0)}x${sendBox.height.toFixed(0)}px`);
          }
        }

        // Check suggestion chips
        const chips = page.locator("[class*='chip'], [class*='suggestion'], [class*='quick']");
        const chipCount = await chips.count();
        if (chipCount > 0) {
          await screenshot(page, `${vp.name}-chat-chips`);
          // Check if chips overflow
          const chipsOverflow = await page.evaluate(() => {
            const container = document.querySelector("[class*='chip'], [class*='suggestion']")?.parentElement;
            if (!container) return false;
            return container.scrollWidth > container.clientWidth;
          });
          if (chipsOverflow) {
            addFinding(vp.name, "chat", "low", "Suggestion chips overflow their container (may need wrapping)");
          }
        }

        // Check horizontal overflow on chat page
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        if (bodyWidth > vp.width + 5) {
          addFinding(vp.name, "chat", "high",
            `Horizontal overflow on chat: body scrollWidth ${bodyWidth}px > viewport ${vp.width}px`);
        }

        await context.close();
      });

      test("4. Dashboard", async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();
        await loginViaAuth0(page);

        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(2000);
        await screenshot(page, `${vp.name}-dashboard`);

        // Check for horizontal overflow
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        if (bodyWidth > vp.width + 5) {
          addFinding(vp.name, "dashboard", "high",
            `Horizontal overflow on dashboard: scrollWidth ${bodyWidth}px > viewport ${vp.width}px`);
        }

        // Check card elements stack properly on mobile
        const cards = page.locator("[class*='card'], [class*='Card'], [class*='stat'], [class*='panel']");
        const cardCount = await cards.count();
        if (cardCount > 0) {
          for (let i = 0; i < Math.min(cardCount, 5); i++) {
            const box = await cards.nth(i).boundingBox();
            if (box) {
              if (box.x + box.width > vp.width + 5) {
                addFinding(vp.name, "dashboard", "high",
                  `Card ${i} extends beyond viewport: x=${box.x.toFixed(0)}, width=${box.width.toFixed(0)}`);
              }
            }
          }
        }

        // Check text readability
        const smallText = await page.evaluate(() => {
          const els = document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6");
          let count = 0;
          els.forEach(el => {
            const size = parseFloat(getComputedStyle(el).fontSize);
            if (size < 12 && el.textContent && el.textContent.trim().length > 0) count++;
          });
          return count;
        });
        if (smallText > 0) {
          addFinding(vp.name, "dashboard", "medium", `${smallText} text elements with font-size < 12px on dashboard`);
        }

        await context.close();
      });

      test("5. Settings page", async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();
        await loginViaAuth0(page);

        // Try /settings, fall back to /profile
        await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(2000);
        const settingsUrl = page.url();

        if (!settingsUrl.includes("settings") && !settingsUrl.includes("profile")) {
          // Try profile
          await page.goto(`${BASE_URL}/profile`, { waitUntil: "domcontentloaded", timeout: 30000 });
          await page.waitForTimeout(1500);
        }

        await screenshot(page, `${vp.name}-settings`);

        // Check buttons are tappable (min 44px)
        const buttons = page.locator("button").filter({ hasText: /.+/ });
        const btnCount = await buttons.count();
        let tooSmallBtns = 0;
        for (let i = 0; i < Math.min(btnCount, 10); i++) {
          const box = await buttons.nth(i).boundingBox();
          if (box && (box.width < 44 || box.height < 44)) {
            tooSmallBtns++;
          }
        }
        if (tooSmallBtns > 0) {
          addFinding(vp.name, "settings", "medium",
            `${tooSmallBtns} buttons smaller than 44px touch target on settings`);
        }

        // Check horizontal overflow
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        if (bodyWidth > vp.width + 5) {
          addFinding(vp.name, "settings", "high",
            `Horizontal overflow on settings: scrollWidth ${bodyWidth}px > viewport ${vp.width}px`);
        }

        await context.close();
      });
    });
  }

  // ── 6-10: Accessibility tests (desktop viewport) ─────────────

  test.describe("Accessibility (desktop 1440x900)", () => {

    test("6. Tab navigation", async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      // Test on landing page first
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      // Tab through elements and check focus visibility
      const focusResults: { tag: string; hasFocusStyle: boolean; text: string }[] = [];
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press("Tab");
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const styles = getComputedStyle(el);
          const outline = styles.outline;
          const boxShadow = styles.boxShadow;
          const hasFocusStyle = (outline !== "none" && outline !== "" && !outline.includes("0px"))
            || (boxShadow !== "none" && boxShadow !== "");
          return {
            tag: el.tagName,
            hasFocusStyle,
            text: (el.textContent || "").trim().slice(0, 40),
          };
        });
        if (focused) focusResults.push(focused);
      }

      const noFocus = focusResults.filter(r => !r.hasFocusStyle);
      if (noFocus.length > 0) {
        addFinding("desktop", "tab-navigation", "high",
          `${noFocus.length}/${focusResults.length} focusable elements have no visible focus indicator: ${noFocus.map(r => `${r.tag}("${r.text}")`).join(", ")}`);
      }

      await screenshot(page, "desktop-tab-focus");

      // Now test after login
      await loginViaAuth0(page);
      await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      // Tab to chat input
      let chatFocused = false;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Tab");
        const isInput = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
        });
        if (isInput) { chatFocused = true; break; }
      }
      if (!chatFocused) {
        addFinding("desktop", "tab-navigation", "medium", "Could not tab to chat input within 20 tabs");
      }

      await screenshot(page, "desktop-tab-chat");
      await context.close();
    });

    test("7. Skip to content link", async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1000);

      // Check for skip link (usually first focusable element)
      const skipLink = page.locator("a[href='#main'], a[href='#content'], a:has-text('Skip to'), [class*='skip']");
      const skipCount = await skipLink.count();
      if (skipCount === 0) {
        addFinding("desktop", "skip-link", "medium", "No 'skip to content' link found");
      } else {
        // Tab to it and check it becomes visible
        await page.keyboard.press("Tab");
        const isVisible = await skipLink.first().isVisible();
        if (!isVisible) {
          addFinding("desktop", "skip-link", "low", "Skip link exists but may not be visible on focus");
        }
        await screenshot(page, "desktop-skip-link");
      }

      await context.close();
    });

    test("8. ARIA labels", async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      // Check landing page
      const landingAriaIssues = await page.evaluate(() => {
        const issues: string[] = [];

        // Buttons without accessible names
        document.querySelectorAll("button").forEach((btn, i) => {
          const text = btn.textContent?.trim();
          const ariaLabel = btn.getAttribute("aria-label");
          const ariaLabelledBy = btn.getAttribute("aria-labelledby");
          const title = btn.getAttribute("title");
          if (!text && !ariaLabel && !ariaLabelledBy && !title) {
            issues.push(`Button #${i} has no accessible name`);
          }
        });

        // Links without accessible names
        document.querySelectorAll("a").forEach((link, i) => {
          const text = link.textContent?.trim();
          const ariaLabel = link.getAttribute("aria-label");
          if (!text && !ariaLabel) {
            issues.push(`Link #${i} (href=${link.getAttribute("href")}) has no accessible name`);
          }
        });

        // Inputs without labels
        document.querySelectorAll("input, textarea, select").forEach((input, i) => {
          const id = input.getAttribute("id");
          const ariaLabel = input.getAttribute("aria-label");
          const ariaLabelledBy = input.getAttribute("aria-labelledby");
          const placeholder = input.getAttribute("placeholder");
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;
          if (!label && !ariaLabel && !ariaLabelledBy && !placeholder) {
            issues.push(`Input #${i} (type=${input.getAttribute("type")}) has no label or aria-label`);
          }
        });

        // Nav elements without labels
        const navs = document.querySelectorAll("nav");
        navs.forEach((nav, i) => {
          if (!nav.getAttribute("aria-label") && !nav.getAttribute("aria-labelledby")) {
            issues.push(`Nav #${i} has no aria-label`);
          }
        });

        return issues;
      });

      if (landingAriaIssues.length > 0) {
        addFinding("desktop", "aria-labels", "high",
          `Landing page ARIA issues: ${landingAriaIssues.join("; ")}`);
      }

      // Check authenticated pages
      await loginViaAuth0(page);

      for (const route of ["/dashboard", "/chat"]) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1500);

        const ariaIssues = await page.evaluate((r) => {
          const issues: string[] = [];
          document.querySelectorAll("button").forEach((btn, i) => {
            const text = btn.textContent?.trim();
            const ariaLabel = btn.getAttribute("aria-label");
            const ariaLabelledBy = btn.getAttribute("aria-labelledby");
            const title = btn.getAttribute("title");
            if (!text && !ariaLabel && !ariaLabelledBy && !title) {
              issues.push(`${r}: Button #${i} has no accessible name`);
            }
          });
          document.querySelectorAll("input, textarea").forEach((input, i) => {
            const id = input.getAttribute("id");
            const ariaLabel = input.getAttribute("aria-label");
            const ariaLabelledBy = input.getAttribute("aria-labelledby");
            const placeholder = input.getAttribute("placeholder");
            const label = id ? document.querySelector(`label[for="${id}"]`) : null;
            if (!label && !ariaLabel && !ariaLabelledBy && !placeholder) {
              issues.push(`${r}: Input #${i} has no label or aria-label`);
            }
          });
          return issues;
        }, route);

        if (ariaIssues.length > 0) {
          addFinding("desktop", "aria-labels", "high", ariaIssues.join("; "));
        }
      }

      await screenshot(page, "desktop-aria-check");
      await context.close();
    });

    test("9. Color contrast check", async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      // Check for low-contrast text (approximate check using computed styles)
      const contrastIssues = await page.evaluate(() => {
        function luminance(r: number, g: number, b: number): number {
          const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        }

        function parseColor(color: string): [number, number, number] | null {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
          return null;
        }

        function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
          const l1 = luminance(...fg);
          const l2 = luminance(...bg);
          const lighter = Math.max(l1, l2);
          const darker = Math.min(l1, l2);
          return (lighter + 0.05) / (darker + 0.05);
        }

        const issues: string[] = [];
        const textEls = document.querySelectorAll("p, span, a, h1, h2, h3, h4, h5, h6, li, label, button");
        textEls.forEach(el => {
          const text = el.textContent?.trim();
          if (!text || text.length === 0) return;
          const styles = getComputedStyle(el);
          const fg = parseColor(styles.color);
          const bg = parseColor(styles.backgroundColor);
          if (fg && bg) {
            const ratio = contrastRatio(fg, bg);
            const fontSize = parseFloat(styles.fontSize);
            const isBold = parseInt(styles.fontWeight) >= 700;
            const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && isBold);
            const minRatio = isLargeText ? 3 : 4.5;
            if (ratio < minRatio) {
              issues.push(
                `"${text.slice(0, 30)}": ratio ${ratio.toFixed(1)}:1 (need ${minRatio}:1) — color: ${styles.color}, bg: ${styles.backgroundColor}`
              );
            }
          }
        });
        return issues.slice(0, 10); // cap output
      });

      if (contrastIssues.length > 0) {
        addFinding("desktop", "color-contrast", "high",
          `Low contrast text found: ${contrastIssues.join("; ")}`);
      } else {
        addFinding("desktop", "color-contrast", "low",
          "No obvious contrast issues detected (note: only computed foreground vs direct background checked)");
      }

      await screenshot(page, "desktop-contrast");

      // Also check after login (dark theme areas)
      await loginViaAuth0(page);
      await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      const chatContrastIssues = await page.evaluate(() => {
        function luminance(r: number, g: number, b: number): number {
          const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        }
        function parseColor(color: string): [number, number, number] | null {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
          return null;
        }
        function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
          const l1 = luminance(...fg);
          const l2 = luminance(...bg);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        }
        const issues: string[] = [];
        document.querySelectorAll("p, span, a, h1, h2, h3, h4, h5, h6, label, button, input, textarea").forEach(el => {
          const text = el.textContent?.trim();
          if (!text || text.length === 0) return;
          const styles = getComputedStyle(el);
          const fg = parseColor(styles.color);
          const bg = parseColor(styles.backgroundColor);
          if (fg && bg) {
            const ratio = contrastRatio(fg, bg);
            const fontSize = parseFloat(styles.fontSize);
            const isBold = parseInt(styles.fontWeight) >= 700;
            const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && isBold);
            const minRatio = isLargeText ? 3 : 4.5;
            if (ratio < minRatio) {
              issues.push(`Chat: "${text.slice(0, 30)}" ratio ${ratio.toFixed(1)}:1`);
            }
          }
        });
        return issues.slice(0, 10);
      });

      if (chatContrastIssues.length > 0) {
        addFinding("desktop", "color-contrast", "medium",
          `Chat page contrast issues: ${chatContrastIssues.join("; ")}`);
      }

      await screenshot(page, "desktop-contrast-chat");
      await context.close();
    });

    test("10. Screen reader text — images and icons", async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      // Check images without alt text
      const imgIssues = await page.evaluate(() => {
        const issues: string[] = [];
        document.querySelectorAll("img").forEach((img, i) => {
          const alt = img.getAttribute("alt");
          const role = img.getAttribute("role");
          if (alt === null && role !== "presentation" && role !== "none") {
            issues.push(`Image #${i} (src="${img.src.slice(-40)}") missing alt attribute`);
          }
        });
        return issues;
      });

      if (imgIssues.length > 0) {
        addFinding("desktop", "screen-reader", "high",
          `Images without alt text: ${imgIssues.join("; ")}`);
      }

      // Check SVG icons without labels
      const svgIssues = await page.evaluate(() => {
        const issues: string[] = [];
        document.querySelectorAll("svg").forEach((svg, i) => {
          const parent = svg.parentElement;
          const ariaLabel = svg.getAttribute("aria-label") || parent?.getAttribute("aria-label");
          const ariaHidden = svg.getAttribute("aria-hidden");
          const role = svg.getAttribute("role");
          const title = svg.querySelector("title");
          const parentText = parent?.textContent?.trim();
          // If SVG is not hidden and has no label and parent has no text
          if (ariaHidden !== "true" && !ariaLabel && !title && (!parentText || parentText.length === 0)) {
            issues.push(`SVG icon #${i} has no aria-label, title, or aria-hidden`);
          }
        });
        return issues;
      });

      if (svgIssues.length > 0) {
        addFinding("desktop", "screen-reader", "medium",
          `SVG icons without labels: ${svgIssues.join("; ")}`);
      }

      // Check authenticated pages too
      await loginViaAuth0(page);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      const dashImgIssues = await page.evaluate(() => {
        const issues: string[] = [];
        document.querySelectorAll("img").forEach((img, i) => {
          const alt = img.getAttribute("alt");
          const role = img.getAttribute("role");
          if (alt === null && role !== "presentation") {
            issues.push(`Dashboard img #${i} (src="${img.src.slice(-40)}") missing alt`);
          }
        });
        document.querySelectorAll("svg").forEach((svg, i) => {
          const ariaHidden = svg.getAttribute("aria-hidden");
          const ariaLabel = svg.getAttribute("aria-label") || svg.parentElement?.getAttribute("aria-label");
          const title = svg.querySelector("title");
          const parentText = svg.parentElement?.textContent?.trim();
          if (ariaHidden !== "true" && !ariaLabel && !title && (!parentText || parentText.length === 0)) {
            issues.push(`Dashboard SVG #${i} unlabeled`);
          }
        });
        return issues;
      });

      if (dashImgIssues.length > 0) {
        addFinding("desktop", "screen-reader", "medium",
          `Dashboard: ${dashImgIssues.join("; ")}`);
      }

      await screenshot(page, "desktop-screen-reader");
      await context.close();
    });
  });

  // ── Print findings summary ────────────────────────────────────

  test.afterAll(() => {
    console.log("\n\n========================================");
    console.log("  MOBILE USABILITY & A11Y FINDINGS");
    console.log("========================================\n");

    if (findings.length === 0) {
      console.log("  No issues found!\n");
      return;
    }

    const bySeverity = { critical: [] as Finding[], high: [] as Finding[], medium: [] as Finding[], low: [] as Finding[] };
    findings.forEach(f => bySeverity[f.severity].push(f));

    for (const sev of ["critical", "high", "medium", "low"] as const) {
      if (bySeverity[sev].length === 0) continue;
      console.log(`\n── ${sev.toUpperCase()} ──`);
      bySeverity[sev].forEach((f, i) => {
        console.log(`  ${i + 1}. [${f.viewport}] ${f.area}: ${f.finding}`);
      });
    }

    console.log(`\nTotal: ${findings.length} findings`);
    console.log(`  Critical: ${bySeverity.critical.length}`);
    console.log(`  High: ${bySeverity.high.length}`);
    console.log(`  Medium: ${bySeverity.medium.length}`);
    console.log(`  Low: ${bySeverity.low.length}`);
    console.log("\n========================================\n");

    // Write findings to JSON file
    const outputPath = path.join(SCREENSHOT_DIR, "findings.json");
    fs.writeFileSync(outputPath, JSON.stringify(findings, null, 2));
    console.log(`Findings written to ${outputPath}\n`);
  });
});
