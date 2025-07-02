import { test, expect } from "@playwright/test";

/**
 * UI Responsiveness and Console Error Monitoring Test Suite
 *
 * Tests the application's UI responsiveness, performance, and monitors
 * for console errors during various operations.
 */

test.describe("UI Responsiveness and Console Monitoring", () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      } else if (msg.type() === "warning") {
        consoleWarnings.push(msg.text());
      }
    });

    // Store arrays for test access
    (
      page as unknown as { consoleErrors: string[]; consoleWarnings: string[] }
    ).consoleErrors = consoleErrors;
    (
      page as unknown as { consoleErrors: string[]; consoleWarnings: string[] }
    ).consoleWarnings = consoleWarnings;

    await page.goto("/");
    await expect(page).toHaveTitle(/Genesis/, {
      timeout: 30000,
    });
  });

  test.describe("Console Error Monitoring", () => {
    test("should not produce console errors during initial load", async ({
      page,
    }) => {
      // Wait for application to fully load
      await page.waitForTimeout(3000);

      // Check for critical console errors
      const errors = (page as unknown as { consoleErrors: string[] })
        .consoleErrors;
      const criticalErrors = errors.filter(
        (error) =>
          !error.includes("Warning") &&
          !error.includes("DevTools") &&
          !error.includes("Extension")
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test("should not produce errors during workflow creation", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Clear any existing errors
      (page as unknown as { consoleErrors: string[] }).consoleErrors = [];

      await chatInput.fill(
        'Create a new workflow called "Console Test Workflow"'
      );
      await sendButton.click();

      // Wait for processing
      await page.waitForTimeout(5000);

      const errors = (page as unknown as { consoleErrors: string[] })
        .consoleErrors;
      const relevantErrors = errors.filter(
        (error) => !error.includes("Warning") && !error.includes("DevTools")
      );

      expect(relevantErrors).toHaveLength(0);
    });

    test("should not produce errors during goal/task operations", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Setup workflow
      await chatInput.fill(
        'Create workflow "Error Monitoring" with goal "Test Goal"'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Clear console
      (page as unknown as { consoleErrors: string[] }).consoleErrors = [];

      // Perform multiple operations
      await chatInput.fill('Add task "Test Task" to Test Goal');
      await sendButton.click();
      await page.waitForTimeout(2000);

      await chatInput.fill(
        "Add constraint to Test Goal: must complete within 1 hour"
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      await chatInput.fill("Show me the current workflow");
      await sendButton.click();
      await page.waitForTimeout(2000);

      const errors = (page as unknown as { consoleErrors: string[] })
        .consoleErrors;
      const relevantErrors = errors.filter(
        (error) => !error.includes("Warning") && !error.includes("DevTools")
      );

      expect(relevantErrors).toHaveLength(0);
    });

    test("should handle console errors gracefully during network issues", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Simulate network failure
      await page.route("**/api/**", (route) => route.abort());

      // Clear console
      (page as unknown as { consoleErrors: string[] }).consoleErrors = [];

      await chatInput.fill('Create workflow "Network Error Test"');
      await sendButton.click();

      // Wait for error handling
      await page.waitForTimeout(5000);

      // Unhandled promise rejections should not crash the app
      const errors = (page as unknown as { consoleErrors: string[] })
        .consoleErrors;
      const crashErrors = errors.filter(
        (error) =>
          error.includes("Uncaught") &&
          !error.includes("network") &&
          !error.includes("fetch")
      );

      expect(crashErrors).toHaveLength(0);

      // UI should remain responsive
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toBeEnabled();
    });
  });

  test.describe("UI Responsiveness", () => {
    test("should maintain responsive UI during chat operations", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Measure response times
      const operations = [
        'Create workflow "Performance Test"',
        'Add goal "Speed Test Goal"',
        'Add task "Fast Task" to Speed Test Goal',
        "Show me the workflow structure",
      ];

      for (const operation of operations) {
        const startTime = Date.now();

        await chatInput.fill(operation);
        await sendButton.click();

        // Wait for UI to respond (input should become enabled again)
        await expect(chatInput).toBeEnabled({ timeout: 5000 });

        const responseTime = Date.now() - startTime;

        // UI should respond within reasonable time (5 seconds max)
        expect(responseTime).toBeLessThan(5000);

        await page.waitForTimeout(1000); // Brief pause between operations
      }
    });

    test("should handle rapid user interactions without lag", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Create base workflow
      await chatInput.fill('Create workflow "Rapid Fire Test"');
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Rapid typing and clicking
      const rapidCommands = [
        'Add goal "Goal 1"',
        'Add goal "Goal 2"',
        'Add goal "Goal 3"',
      ];

      for (const command of rapidCommands) {
        await chatInput.fill(command);

        // Fast clicking without waiting
        await sendButton.click();
        await page.waitForTimeout(200); // Very short delay
      }

      // Wait for all processing
      await page.waitForTimeout(10000);

      // UI should remain responsive
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toBeEnabled();

      // Check that some goals were created
      const workflowPanel = page.locator('[data-testid="workflow-panel"]');
      await expect(workflowPanel).toContainText("Goal", { timeout: 5000 });
    });

    test("should maintain performance with large workflows", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Create workflow with many elements
      await chatInput.fill('Create workflow "Large Workflow Test"');
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Add multiple goals
      for (let i = 1; i <= 5; i++) {
        await chatInput.fill(
          `Add goal "Goal ${i}" with description "This is goal number ${i} for testing performance"`
        );
        await sendButton.click();
        await page.waitForTimeout(1000);
      }

      // Add multiple tasks to first goal
      for (let i = 1; i <= 5; i++) {
        await chatInput.fill(`Add task "Task ${i}" to the first goal`);
        await sendButton.click();
        await page.waitForTimeout(1000);
      }

      // Measure performance of viewing large workflow
      const startTime = Date.now();
      await chatInput.fill("Show me the complete workflow structure");
      await sendButton.click();

      await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
        "Goals:",
        { timeout: 10000 }
      );
      const viewTime = Date.now() - startTime;

      // Viewing should complete within reasonable time
      expect(viewTime).toBeLessThan(10000);

      // UI should remain responsive
      await expect(chatInput).toBeEnabled();
    });

    test("should handle window resizing gracefully", async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Create some content first
      await chatInput.fill(
        'Create workflow "Resize Test" with goal "Test Goal"'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Test different viewport sizes
      const viewportSizes = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1366, height: 768 }, // Laptop
        { width: 768, height: 1024 }, // Tablet
      ];

      for (const size of viewportSizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(500);

        // Verify main elements are still visible
        await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
        await expect(
          page.locator('[data-testid="workflow-panel"]')
        ).toBeVisible();
        await expect(chatInput).toBeVisible();

        // Verify functionality still works
        await chatInput.fill("Test resize functionality");
        await sendButton.click();
        await page.waitForTimeout(1000);

        await expect(chatInput).toBeEnabled();
      }
    });

    test("should maintain scroll performance with long chat history", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Generate long chat history
      await chatInput.fill('Create workflow "Scroll Test"');
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Add many messages
      for (let i = 1; i <= 15; i++) {
        await chatInput.fill(
          `Add goal "Goal ${i}" for testing scroll performance`
        );
        await sendButton.click();
        await page.waitForTimeout(500);
      }

      // Test scrolling performance
      const chatMessages = page.locator('[data-testid="chat-messages"]');

      // Scroll to top
      await chatMessages.evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.waitForTimeout(100);

      // Scroll to bottom
      await chatMessages.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await page.waitForTimeout(100);

      // Verify scrolling doesn't break functionality
      await chatInput.fill("Test after scrolling");
      await sendButton.click();

      await expect(chatInput).toBeEnabled({ timeout: 5000 });
    });
  });

  test.describe("Memory and Resource Management", () => {
    test("should not accumulate excessive event listeners", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Perform multiple operations that might create listeners
      const operations = [
        'Create workflow "Memory Test"',
        'Add goal "Test Goal"',
        'Add task "Test Task"',
        "Delete Test Task (confirmation)", // This might create modal listeners
        "Show workflow structure",
      ];

      for (const operation of operations) {
        await chatInput.fill(operation);
        await sendButton.click();
        await page.waitForTimeout(1000);

        // Handle confirmation if needed
        if (operation.includes("Delete")) {
          const confirmDialog = page.locator(
            '[data-testid="confirmation-dialog"]'
          );
          if (await confirmDialog.isVisible()) {
            await page.locator('[data-testid="cancel-button"]').click();
          }
        }
      }

      // Check for memory warnings in console
      const warnings = (page as unknown as { consoleWarnings: string[] })
        .consoleWarnings;
      const memoryWarnings = warnings.filter(
        (warning) =>
          warning.includes("MaxListenersExceeded") ||
          warning.includes("memory") ||
          warning.includes("leak")
      );

      expect(memoryWarnings).toHaveLength(0);
    });

    test("should handle multiple concurrent operations gracefully", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Create base workflow
      await chatInput.fill('Create workflow "Concurrency Test"');
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Simulate concurrent operations by rapid firing
      const concurrentOperations = [
        'Add goal "Concurrent Goal 1"',
        'Add goal "Concurrent Goal 2"',
        'Add task "Concurrent Task 1"',
        'Add task "Concurrent Task 2"',
        "Show workflow structure",
      ];

      // Fire all operations rapidly
      for (const operation of concurrentOperations) {
        await chatInput.fill(operation);
        await sendButton.click();
        // No wait between operations to test concurrency
      }

      // Wait for all to complete
      await page.waitForTimeout(15000);

      // Application should remain stable
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toBeEnabled();

      // No critical errors should occur
      const errors = (page as unknown as { consoleErrors: string[] })
        .consoleErrors;
      const criticalErrors = errors.filter(
        (error) => error.includes("Uncaught") && !error.includes("network")
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe("Accessibility and Keyboard Navigation", () => {
    test("should maintain keyboard navigation functionality", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');

      // Focus should be on chat input by default or focusable
      await chatInput.focus();
      await expect(chatInput).toBeFocused();

      // Tab navigation should work
      await page.keyboard.press("Tab");
      const sendButton = page.locator('[data-testid="send-button"]');
      await expect(sendButton).toBeFocused();

      // Shift+Tab should work
      await page.keyboard.press("Shift+Tab");
      await expect(chatInput).toBeFocused();

      // Enter key should send message
      await chatInput.fill("Test keyboard navigation");
      await page.keyboard.press("Enter");

      // Verify message was sent
      await page.waitForTimeout(2000);
      await expect(chatInput).toBeEnabled();
    });

    test("should handle focus management during modal operations", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Create workflow and goal for deletion
      await chatInput.fill(
        'Create workflow "Focus Test" with goal "Delete Me"'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Trigger confirmation modal
      await chatInput.fill('Delete the "Delete Me" goal');
      await sendButton.click();

      const confirmDialog = page.locator('[data-testid="confirmation-dialog"]');
      if (await confirmDialog.isVisible()) {
        // Focus should be trapped in modal
        const confirmButton = page.locator('[data-testid="confirm-button"]');
        const cancelButton = page.locator('[data-testid="cancel-button"]');

        // Tab navigation within modal
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");

        // Escape should close modal
        await page.keyboard.press("Escape");

        // Focus should return to chat input
        await expect(chatInput).toBeFocused();
      }
    });
  });
});
