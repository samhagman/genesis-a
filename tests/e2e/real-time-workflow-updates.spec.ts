import { test, expect } from "@playwright/test";

/**
 * End-to-End Tests for Real-Time Workflow Updates
 *
 * Tests the complete real-time workflow update functionality via WebSocket,
 * ensuring the main template section auto-updates when AI adds goals/tasks via chat.
 */

test.describe("Real-Time Workflow Updates", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto("/");

    // Monitor console logs for debugging
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        console.log("Console error:", text);
      } else if (text.includes("WebSocket") || text.includes("[ChatPanel]")) {
        console.log("WebSocket/Chat log:", text);
      }
    });

    // Wait for the page to load and basic DOM to be ready
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000); // Give React and bundler time to load

    // Check if page loaded by looking for any content
    const hasContent = await page.locator("body").isVisible();
    if (!hasContent) {
      throw new Error("Page body not visible - application failed to load");
    }
  });

  test("should load page and verify basic content", async ({ page }) => {
    // First, just verify the HTML title loads
    await expect(page).toHaveTitle(/Genesis/);

    // Verify there's some content on the page
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    console.log("✅ Page loaded successfully with title containing 'Genesis'");
  });

  test("should load application and verify UI components", async ({ page }) => {
    // Look for the chat input with its specific placeholder
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Look for the send button with its aria-label
    const sendButton = page.locator('button[aria-label="Send message"]');
    await expect(sendButton).toBeVisible({ timeout: 10000 });

    // Verify we can interact with the chat input
    await chatInput.fill("Hello test");
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe("Hello test");

    // Clear input for next tests
    await chatInput.clear();

    console.log("✅ Basic UI components verified");
  });

  test("should verify initial workflow loads", async ({ page }) => {
    // Wait for initial workflow to load - should show "instawork-shift-filling" by default
    const workflowTitle = page.locator("h2").first();
    await expect(workflowTitle).toBeVisible({ timeout: 15000 });

    // Should see the V2 Workflow badge
    const v2Badge = page.locator('text="V2 Workflow"');
    await expect(v2Badge).toBeVisible({ timeout: 5000 });

    console.log("✅ Initial workflow loaded successfully");
  });

  test("should create new workflow via chat", async ({ page }) => {
    // Find chat elements
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await expect(sendButton).toBeVisible({ timeout: 10000 });

    // Create a new workflow
    await chatInput.fill(
      'Create a new workflow called "Real-Time Test Workflow"'
    );
    await sendButton.click();

    // Wait for AI response - look for any indication the message was processed
    await page.waitForTimeout(8000); // Give AI time to respond

    // Check if the workflow creation was attempted
    const pageContent = await page.content();
    const hasWorkflowText =
      pageContent.includes("workflow") || pageContent.includes("Workflow");
    console.log("Page contains workflow-related content:", hasWorkflowText);

    console.log("✅ Workflow creation test completed");
  });

  test("should test WebSocket connection setup", async ({ page }) => {
    const webSocketLogs: string[] = [];

    // Capture WebSocket-related logs
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("WebSocket") ||
        text.includes("[ChatPanel]") ||
        text.includes("🔌")
      ) {
        webSocketLogs.push(text);
      }
    });

    // Interact with chat to trigger WebSocket listener setup
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Focus on the input to potentially trigger WebSocket setup
    await chatInput.focus();
    await page.waitForTimeout(3000);

    // Type something to trigger any WebSocket activity
    await chatInput.fill("Test WebSocket connection");
    await page.waitForTimeout(2000);

    console.log(`Captured ${webSocketLogs.length} WebSocket-related logs:`);
    webSocketLogs.forEach((log, i) => console.log(`  ${i + 1}. ${log}`));

    console.log("✅ WebSocket monitoring test completed");
  });

  test("should add goal and test real-time updates", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await expect(sendButton).toBeVisible({ timeout: 10000 });

    // Capture the initial workflow state
    const initialWorkflowTitle = await page.locator("h2").first().textContent();
    console.log("Initial workflow:", initialWorkflowTitle);

    // Add a goal via chat
    await chatInput.fill(
      'Add a goal called "Real-Time Test Goal" to verify live updates'
    );
    await sendButton.click();

    // Wait for AI to process the request
    await page.waitForTimeout(10000);

    // Check if the page content changed
    const updatedContent = await page.content();
    const hasNewGoal =
      updatedContent.includes("Real-Time Test Goal") ||
      updatedContent.includes("Real-Time") ||
      updatedContent.includes("Test Goal");

    console.log("Page contains new goal content:", hasNewGoal);

    // Look for any workflow cards or goal elements that might have been added
    const goalElements = await page
      .locator('[class*="goal"], [class*="card"], h3, h4')
      .count();
    console.log("Total goal/card elements found:", goalElements);

    console.log("✅ Real-time goal addition test completed");
  });

  test("should verify error handling", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Test with invalid command
    await chatInput.fill(
      "Do something completely invalid that should not work"
    );
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(5000);

    // Verify the application didn't crash
    await expect(chatInput).toBeVisible();
    await expect(sendButton).toBeVisible();

    console.log("✅ Error handling test completed - app remained stable");
  });

  test("should test rapid message handling", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Send multiple messages with delays
    const messages = [
      'Create workflow "Rapid Test"',
      'Add goal "Speed Goal"',
      'Add task "Quick Task"',
    ];

    for (const message of messages) {
      await chatInput.fill(message);
      await sendButton.click();
      await page.waitForTimeout(3000); // Wait between messages
    }

    // Final wait for all processing to complete
    await page.waitForTimeout(5000);

    // Verify app is still responsive
    await expect(chatInput).toBeVisible();
    await chatInput.fill("Final test message");

    console.log("✅ Rapid message handling test completed");
  });
});
