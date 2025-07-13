import { chromium } from "@playwright/test";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("Navigating to app...");
  await page.goto("http://localhost:5175");

  // Wait for page to load
  await page.waitForTimeout(2000);

  // Check for data-testid attributes
  console.log("\nChecking data-testid attributes:");

  const chatPanel = await page.locator('[data-testid="chat-panel"]').count();
  console.log(`✓ chat-panel found: ${chatPanel > 0}`);

  const chatInput = await page.locator('[data-testid="chat-input"]').count();
  console.log(`✓ chat-input found: ${chatInput > 0}`);

  const sendButton = await page.locator('[data-testid="send-button"]').count();
  console.log(`✓ send-button found: ${sendButton > 0}`);

  const chatMessages = await page
    .locator('[data-testid="chat-messages"]')
    .count();
  console.log(`✓ chat-messages found: ${chatMessages > 0}`);

  const workflowPanel = await page
    .locator('[data-testid="workflow-panel"]')
    .count();
  console.log(`✓ workflow-panel found: ${workflowPanel > 0}`);

  const inspectorPanel = await page
    .locator('[data-testid="inspector-panel"]')
    .count();
  console.log(`✓ inspector-panel found: ${inspectorPanel > 0}`);

  // Check if there's a pending confirmation
  const confirmDialog = await page
    .locator('[data-testid="confirmation-dialog"]')
    .count();
  if (confirmDialog > 0) {
    console.log(
      "\n⚠️  Found pending confirmation dialog - this is blocking the UI"
    );
    const rejectButton = await page.locator('[data-testid="cancel-button"]');
    if ((await rejectButton.count()) > 0) {
      console.log("Clicking reject to clear the confirmation...");
      await rejectButton.click();
      await page.waitForTimeout(1000);
    }
  }

  // Check if input is enabled after clearing
  let inputEnabled = await page
    .locator('[data-testid="chat-input"]')
    .isEnabled();
  console.log(`\n✓ Chat input enabled: ${inputEnabled}`);

  if (!inputEnabled) {
    console.log("\nTrying to clear chat history...");
    // Look for the trash/clear button
    const clearButton = await page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .last();
    if ((await clearButton.count()) > 0) {
      await clearButton.click();
      await page.waitForTimeout(1000);
      inputEnabled = await page
        .locator('[data-testid="chat-input"]')
        .isEnabled();
      console.log(`✓ Chat input enabled after clear: ${inputEnabled}`);
    }
  }

  // Try to send a test message if enabled
  if (inputEnabled) {
    console.log("\nSending test message...");
    await page.locator('[data-testid="chat-input"]').fill("Hello test");
    await page.locator('[data-testid="send-button"]').click();
    await page.waitForTimeout(2000);

    const messagesFound = await page
      .locator('[data-testid="chat-messages"]')
      .textContent();
    console.log(`✓ Messages found: ${messagesFound?.includes("Hello test")}`);
  }

  await browser.close();
  console.log("\nTest complete!");
})();
