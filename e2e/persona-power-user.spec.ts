import { test, expect, Page } from "@playwright/test";

// ── Config ──────────────────────────────────────────────────────────────────
const BASE = "https://cloudagentist.com";
const SCREENSHOT_DIR = "e2e/screenshots/persona-power-user";

interface Issue {
  scenario: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
}

const issues: Issue[] = [];

function logIssue(scenario: string, severity: Issue["severity"], description: string) {
  issues.push({ scenario, severity, description });
  console.log(`[${severity.toUpperCase()}] ${scenario}: ${description}`);
}

// ── Auth helper ─────────────────────────────────────────────────────────────
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

// ── Chat helpers ────────────────────────────────────────────────────────────
async function sendChatMessage(page: Page, message: string): Promise<{ responseText: string; responseTimeMs: number }> {
  const textarea = page.locator("textarea");
  await textarea.waitFor({ timeout: 10000 });

  // Ensure textarea is enabled (not in pending state)
  await expect(textarea).toBeEnabled({ timeout: 30000 });

  // Fill message
  await textarea.click();
  await textarea.fill(message);

  // Wait for Send button to become enabled
  const sendBtn = page.locator("button:has-text('Send')");
  await expect(sendBtn).toBeEnabled({ timeout: 5000 });

  await sendBtn.click();
  const start = Date.now();

  // After clicking Send, the textarea becomes disabled during the transition.
  // Wait for it to become disabled (AI is thinking)...
  await expect(textarea).toBeDisabled({ timeout: 5000 }).catch(() => {
    // May have already completed very quickly
  });

  // ...then wait for it to become enabled again (AI response received)
  await expect(textarea).toBeEnabled({ timeout: 60000 });

  const responseTimeMs = Date.now() - start;

  // Get the last assistant message (left-aligned, with prose class for markdown)
  // Assistant messages are in .justify-start > div with bg-slate-800
  const assistantBubbles = page.locator("[class*='justify-start'] [class*='bg-slate-800'][class*='rounded-2xl']");
  const lastAssistant = assistantBubbles.last();
  const responseText = await lastAssistant.textContent() || "";

  return { responseText, responseTimeMs };
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("Power User Deep Feature Testing", () => {
  test.setTimeout(180000); // 3 min per test for AI responses

  test.describe.serial("Authenticated flow", () => {
    let sharedPage: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({
        baseURL: BASE,
        viewport: { width: 1440, height: 900 },
      });
      sharedPage = await context.newPage();

      // Collect console errors (deduplicated)
      const seenConsoleErrors = new Set<string>();
      sharedPage.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          // Skip known noise: favicon, hydration, Auth0 logout CORS
          if (text.includes("favicon") || text.includes("hydrat") || text.includes("oidc/logout")) return;
          // Deduplicate by first 100 chars
          const key = text.slice(0, 100);
          if (seenConsoleErrors.has(key)) return;
          seenConsoleErrors.add(key);
          logIssue("console", "medium", `Console error: ${text.slice(0, 200)}`);
        }
      });

      await loginViaAuth0(sharedPage);
    });

    test.afterAll(async () => {
      // Print final issue summary
      console.log("\n\n========== ISSUE SUMMARY ==========");
      if (issues.length === 0) {
        console.log("No issues found!");
      } else {
        const grouped = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        for (const issue of issues) {
          grouped[issue.severity]++;
          console.log(`[${issue.severity.toUpperCase().padEnd(8)}] ${issue.scenario}: ${issue.description}`);
        }
        console.log(`\nTotal: ${issues.length} issues (${grouped.critical} critical, ${grouped.high} high, ${grouped.medium} medium, ${grouped.low} low, ${grouped.info} info)`);
      }
      console.log("====================================\n");

      await sharedPage.context().close();
    });

    // ── 1. Multi-turn conversation ────────────────────────────────────────
    test("1. Multi-turn conversation with context retention", async () => {
      await sharedPage.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/01-chat-initial.png`, fullPage: true });

      // Message 1: Introduce yourself
      const r1 = await sendChatMessage(sharedPage, "Hi, my name is PowerTester. I like programming and hiking.");
      console.log(`  Turn 1 response time: ${r1.responseTimeMs}ms`);
      if (r1.responseTimeMs > 15000) {
        logIssue("multi-turn", "medium", `Turn 1 response time ${r1.responseTimeMs}ms exceeds 15s`);
      }
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/01-chat-turn1.png`, fullPage: true });

      // Message 2: Reference context
      const r2 = await sendChatMessage(sharedPage, "What is my name? And what hobbies did I mention?");
      console.log(`  Turn 2 response time: ${r2.responseTimeMs}ms`);
      const r2Lower = r2.responseText.toLowerCase();
      if (!r2Lower.includes("powertester")) {
        logIssue("multi-turn", "high", `AI did not recall user name 'PowerTester' from previous turn. Response: ${r2.responseText.slice(0, 200)}`);
      }
      if (!r2Lower.includes("programming") && !r2Lower.includes("hiking")) {
        logIssue("multi-turn", "high", `AI did not recall hobbies from previous turn. Response: ${r2.responseText.slice(0, 200)}`);
      }
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/01-chat-turn2.png`, fullPage: true });

      // Message 3: Another contextual question
      const r3 = await sendChatMessage(sharedPage, "Can you suggest some books related to my hobbies?");
      console.log(`  Turn 3 response time: ${r3.responseTimeMs}ms`);
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/01-chat-turn3.png`, fullPage: true });

      // Message 4: Meta question
      const r4 = await sendChatMessage(sharedPage, "How many messages have we exchanged in this conversation?");
      console.log(`  Turn 4 response time: ${r4.responseTimeMs}ms`);
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/01-chat-turn4.png`, fullPage: true });

      // Test persistence: reload and check if history appears
      await sharedPage.reload({ waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");
      await sharedPage.waitForTimeout(2000);

      const bodyText = await sharedPage.textContent("body");
      const hasHistoryMarker = bodyText?.includes("Welcome back") || bodyText?.includes("PowerTester") || bodyText?.includes("programming");
      if (!hasHistoryMarker) {
        logIssue("multi-turn", "high", "Chat history does not persist after page reload");
      }
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/01-chat-after-reload.png`, fullPage: true });
    });

    // ── 2. Schedule a real meeting ────────────────────────────────────────
    test("2. Schedule a meeting via chat", async () => {
      await sharedPage.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");

      const r = await sendChatMessage(sharedPage, "Schedule a meeting for tomorrow at 2pm called Team Standup");
      console.log(`  Schedule meeting response time: ${r.responseTimeMs}ms`);

      const rLower = r.responseText.toLowerCase();
      const mentionsMeeting = rLower.includes("meeting") || rLower.includes("schedule") || rLower.includes("standup") || rLower.includes("event");
      if (!mentionsMeeting) {
        logIssue("schedule-meeting", "high", `AI response does not acknowledge meeting scheduling. Response: ${r.responseText.slice(0, 200)}`);
      }

      // Check if an intent card appeared (approve/deny buttons)
      const intentCards = sharedPage.locator("text=Approve");
      const hasIntentCard = await intentCards.count() > 0;
      if (hasIntentCard) {
        console.log("  Intent card with approval buttons found - good!");
        // Try approving
        await intentCards.first().click();
        await sharedPage.waitForTimeout(1000);
        // Check for confirmation dialog
        const confirmBtn = sharedPage.locator("text=Yes, approve");
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
          await sharedPage.waitForTimeout(2000);
          console.log("  Approved meeting intent");
        }
      } else {
        // Auto-approved or no intent card
        const autoApproved = r.responseText.includes("Auto-approved") || r.responseText.includes("auto-approved");
        if (autoApproved) {
          console.log("  Meeting action was auto-approved");
        } else {
          logIssue("schedule-meeting", "medium", "No intent card or approval flow appeared for scheduling action");
        }
      }

      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/02-schedule-meeting.png`, fullPage: true });
    });

    // ── 3. Create a wishlist ──────────────────────────────────────────────
    test("3. Create and add to a wishlist", async () => {
      await sharedPage.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");

      // Create wishlist
      const r1 = await sendChatMessage(sharedPage, "Create a wishlist called Books to Read");
      console.log(`  Create wishlist response time: ${r1.responseTimeMs}ms`);

      const r1Lower = r1.responseText.toLowerCase();
      if (!r1Lower.includes("wishlist") && !r1Lower.includes("books")) {
        logIssue("wishlist", "high", `AI did not acknowledge wishlist creation. Response: ${r1.responseText.slice(0, 200)}`);
      }

      // Handle any approval if needed
      const approveBtn1 = sharedPage.locator("text=Approve").first();
      if (await approveBtn1.count() > 0) {
        await approveBtn1.click();
        await sharedPage.waitForTimeout(500);
        const confirmBtn = sharedPage.locator("text=Yes, approve");
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
          await sharedPage.waitForTimeout(2000);
        }
      }

      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/03-wishlist-create.png`, fullPage: true });

      // Add item to wishlist
      const r2 = await sendChatMessage(sharedPage, "Add The Great Gatsby to my Books to Read wishlist");
      console.log(`  Add to wishlist response time: ${r2.responseTimeMs}ms`);

      const r2Lower = r2.responseText.toLowerCase();
      if (!r2Lower.includes("gatsby") && !r2Lower.includes("added") && !r2Lower.includes("wishlist")) {
        logIssue("wishlist", "high", `AI did not acknowledge adding item to wishlist. Response: ${r2.responseText.slice(0, 200)}`);
      }

      // Handle any approval if needed
      const approveBtn2 = sharedPage.locator("text=Approve").first();
      if (await approveBtn2.count() > 0) {
        await approveBtn2.click();
        await sharedPage.waitForTimeout(500);
        const confirmBtn2 = sharedPage.locator("text=Yes, approve");
        if (await confirmBtn2.count() > 0) {
          await confirmBtn2.click();
          await sharedPage.waitForTimeout(2000);
        }
      }

      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/03-wishlist-add-item.png`, fullPage: true });
    });

    // ── 4. Capabilities page ──────────────────────────────────────────────
    test("4. Capabilities page - view and try", async () => {
      await sharedPage.goto(`${BASE}/capabilities`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/04-capabilities-page.png`, fullPage: true });

      const bodyText = await sharedPage.textContent("body");

      // Check page rendered
      if (!bodyText?.includes("What can your AI do")) {
        logIssue("capabilities", "high", "Capabilities page heading not found");
      }

      const hasCapabilities = bodyText?.includes("schedule.") || bodyText?.includes("wishlist.");
      const hasEmpty = bodyText?.includes("No capabilities registered");

      if (hasEmpty) {
        logIssue("capabilities", "high", "No capabilities registered - capability registry may be down or empty");
      } else if (!hasCapabilities) {
        logIssue("capabilities", "medium", "Could not confirm capabilities are displayed on the page");
      }

      // Try "Try it" link
      const tryItLink = sharedPage.locator("a:has-text('Try it')").first();
      if (await tryItLink.count() > 0) {
        await tryItLink.click();
        await sharedPage.waitForURL(/\/chat/, { timeout: 10000 });
        const chatUrl = sharedPage.url();
        if (!chatUrl.includes("/chat")) {
          logIssue("capabilities", "high", "'Try it' link did not navigate to /chat");
        }
        // Note: The link goes to /chat but doesn't pass a pre-filled prompt (href is just /chat)
        // Check if there is a pre-filled prompt in the textarea
        const textarea = sharedPage.locator("textarea");
        if (await textarea.count() > 0) {
          const val = await textarea.inputValue();
          if (!val || val.trim() === "") {
            logIssue("capabilities", "medium", "'Try it' navigates to /chat but does NOT pre-fill the prompt in the textarea. The link href is just '/chat' with no query param.");
          }
        }
        await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/04-capabilities-try-it.png`, fullPage: true });
      } else {
        logIssue("capabilities", "medium", "No 'Try it' links found on capabilities page");
      }
    });

    // ── 5. Dashboard stats ────────────────────────────────────────────────
    test("5. Dashboard stats reflect activity", async () => {
      await sharedPage.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/05-dashboard.png`, fullPage: true });

      const bodyText = await sharedPage.textContent("body") || "";

      // Check stat cards exist
      const hasPendingApprovals = bodyText.includes("Pending Approvals");
      const hasInteractions = bodyText.includes("Interactions");
      const hasGoals = bodyText.includes("Active Goals");
      const hasFacts = bodyText.includes("Known Facts");

      if (!hasPendingApprovals) logIssue("dashboard", "high", "Missing 'Pending Approvals' stat card");
      if (!hasInteractions) logIssue("dashboard", "high", "Missing 'Interactions' stat card");
      if (!hasGoals) logIssue("dashboard", "medium", "Missing 'Active Goals' stat card");
      if (!hasFacts) logIssue("dashboard", "medium", "Missing 'Known Facts' stat card");

      // Check for Recent Activity section
      const hasRecentActivity = bodyText.includes("Recent Activity");
      if (!hasRecentActivity) {
        logIssue("dashboard", "medium", "No 'Recent Activity' section found on dashboard");
      }

      // Check for memory section
      const hasMemorySection = bodyText.includes("Your Memory");
      if (!hasMemorySection) {
        logIssue("dashboard", "medium", "No 'Your Memory' section found on dashboard");
      }

      // Check if interactions count > 0 after our chat tests
      // Extract interaction count from the stat card
      const interactionCard = sharedPage.locator("text=Interactions").locator("..");
      if (await interactionCard.count() > 0) {
        const cardText = await interactionCard.textContent() || "";
        const match = cardText.match(/(\d+)/);
        if (match) {
          const count = parseInt(match[1], 10);
          console.log(`  Interactions count: ${count}`);
          if (count === 0) {
            logIssue("dashboard", "medium", "Interactions count is 0 despite having sent chat messages");
          }
        }
      }

      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/05-dashboard-full.png`, fullPage: true });
    });

    // ── 6. Activity feed ──────────────────────────────────────────────────
    test("6. Activity feed shows interactions", async () => {
      await sharedPage.goto(`${BASE}/activity`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/06-activity.png`, fullPage: true });

      const bodyText = await sharedPage.textContent("body") || "";

      if (!bodyText.includes("Activity")) {
        logIssue("activity", "high", "Activity page heading not found");
      }

      const hasEvents = bodyText.includes("interaction") || bodyText.includes("event");
      const hasEmptyState = bodyText.includes("No events recorded");

      if (hasEmptyState) {
        logIssue("activity", "medium", "Activity page shows 'No events recorded' despite prior chat interactions");
      } else if (hasEvents) {
        console.log("  Activity feed has events - good!");
      }

      // Check memory sidebar
      const hasMemories = bodyText.includes("Memories");
      if (!hasMemories) {
        logIssue("activity", "medium", "Activity page missing Memories sidebar");
      }
    });

    // ── 7. Memories page ──────────────────────────────────────────────────
    test("7. Memories page shows stored memories", async () => {
      await sharedPage.goto(`${BASE}/memories`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/07-memories.png`, fullPage: true });

      const bodyText = await sharedPage.textContent("body") || "";

      if (!bodyText.includes("Your Memory")) {
        logIssue("memories", "high", "Memories page heading 'Your Memory' not found");
      }

      // Check for memory types
      const hasGoals = bodyText.includes("goal");
      const hasFacts = bodyText.includes("fact");
      const hasPreferences = bodyText.includes("preference");
      const hasExperience = bodyText.includes("experience");

      const memoryTypesPresent = [hasGoals, hasFacts, hasPreferences, hasExperience].filter(Boolean).length;
      console.log(`  Memory types present: ${memoryTypesPresent}/4 (goal=${hasGoals}, fact=${hasFacts}, preference=${hasPreferences}, experience=${hasExperience})`);

      if (memoryTypesPresent === 0) {
        logIssue("memories", "medium", "No memory categories shown - AI may not be storing memories from conversations");
      }
    });

    // ── 8. Settings page ──────────────────────────────────────────────────
    test("8. Settings page - profile, data export, delete", async () => {
      await sharedPage.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/08-settings.png`, fullPage: true });

      const bodyText = await sharedPage.textContent("body") || "";

      // Profile section
      if (!bodyText.includes("Profile")) {
        logIssue("settings", "high", "Settings page missing Profile section");
      }
      if (!bodyText.includes("globethought")) {
        logIssue("settings", "medium", "Settings page does not show user email/name");
      }

      // AI section
      if (!bodyText.includes("Your AI")) {
        logIssue("settings", "medium", "Settings page missing 'Your AI' section");
      }

      // Manage links
      if (!bodyText.includes("Memory")) logIssue("settings", "medium", "Settings missing Memory link");
      if (!bodyText.includes("Capabilities")) logIssue("settings", "medium", "Settings missing Capabilities link");
      if (!bodyText.includes("Inbox")) logIssue("settings", "medium", "Settings missing Inbox link");

      // Data & Privacy
      if (!bodyText.includes("Data")) {
        logIssue("settings", "high", "Settings page missing Data & Privacy section");
      }
      if (!bodyText.includes("Export")) {
        logIssue("settings", "high", "No data export option in settings");
      }

      // Test export link
      const exportLink = sharedPage.locator("a:has-text('Export')").first();
      if (await exportLink.count() > 0) {
        const href = await exportLink.getAttribute("href");
        console.log(`  Export link href: ${href}`);
        if (href && href.includes("/api/export")) {
          // Try hitting the export endpoint
          const response = await sharedPage.request.get(`${BASE}${href}`);
          console.log(`  Export API response: ${response.status()}`);
          if (response.status() >= 400) {
            logIssue("settings", "high", `Data export endpoint returned ${response.status()}`);
          }
        }
      }

      // Check for delete data option
      if (!bodyText.toLowerCase().includes("delete")) {
        logIssue("settings", "high", "No data deletion option found in settings");
      }

      // Keyboard shortcuts hint
      if (!bodyText.includes("Cmd+/")) {
        logIssue("settings", "low", "Keyboard shortcuts hint not shown on settings page");
      }

      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/08-settings-full.png`, fullPage: true });
    });

    // ── 9. Inbox / Pending Approvals ──────────────────────────────────────
    test("9. Inbox and pending approvals", async () => {
      await sharedPage.goto(`${BASE}/inbox`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/09-inbox.png`, fullPage: true });

      const bodyText = await sharedPage.textContent("body") || "";

      // Check page loaded
      const hasInboxContent = bodyText.includes("Inbox") || bodyText.includes("Pending") || bodyText.includes("approval") || bodyText.includes("action");
      if (!hasInboxContent) {
        logIssue("inbox", "high", "Inbox page content not found");
      }

      // Check for pending approvals
      const approveButtons = sharedPage.locator("button:has-text('Approve')");
      const approveCount = await approveButtons.count();
      console.log(`  Pending approval buttons found: ${approveCount}`);

      if (approveCount > 0) {
        // Try approving the first one
        await approveButtons.first().click();
        await sharedPage.waitForTimeout(1000);
        const confirmBtn = sharedPage.locator("text=Yes, approve");
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
          await sharedPage.waitForTimeout(2000);
          console.log("  Approved an item from inbox");
        }
        await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/09-inbox-after-approve.png`, fullPage: true });
      } else {
        // Check for empty state
        const hasEmptyState = bodyText.includes("No pending") || bodyText.includes("empty") || bodyText.includes("nothing");
        console.log(`  Inbox empty state: ${hasEmptyState}`);
      }

      // Check for approval history
      const hasHistory = bodyText.includes("History") || bodyText.includes("Recent") || bodyText.includes("past");
      if (!hasHistory) {
        logIssue("inbox", "low", "No approval history section visible in inbox");
      }
    });

    // ── 10. Keyboard shortcuts ────────────────────────────────────────────
    test("10. Keyboard shortcuts", async () => {
      await sharedPage.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");

      // Try Cmd+/ (keyboard shortcut)
      await sharedPage.keyboard.press("Meta+/");
      await sharedPage.waitForTimeout(1000);

      // Check if a shortcut modal/overlay appeared
      await sharedPage.waitForTimeout(500);
      const bodyText = await sharedPage.textContent("body") || "";
      const hasShortcutModal = bodyText.includes("Shortcut") || bodyText.includes("shortcut") || bodyText.includes("Keyboard");

      // Take screenshot of whatever happened
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/10-keyboard-shortcut.png`, fullPage: true });

      if (!hasShortcutModal) {
        logIssue("keyboard-shortcuts", "low", "Cmd+/ did not show a keyboard shortcuts overlay/modal");
      } else {
        console.log("  Keyboard shortcuts modal appeared - good!");
        // Check if modal lists key shortcuts
        const hasShortcutEntries = bodyText.includes("Go to Chat") || bodyText.includes("Dashboard");
        if (hasShortcutEntries) {
          console.log("  Modal contains navigation shortcuts");
        }
      }

      // Try pressing Escape to dismiss anything
      await sharedPage.keyboard.press("Escape");
    });

    // ── 11. Response time benchmarks ──────────────────────────────────────
    test("11. Page load performance", async () => {
      const pages = [
        { path: "/dashboard", name: "Dashboard" },
        { path: "/chat", name: "Chat" },
        { path: "/capabilities", name: "Capabilities" },
        { path: "/activity", name: "Activity" },
        { path: "/memories", name: "Memories" },
        { path: "/settings", name: "Settings" },
        { path: "/inbox", name: "Inbox" },
      ];

      for (const p of pages) {
        const start = Date.now();
        await sharedPage.goto(`${BASE}${p.path}`, { waitUntil: "domcontentloaded" });
        await sharedPage.waitForLoadState("load");
        const loadTime = Date.now() - start;
        console.log(`  ${p.name} load time: ${loadTime}ms`);

        if (loadTime > 10000) {
          logIssue("performance", "high", `${p.name} page took ${loadTime}ms to load (>10s)`);
        } else if (loadTime > 5000) {
          logIssue("performance", "medium", `${p.name} page took ${loadTime}ms to load (>5s)`);
        }
      }
    });

    // ── 12. Error handling - empty and long messages ──────────────────────
    test("12. Error handling - edge cases", async () => {
      await sharedPage.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
      await sharedPage.waitForLoadState("load");

      // Test empty message - Send button should be disabled
      const sendBtn = sharedPage.locator("button:has-text('Send')");
      await sendBtn.waitFor({ timeout: 5000 });

      const isDisabledEmpty = await sendBtn.isDisabled();
      if (!isDisabledEmpty) {
        logIssue("error-handling", "medium", "Send button is NOT disabled when message input is empty");
      } else {
        console.log("  Send button correctly disabled for empty input");
      }

      // Try sending whitespace only
      const textarea = sharedPage.locator("textarea");
      await textarea.fill("   ");
      const isDisabledWhitespace = await sendBtn.isDisabled();
      if (!isDisabledWhitespace) {
        logIssue("error-handling", "low", "Send button is not disabled for whitespace-only input");
      }

      // Test long message (500+ chars)
      const longMessage = "This is a long test message. ".repeat(25); // ~725 chars
      await textarea.fill(longMessage);
      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/12-long-message-input.png`, fullPage: true });

      const isDisabledLong = await sendBtn.isDisabled();
      if (isDisabledLong) {
        logIssue("error-handling", "medium", "Send button is disabled for long messages - possible character limit?");
      } else {
        // Send it
        const r = await sendChatMessage(sharedPage, longMessage);
        console.log(`  Long message response time: ${r.responseTimeMs}ms`);
        if (r.responseTimeMs > 30000) {
          logIssue("error-handling", "medium", `Long message response took ${r.responseTimeMs}ms`);
        }
        const rLower = r.responseText.toLowerCase();
        // Check for actual system error indicators (not AI-generated analysis text)
        const isSystemError = rLower.includes("sorry, i couldn't process") || rLower.includes("failed to process") || rLower.includes("too long to process") || rLower.startsWith("error:");
        if (isSystemError) {
          logIssue("error-handling", "medium", `Long message caused a system error: ${r.responseText.slice(0, 200)}`);
        } else {
          console.log("  Long message handled successfully by AI");
        }
      }

      await sharedPage.screenshot({ path: `${SCREENSHOT_DIR}/12-error-handling.png`, fullPage: true });
    });
  });
});
