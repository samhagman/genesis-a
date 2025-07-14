import { test, expect } from "@playwright/test";

test.describe("Template Switch Bug Reproduction", () => {
  test("chat should change when switching between templates", async ({
    page,
  }) => {
    // Navigate to the application
    await page.goto("/");

    // Wait for the app to load
    await expect(page).toHaveTitle(/Genesis/, { timeout: 30000 });
    await page.waitForSelector('[data-testid="chat-panel"]', {
      timeout: 10000,
    });

    // Step 1: Open Employee Onboarding Process V2 workflow template
    console.log("Step 1: Opening Employee Onboarding Process V2");
    await page.click(".flex.items-center.gap-2.px-3.py-2.bg-neutral-100");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "test-screenshots/01-dropdown-open.png",
      fullPage: true,
    });

    await page.click('button:has-text("Employee Onboarding Process V2")');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: "test-screenshots/02-employee-onboarding-selected.png",
      fullPage: true,
    });

    // Step 2: Send a message and wait for response
    console.log("Step 2: Sending message in Employee Onboarding");
    const chatInput = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await chatInput.fill("hi");
    await sendButton.click();

    // Wait for AI response
    await page.waitForTimeout(3000); // Give time for AI response
    await page.screenshot({
      path: "test-screenshots/03-employee-onboarding-chat.png",
      fullPage: true,
    });

    // Verify we have messages in the chat
    const employeeMessages = await page
      .locator('[data-testid="chat-messages"]')
      .textContent();
    console.log("Employee Onboarding chat content:", employeeMessages);

    // Step 3: Switch to InstaWork Shift Filling Workflow
    console.log("Step 3: Switching to InstaWork template");
    await page.click(".flex.items-center.gap-2.px-3.py-2.bg-neutral-100");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "test-screenshots/04-dropdown-open-again.png",
      fullPage: true,
    });

    await page.click('button:has-text("InstaWork Shift Filling Workflow")');
    await page.waitForTimeout(2000); // Give time for template switch
    await page.screenshot({
      path: "test-screenshots/05-instawork-selected.png",
      fullPage: true,
    });

    // Step 4: Verify chat has changed
    console.log("Step 4: Verifying chat has changed");
    const instaworkMessages = await page
      .locator('[data-testid="chat-messages"]')
      .textContent();
    console.log("InstaWork chat content:", instaworkMessages);

    await page.screenshot({
      path: "test-screenshots/06-instawork-chat-final.png",
      fullPage: true,
    });

    // The bug: chat should be different but it's not
    if (
      employeeMessages === instaworkMessages &&
      employeeMessages?.includes("hi")
    ) {
      console.error(
        "BUG CONFIRMED: Chat did not change when switching templates!"
      );
      console.error("Both chats contain:", employeeMessages);
    } else {
      console.log("Chat changed correctly!");
      console.log("Employee chat:", employeeMessages);
      console.log("InstaWork chat:", instaworkMessages);
    }

    // Additional verification - check template name in UI
    const currentTemplate = await page
      .locator(".flex.items-center.gap-2.px-3.py-2.bg-neutral-100")
      .first()
      .textContent();
    console.log("Current template shown:", currentTemplate);

    expect(currentTemplate).toContain("InstaWork");

    // The test should fail if the chat content is the same
    expect(employeeMessages).not.toBe(instaworkMessages);
  });
});
