import { test, expect } from "@playwright/test";

/**
 * Error Handling and Edge Cases Test Suite
 *
 * Tests the application's resilience and error handling capabilities
 * with invalid inputs, network issues, and edge cases.
 */

test.describe("Error Handling and Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Genesis/, {
      timeout: 30000,
    });

    // Set up console error monitoring
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Store errors for test verification
    (page as unknown as { consoleErrors: string[] }).consoleErrors = errors;
  });

  test("should handle empty chat input gracefully", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Try to send empty message
    await sendButton.click();

    // Should either prevent sending or show helpful message
    const chatMessages = page.locator('[data-testid="chat-messages"]');
    await page.waitForTimeout(2000);

    // Application should remain functional
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();
  });

  test("should handle extremely long chat messages", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Create a very long message (5000+ characters)
    const longMessage = `Create a workflow with goal ${"a".repeat(5000)} and task ${"b".repeat(5000)}`;

    await chatInput.fill(longMessage);
    await sendButton.click();

    // Should handle gracefully without crashing
    await page.waitForTimeout(5000);
    await expect(chatInput).toBeVisible();

    // Check for appropriate error message or truncation
    const chatMessages = page.locator('[data-testid="chat-messages"]');
    const responseText = await chatMessages.textContent();

    // Should either process or show appropriate error
    expect(responseText).toBeTruthy();
  });

  test("should handle special characters and unicode", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    const specialMessages = [
      'Create workflow "Test 🚀" with goal "Process 📊" and task "Review 📝"',
      "Add goal with äöü ñ ç characters",
      "Create workflow with 中文 characters",
      "Add task with symbols !@#$%^&*()_+-={}[]|\\:\";'<>?,./",
      "Test with newlines\nand\ttabs",
    ];

    for (const message of specialMessages) {
      await chatInput.fill(message);
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Should remain functional after each message
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toBeEnabled();
    }
  });

  test("should handle network interruption gracefully", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Send a message
    await chatInput.fill('Create workflow "Network Test"');
    await sendButton.click();

    // Simulate network failure by blocking requests
    await page.route("**/*", (route) => route.abort());

    await page.waitForTimeout(1000);

    // Try to send another message
    await chatInput.fill('Add goal "Should Fail"');
    await sendButton.click();

    // Should show appropriate error message
    await expect(
      page.locator(
        '[data-testid="error-message"], [data-testid="chat-messages"]'
      )
    ).toContainText(/network|connection|error|failed/i, { timeout: 10000 });

    // Restore network
    await page.unroute("**/*");

    // Should recover when network is restored
    await page.waitForTimeout(2000);
    await chatInput.fill("Recovery test");
    await sendButton.click();

    await page.waitForTimeout(5000);
    await expect(chatInput).toBeEnabled();
  });

  test("should handle rapid successive messages", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Send 10 messages in rapid succession
    const messages = Array.from(
      { length: 10 },
      (_, i) => `Message ${i + 1}: Create item ${i + 1}`
    );

    for (const message of messages) {
      await chatInput.fill(message);
      await sendButton.click();
      // Very short delay to test rate limiting/queuing
      await page.waitForTimeout(100);
    }

    // Wait for all processing to complete
    await page.waitForTimeout(15000);

    // Application should remain responsive
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();

    // Check that messages were processed or queued appropriately
    const chatMessages = page.locator('[data-testid="chat-messages"]');
    const messageContent = await chatMessages.textContent();

    // Should show evidence of processing multiple messages
    expect(messageContent).toContain("Message");
  });

  test("should handle malformed workflow commands", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    const malformedCommands = [
      'Create workflow without name ""',
      "Add goal to non-existent workflow",
      "Delete goal that does not exist",
      "Update task with ID 99999999",
      "Add constraint with invalid parameters",
      "Create workflow with null name",
    ];

    for (const command of malformedCommands) {
      await chatInput.fill(command);
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Should show appropriate error message
      const chatMessages = page.locator('[data-testid="chat-messages"]');
      const responseText = await chatMessages.textContent();

      // Should contain some error indication
      expect(responseText?.toLowerCase()).toMatch(
        /(error|invalid|not found|failed|cannot)/
      );

      // Application should remain functional
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toBeEnabled();
    }
  });

  test("should prevent XSS attacks in chat messages", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    const xssAttempts = [
      '<script>alert("XSS")</script>',
      'Create workflow "<img src=x onerror=alert(1)>"',
      'Add goal with <iframe src="javascript:alert(1)"></iframe>',
      'javascript:alert("XSS")',
      "<svg onload=alert(1)>",
    ];

    for (const xssAttempt of xssAttempts) {
      await chatInput.fill(xssAttempt);
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Check that no alert was triggered
      // Also verify that script tags are properly escaped
      const chatMessages = page.locator('[data-testid="chat-messages"]');
      const innerHTML = await chatMessages.innerHTML();

      // Should not contain executable script tags
      expect(innerHTML).not.toMatch(/<script[^>]*>.*<\/script>/);
      expect(innerHTML).not.toMatch(/onerror\s*=/);
      expect(innerHTML).not.toMatch(/onload\s*=/);
    }

    // Check console for any XSS-related errors
    const errors =
      (page as unknown as { consoleErrors?: string[] }).consoleErrors || [];
    const xssErrors = errors.filter(
      (error: string) =>
        error.toLowerCase().includes("script") ||
        error.toLowerCase().includes("security")
    );

    // Should not have security-related console errors
    expect(xssErrors).toHaveLength(0);
  });

  test("should handle browser refresh during processing", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Start a workflow creation
    await chatInput.fill(
      'Create a complex workflow "Refresh Test" with multiple goals and tasks'
    );
    await sendButton.click();

    // Refresh page while processing
    await page.waitForTimeout(1000);
    await page.reload();

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("Genesis", {
      timeout: 30000,
    });

    // Application should load without issues
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-panel"]')).toBeVisible();

    // Should be able to continue working
    const newChatInput = page.locator('[data-testid="chat-input"]');
    await newChatInput.fill("Test message after refresh");
    await page.locator('[data-testid="send-button"]').click();

    await page.waitForTimeout(3000);
    await expect(newChatInput).toBeEnabled();
  });

  test("should handle invalid JSON responses gracefully", async ({ page }) => {
    // Intercept API responses and return invalid JSON
    await page.route("**/api/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "invalid json response {",
      });
    });

    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    await chatInput.fill('Create workflow "JSON Test"');
    await sendButton.click();

    // Should handle the invalid response gracefully
    await page.waitForTimeout(5000);

    const chatMessages = page.locator('[data-testid="chat-messages"]');
    const responseText = await chatMessages.textContent();

    // Should show some error message
    expect(responseText?.toLowerCase()).toMatch(/(error|failed|problem)/);

    // Application should remain functional
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();
  });

  test("should show helpful error messages for common mistakes", async ({
    page,
  }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Test common user mistakes
    const mistakes = [
      {
        input: "add task without workflow",
        expected: /workflow.*first|create.*workflow/,
      },
      { input: "delete goal xyz", expected: /not found|does not exist/ },
      { input: "update non-existent item", expected: /not found|cannot find/ },
      {
        input: "invalid command syntax",
        expected: /understand|try again|help/,
      },
    ];

    for (const mistake of mistakes) {
      await chatInput.fill(mistake.input);
      await sendButton.click();
      await page.waitForTimeout(3000);

      const chatMessages = page.locator('[data-testid="chat-messages"]');
      const responseText = await chatMessages.textContent();

      // Should provide helpful guidance
      expect(responseText?.toLowerCase()).toMatch(mistake.expected);
    }
  });
});
