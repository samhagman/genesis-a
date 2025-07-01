import { test, expect } from "@playwright/test";

/**
 * Human-in-the-Loop Confirmation Workflow Tests
 *
 * Tests destructive operations that require user confirmation,
 * ensuring proper safeguards are in place for critical actions.
 */

test.describe("Confirmation Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Genesis", {
      timeout: 30000,
    });

    // Create a test workflow with content for deletion tests
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    await chatInput.fill(
      'Create workflow "Deletion Test" with goal "Test Goal" and task "Test Task"'
    );
    await sendButton.click();
    await page.waitForTimeout(3000);
  });

  test("should require confirmation for goal deletion", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Attempt to delete a goal
    await chatInput.fill('Delete the "Test Goal" goal');
    await sendButton.click();

    // Should show confirmation dialog
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="confirmation-message"]')
    ).toContainText("delete");
    await expect(
      page.locator('[data-testid="confirmation-message"]')
    ).toContainText("Test Goal");

    // Should have confirm and cancel buttons
    await expect(page.locator('[data-testid="confirm-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
  });

  test("should complete deletion when confirmed", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Delete goal
    await chatInput.fill('Delete the "Test Goal" goal');
    await sendButton.click();

    // Wait for confirmation dialog and confirm
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="confirm-button"]').click();

    // Goal should be removed from workflow panel
    await expect(
      page.locator('[data-testid="workflow-panel"]')
    ).not.toContainText("Test Goal", { timeout: 10000 });

    // Should show success message
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
      "deleted",
      { timeout: 10000 }
    );
  });

  test("should cancel deletion when user cancels", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Delete goal
    await chatInput.fill('Delete the "Test Goal" goal');
    await sendButton.click();

    // Wait for confirmation dialog and cancel
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="cancel-button"]').click();

    // Goal should still exist
    await expect(page.locator('[data-testid="workflow-panel"]')).toContainText(
      "Test Goal"
    );

    // Dialog should be closed
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).not.toBeVisible();
  });

  test("should require confirmation for task deletion", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Attempt to delete a task
    await chatInput.fill('Delete the "Test Task" task');
    await sendButton.click();

    // Should show confirmation dialog
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="confirmation-message"]')
    ).toContainText("delete");
    await expect(
      page.locator('[data-testid="confirmation-message"]')
    ).toContainText("Test Task");
  });

  test("should handle multiple confirmations in sequence", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Add another goal and task first
    await chatInput.fill('Add goal "Second Goal" with task "Second Task"');
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Delete first goal
    await chatInput.fill('Delete the "Test Goal" goal');
    await sendButton.click();
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="confirm-button"]').click();
    await page.waitForTimeout(2000);

    // Delete second goal
    await chatInput.fill('Delete the "Second Goal" goal');
    await sendButton.click();
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="confirm-button"]').click();

    // Both goals should be removed
    await expect(
      page.locator('[data-testid="workflow-panel"]')
    ).not.toContainText("Test Goal", { timeout: 10000 });
    await expect(
      page.locator('[data-testid="workflow-panel"]')
    ).not.toContainText("Second Goal");
  });

  test("should require confirmation for workflow deletion", async ({
    page,
  }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Attempt to delete entire workflow
    await chatInput.fill("Delete the entire workflow");
    await sendButton.click();

    // Should show confirmation with strong warning
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="confirmation-message"]')
    ).toContainText("delete");
    await expect(
      page.locator('[data-testid="confirmation-message"]')
    ).toContainText("workflow");

    // Should emphasize the destructive nature
    const confirmationText = await page
      .locator('[data-testid="confirmation-message"]')
      .textContent();
    expect(confirmationText?.toLowerCase()).toMatch(
      /(warning|permanent|cannot.*undo|irreversible)/
    );
  });

  test("should show appropriate warnings for destructive actions", async ({
    page,
  }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Test deletion of goal with tasks
    await chatInput.fill('Delete the "Test Goal" goal');
    await sendButton.click();

    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });

    // Should warn about associated tasks being deleted
    const warningText = await page
      .locator('[data-testid="confirmation-message"]')
      .textContent();
    expect(warningText?.toLowerCase()).toMatch(/(task|content|associated)/);
  });

  test("should prevent accidental deletions with keyboard shortcuts", async ({
    page,
  }) => {
    // Test that common deletion shortcuts don't work without confirmation
    await page.keyboard.press("Delete");
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).not.toBeVisible();

    await page.keyboard.press("Backspace");
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).not.toBeVisible();

    // Content should still exist
    await expect(page.locator('[data-testid="workflow-panel"]')).toContainText(
      "Test Goal"
    );
  });

  test("should handle confirmation dialog closing via escape key", async ({
    page,
  }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Trigger confirmation dialog
    await chatInput.fill('Delete the "Test Goal" goal');
    await sendButton.click();

    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });

    // Close with escape key
    await page.keyboard.press("Escape");

    // Dialog should close and goal should remain
    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).not.toBeVisible();
    await expect(page.locator('[data-testid="workflow-panel"]')).toContainText(
      "Test Goal"
    );
  });

  test("should show confirmation details about impact", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Add multiple tasks to goal first
    await chatInput.fill('Add task "Task 1" and "Task 2" to Test Goal');
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Try to delete goal
    await chatInput.fill('Delete the "Test Goal" goal');
    await sendButton.click();

    await expect(
      page.locator('[data-testid="confirmation-dialog"]')
    ).toBeVisible({ timeout: 15000 });

    // Should show count of items that will be affected
    const confirmationMessage = page.locator(
      '[data-testid="confirmation-message"]'
    );
    const messageText = await confirmationMessage.textContent();

    // Should mention the number of tasks or items affected
    expect(messageText).toMatch(/\d+.*task/i);
  });
});
