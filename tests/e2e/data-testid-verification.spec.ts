import { test, expect } from "@playwright/test";

/**
 * Verification test for data-testid attributes
 * This test ensures all required data-testid attributes are present
 */

test.describe("Data TestID Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Give the app time to fully load
    await page.waitForTimeout(3000);
  });

  test("should have all required data-testid attributes", async ({ page }) => {
    // Core layout components
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible();

    // Chat components
    await expect(page.locator('[data-testid="chat-messages"]')).toBeVisible();

    // Check if chat is blocked by confirmation
    const confirmDialog = await page
      .locator('[data-testid="confirmation-dialog"]')
      .count();
    if (confirmDialog > 0) {
      console.log("Found confirmation dialog with proper data-testid");
      await expect(
        page.locator('[data-testid="confirm-button"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="confirmation-message"]')
      ).toBeVisible();

      // Clear the confirmation
      await page.locator('[data-testid="cancel-button"]').click();
      await page.waitForTimeout(1000);
    }

    // Now check chat input elements
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
  });

  test("should allow chat interaction when not blocked", async ({ page }) => {
    // Handle any blocking confirmations first
    const confirmDialog = await page
      .locator('[data-testid="confirmation-dialog"]')
      .count();
    if (confirmDialog > 0) {
      await page.locator('[data-testid="cancel-button"]').click();
      await page.waitForTimeout(1000);
    }

    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Wait for input to be enabled
    await expect(chatInput).toBeEnabled({ timeout: 10000 });

    // Type a message
    await chatInput.fill("Test message");
    await expect(chatInput).toHaveValue("Test message");

    // Verify send button is enabled
    await expect(sendButton).toBeEnabled();
  });
});
