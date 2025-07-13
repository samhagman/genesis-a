import { chromium } from "@playwright/test";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log("Navigating to app...");
  await page.goto("http://localhost:5175");
  await page.waitForTimeout(3000);

  // Look for the Trash icon button specifically
  console.log("Looking for clear/trash button...");
  const trashButton = await page
    .locator('button:has(svg[viewBox*="256"]:has(path[d*="M190"]))')
    .first();

  if ((await trashButton.count()) > 0) {
    console.log("Found trash button, clicking to clear history...");
    await trashButton.click();
    await page.waitForTimeout(2000);
  }

  // Check if input is now enabled
  const inputEnabled = await page
    .locator('[data-testid="chat-input"]')
    .isEnabled();
  console.log(`Chat input enabled: ${inputEnabled}`);

  if (inputEnabled) {
    console.log("Success! Chat is now ready for input.");
  } else {
    console.log(
      "Chat is still blocked. There may be other pending operations."
    );
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();
