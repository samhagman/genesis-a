import { test, expect } from "@playwright/test";
import { setupTest, clearChatState } from "./helpers/test-setup";

test.describe("Persistent Chat History", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto("/");

    // Wait for the app to load
    await expect(page).toHaveTitle(/Genesis/, { timeout: 30000 });
    await page.waitForSelector('[data-testid="chat-panel"]', {
      timeout: 10000,
    });

    // Clear any pending state
    await clearChatState(page);
  });

  async function closeTemplateSelector(page) {
    // Close template selector dropdown by clicking the overlay
    const overlay = page.locator(".fixed.inset-0.z-40");
    if ((await overlay.count()) > 0) {
      await overlay.click();
      await page.waitForTimeout(500);
    }
  }

  async function switchToTemplate(page, templateName) {
    // Open the template dropdown - use first() to avoid ambiguity
    await page
      .locator(".flex.items-center.gap-2.px-3.py-2.bg-neutral-100")
      .first()
      .click();
    await page.waitForTimeout(500);

    // Click on the template - be more specific with the selector
    const templateButton = page
      .locator(`[role="button"]:has-text("${templateName}")`)
      .first();
    await templateButton.click();
    await page.waitForTimeout(1000);

    // Close dropdown if still open
    await closeTemplateSelector(page);
  }

  test("should persist messages when switching between templates", async ({
    page,
  }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Step 1: Select InstaWork template
    await switchToTemplate(page, "InstaWork");

    // Step 2: Send a message in InstaWork
    const instaWorkMessage = "Testing InstaWork workflow persistence!";
    await chatInput.fill(instaWorkMessage);
    await sendButton.click();

    // Wait for message to appear
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
      instaWorkMessage,
      { timeout: 5000 }
    );

    // Step 3: Switch to Employee Onboarding template
    await switchToTemplate(page, "Employee Onboarding");

    // Step 4: Send a message in Employee Onboarding
    const employeeMessage = "Testing Employee Onboarding persistence!";
    await chatInput.fill(employeeMessage);
    await sendButton.click();

    // Wait for message to appear
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
      employeeMessage,
      { timeout: 5000 }
    );

    // Step 5: Switch back to InstaWork
    await switchToTemplate(page, "InstaWork");

    // Step 6: Verify InstaWork message is still there
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
      instaWorkMessage
    );

    // Step 7: Verify conversation continuation banner
    const continuationBanner = page
      .locator(".bg-blue-50, .dark\\:bg-blue-900\\/20")
      .filter({
        hasText: /Continuing previous conversation from/,
      });
    await expect(continuationBanner).toBeVisible();
  });

  test("should clear template-specific history", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Step 1: Select InstaWork template and send a message
    await switchToTemplate(page, "InstaWork");

    const message = "Message to be cleared";
    await chatInput.fill(message);
    await sendButton.click();

    // Wait for message to appear
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
      message,
      { timeout: 5000 }
    );

    // Step 2: Open dropdown menu - look for the three dots menu button
    const dropdownButton = page
      .locator('[data-testid="chat-panel"]')
      .locator("button")
      .filter({
        has: page.locator("svg"),
      })
      .last();
    await dropdownButton.click();

    // Step 3: Click clear template history
    await page.click("text=Clear InstaWork History");

    // Step 4: Verify message is gone
    await expect(
      page.locator('[data-testid="chat-messages"]')
    ).not.toContainText(message);

    // Step 5: Verify continuation banner is gone
    const continuationBanner = page
      .locator(".bg-blue-50, .dark\\:bg-blue-900\\/20")
      .filter({
        hasText: /Continuing previous conversation from/,
      });
    await expect(continuationBanner).not.toBeVisible();
  });

  test("should display continuation banner with correct date", async ({
    page,
  }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Step 1: Select a template
    await switchToTemplate(page, "InstaWork");

    // Step 2: Send a message
    const message = "Testing continuation banner";
    await chatInput.fill(message);
    await sendButton.click();

    // Wait for message to appear
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
      message,
      { timeout: 5000 }
    );

    // Step 3: Switch to another template and back
    await switchToTemplate(page, "Employee Onboarding");

    // Switch back
    await switchToTemplate(page, "InstaWork");

    // Step 4: Verify continuation banner shows today's date
    const continuationBanner = page
      .locator(".bg-blue-50, .dark\\:bg-blue-900\\/20")
      .filter({
        hasText: /Continuing previous conversation from/,
      });
    await expect(continuationBanner).toBeVisible();

    // Check that it contains today's date
    const today = new Date().toLocaleDateString();
    await expect(continuationBanner).toContainText(today);
  });

  test("should handle multiple messages correctly", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Step 1: Select InstaWork template
    await switchToTemplate(page, "InstaWork");

    // Step 2: Send multiple messages with proper waiting
    const messages = [
      "First message in InstaWork",
      "Second message in InstaWork",
      "Third message in InstaWork",
    ];

    for (const msg of messages) {
      // Wait for input to be ready
      await chatInput.waitFor({ state: "visible" });
      await chatInput.waitFor({ state: "enabled" });

      // Fill and send message
      await chatInput.fill(msg);
      await sendButton.click();

      // Wait for message to appear
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
        msg,
        { timeout: 5000 }
      );

      // Wait for any processing
      await page.waitForTimeout(1000);
    }

    // Step 3: Switch to another template and back
    await switchToTemplate(page, "Employee Onboarding");

    // Switch back
    await switchToTemplate(page, "InstaWork");

    // Step 4: Verify all messages are still there
    for (const msg of messages) {
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
        msg
      );
    }
  });
});
