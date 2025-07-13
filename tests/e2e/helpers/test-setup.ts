import type { Page } from "@playwright/test";

/**
 * Clear any pending confirmations or blocked state in the chat interface
 */
export async function clearChatState(page: Page) {
  // Check if there's a pending confirmation dialog
  const confirmDialog = await page
    .locator('[data-testid="confirmation-dialog"]')
    .count();
  if (confirmDialog > 0) {
    console.log("Found pending confirmation dialog, rejecting...");
    const cancelButton = page.locator('[data-testid="cancel-button"]');
    if ((await cancelButton.count()) > 0) {
      await cancelButton.click();
      await page.waitForTimeout(1000);
    }
  }

  // Check if input is disabled due to pending operations
  const chatInput = page.locator('[data-testid="chat-input"]');
  const inputDisabled = await chatInput.isDisabled();

  if (inputDisabled) {
    // Try clicking the trash/clear history button
    const clearButtons = await page
      .locator("button")
      .filter({ hasText: /trash/i })
      .all();
    for (const button of clearButtons) {
      try {
        await button.click();
        await page.waitForTimeout(1000);
        break;
      } catch (e) {
        // Continue to next button
      }
    }
  }

  // Wait for chat to be ready
  await page
    .waitForSelector('[data-testid="chat-input"]:not([disabled])', {
      timeout: 10000,
      state: "attached",
    })
    .catch(() => {
      console.warn("Chat input still disabled after cleanup attempts");
    });
}

/**
 * Standard test setup for e2e tests
 */
export async function setupTest(page: Page) {
  // Navigate to the application
  await page.goto("/");

  // Wait for basic elements to load
  await page.waitForSelector('[data-testid="chat-panel"]', { timeout: 10000 });

  // Clear any pending state
  await clearChatState(page);

  // Verify we're ready to test
  const chatInput = page.locator('[data-testid="chat-input"]');
  const sendButton = page.locator('[data-testid="send-button"]');

  await chatInput.waitFor({ state: "visible", timeout: 5000 });
  await sendButton.waitFor({ state: "visible", timeout: 5000 });
}
