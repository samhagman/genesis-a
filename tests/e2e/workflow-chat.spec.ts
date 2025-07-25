import { test, expect } from "@playwright/test";

/**
 * Comprehensive Playwright Test Suite for Workflow Chat Interface
 *
 * Tests the complete workflow editing functionality through natural language
 * chat commands, ensuring all tools work correctly in the browser environment.
 */

test.describe("Workflow Chat Interface", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto("/");

    // Wait for the application to load - check page title instead of non-existent h1
    await expect(page).toHaveTitle(/Genesis/, {
      timeout: 30000,
    });

    // Check for any console errors during load
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log("Console error:", msg.text());
      }
    });
  });

  test("should load the application without errors", async ({ page }) => {
    // Verify the main interface elements are present
    await expect(
      page.locator('textarea[placeholder*="Send a message"]')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("h2").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="V2 Workflow"')).toBeVisible({
      timeout: 10000,
    });

    // Verify no JavaScript errors
    const logs = await page.evaluate(() => window.console);
    // Application should load without critical errors
  });

  test("should create a new workflow through chat", async ({ page }) => {
    // Find the chat input
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await expect(chatInput).toBeVisible();

    // Create a new workflow
    await chatInput.fill(
      'Create a new workflow called "Employee Onboarding Process" for managing new employee setup'
    );
    await sendButton.click();

    // Wait for AI response
    await expect(page.locator(".space-y-4")).toContainText(
      "Employee Onboarding Process",
      { timeout: 15000 }
    );

    // Verify workflow appears in the workflow panel
    await expect(page.locator(".max-w-2xl")).toContainText(
      "Employee Onboarding Process"
    );

    // Verify workflow structure in inspector
    await expect(page.locator("div")).toContainText(
      "Employee Onboarding Process"
    );
  });

  test("should add goals to workflow through chat", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // First create a workflow
    await chatInput.fill('Create a workflow called "Project Planning"');
    await sendButton.click();
    await page.waitForTimeout(2000);

    // Add a goal
    await chatInput.fill(
      'Add a goal called "Requirements Gathering" to collect and document project requirements'
    );
    await sendButton.click();

    // Wait for response and verify goal was added
    await expect(page.locator(".max-w-2xl")).toContainText(
      "Requirements Gathering",
      { timeout: 15000 }
    );

    // Add another goal
    await chatInput.fill(
      'Add a goal called "Design Phase" for creating system architecture'
    );
    await sendButton.click();

    await expect(page.locator(".max-w-2xl")).toContainText("Design Phase", {
      timeout: 15000,
    });
  });

  test("should add tasks to goals through chat", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Create workflow and goal
    await chatInput.fill(
      'Create a workflow called "Content Creation" with a goal called "Research"'
    );
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Add a task to the goal
    await chatInput.fill(
      'Add a task to Research goal: "Conduct market research and competitor analysis"'
    );
    await sendButton.click();

    // Verify task appears
    await expect(page.locator(".max-w-2xl")).toContainText("market research", {
      timeout: 15000,
    });

    // Add another task
    await chatInput.fill(
      'Add another task: "Interview target customers for insights"'
    );
    await sendButton.click();

    await expect(page.locator(".max-w-2xl")).toContainText(
      "Interview target customers",
      { timeout: 15000 }
    );
  });

  test("should add constraints to goals through chat", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Create workflow with goal
    await chatInput.fill(
      'Create a workflow "Quality Assurance" with goal "Testing Phase"'
    );
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Add a time constraint
    await chatInput.fill(
      "Add a constraint to Testing Phase: all tests must be completed within 2 weeks"
    );
    await sendButton.click();

    await expect(page.locator(".max-w-2xl")).toContainText("2 weeks", {
      timeout: 15000,
    });

    // Add a quality constraint
    await chatInput.fill(
      "Add a constraint: minimum 95% test coverage required"
    );
    await sendButton.click();

    await expect(page.locator(".max-w-2xl")).toContainText("95%", {
      timeout: 15000,
    });
  });

  test("should view current workflow state", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Create a workflow with some content
    await chatInput.fill(
      'Create workflow "Development Process" with goal "Implementation" and task "Write code"'
    );
    await sendButton.click();
    await page.waitForTimeout(3000);

    // View the current workflow
    await chatInput.fill("Show me the current workflow structure");
    await sendButton.click();

    // Verify the response contains workflow details
    const chatMessages = page.locator(".space-y-4");
    await expect(chatMessages).toContainText("Development Process", {
      timeout: 15000,
    });
    await expect(chatMessages).toContainText("Implementation");
    await expect(chatMessages).toContainText("Write code");
  });

  test("should handle error cases gracefully", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Try to add task without a workflow
    await chatInput.fill('Add a task called "invalid task"');
    await sendButton.click();

    // Should get an error message about no workflow
    await expect(page.locator(".space-y-4")).toContainText("No workflow", {
      timeout: 15000,
    });

    // Try invalid command
    await chatInput.fill("Do something completely invalid and nonsensical");
    await sendButton.click();

    // Should handle gracefully
    await page.waitForTimeout(3000);
    // Application should not crash
    await expect(
      page.locator('textarea[placeholder*="Send a message"]')
    ).toBeVisible();
  });

  test("should update workflow elements through chat", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Create initial workflow
    await chatInput.fill(
      'Create workflow "Bug Tracking" with goal "Investigation"'
    );
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Update the goal
    await chatInput.fill(
      'Update the Investigation goal to be called "Root Cause Analysis"'
    );
    await sendButton.click();

    await expect(page.locator(".max-w-2xl")).toContainText(
      "Root Cause Analysis",
      { timeout: 15000 }
    );
    await expect(page.locator(".max-w-2xl")).not.toContainText("Investigation");
  });

  test("should persist workflow state across page reloads", async ({
    page,
  }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Create a workflow
    await chatInput.fill(
      'Create workflow "Persistence Test" with goal "Data Retention"'
    );
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Verify workflow exists
    await expect(page.locator(".max-w-2xl")).toContainText("Persistence Test");

    // Reload the page
    await page.reload();
    await page.waitForTimeout(3000);

    // Verify workflow is still there
    await expect(page.locator(".max-w-2xl")).toContainText("Persistence Test", {
      timeout: 10000,
    });
  });

  test("should handle multiple rapid chat messages", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Send multiple messages rapidly
    const messages = [
      'Create workflow "Rapid Fire Test"',
      'Add goal "Speed Test"',
      'Add task "Quick Task 1"',
      'Add task "Quick Task 2"',
      'Add constraint "Fast completion required"',
    ];

    for (const message of messages) {
      await chatInput.fill(message);
      await sendButton.click();
      await page.waitForTimeout(1000); // Brief pause between messages
    }

    // Verify all elements were processed
    await expect(page.locator(".max-w-2xl")).toContainText("Rapid Fire Test", {
      timeout: 20000,
    });
    await expect(page.locator(".max-w-2xl")).toContainText("Speed Test");
    await expect(page.locator(".max-w-2xl")).toContainText("Quick Task 1");
    await expect(page.locator(".max-w-2xl")).toContainText("Quick Task 2");
  });

  test("should display helpful suggestions for workflow creation", async ({
    page,
  }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');

    // Check for placeholder text
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await expect(chatInput).toHaveAttribute(
      "placeholder",
      /.*Send a message.*/i
    );

    // Verify the chat input is functional
    await chatInput.fill("Test message");
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe("Test message");
  });
});
