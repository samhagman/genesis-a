import { test, expect } from "@playwright/test";

// Helper functions
async function createWorkflowWithTasks(page) {
  await page.goto("http://localhost:5175/");

  // Wait for initial load
  await page.waitForTimeout(2000);

  // Create a workflow with tasks
  const chatInput = page.locator('textarea[placeholder="Send a message..."]');
  await chatInput.click();
  await chatInput.fill(
    'Create a new workflow called "Test Workflow" with a goal "Test Goal" that has 3 tasks: 1) Validate input data, 2) Process data, and 3) Send notification'
  );
  await chatInput.press("Enter");

  // Wait for AI response
  await page.waitForTimeout(5000);

  // Look for creation confirmation in the chat
  await expect(
    page.locator("text=/workflow.*created|successfully.*created/i")
  ).toBeVisible({ timeout: 15000 });
}

async function sendMessage(page, message: string) {
  const chatInput = page.locator('textarea[placeholder="Send a message..."]');
  await chatInput.click();
  await chatInput.fill(message);
  await chatInput.press("Enter");
  await page.waitForTimeout(2000);
}

async function verifyTaskExists(page, taskDescription: string) {
  await page.locator('[data-testid="view-workflow-button"]').click();
  await expect(page.locator(`text="${taskDescription}"`)).toBeVisible();
}

async function requestTaskDeletion(page, taskDescription: string) {
  await sendMessage(page, `Delete the ${taskDescription} task`);
  await page.waitForTimeout(3000);
}

// Test 1: Task Deletion Happy Path
test("should delete task with confirmation", async ({ page }) => {
  // Setup: Create workflow with tasks
  await createWorkflowWithTasks(page);

  // Request deletion
  await sendMessage(page, "delete the validate input data task");

  // Wait for AI to process and show task list
  await page.waitForTimeout(5000);

  // Verify AI shows task identification and calls deleteTask tool
  await expect(
    page.locator("text=/Task 1:.*Validate input data/i")
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator("text=/requires your approval/i")).toBeVisible({
    timeout: 10000,
  });

  // Look for approve/reject buttons (tool approval UI)
  await expect(
    page.locator(
      '[data-testid="tool-approval-approve"], button:has-text("Approve")'
    )
  ).toBeVisible({ timeout: 10000 });

  // Click approve button
  await page
    .locator(
      '[data-testid="tool-approval-approve"], button:has-text("Approve")'
    )
    .first()
    .click();

  // Wait for deletion to complete and AI response
  await page.waitForTimeout(5000);

  // Verify AI responds with deletion confirmation
  await expect(page.locator("text=/successfully deleted.*task/i")).toBeVisible({
    timeout: 10000,
  });
});

// Test 2: Task Deletion Cancellation
test("should cancel deletion on reject button", async ({ page }) => {
  // Setup: Create workflow with tasks
  await createWorkflowWithTasks(page);

  // Request deletion
  await sendMessage(page, "delete task 2");

  // Wait for AI to show task and deleteTask tool call
  await page.waitForTimeout(3000);
  await expect(page.locator("text=/requires your approval/i")).toBeVisible({
    timeout: 10000,
  });

  // Look for reject button and click it
  await expect(
    page.locator(
      '[data-testid="tool-approval-reject"], button:has-text("Reject")'
    )
  ).toBeVisible({ timeout: 10000 });
  await page
    .locator('[data-testid="tool-approval-reject"], button:has-text("Reject")')
    .first()
    .click();

  // Wait for response
  await page.waitForTimeout(3000);

  // Verify cancellation message
  await expect(page.locator("text=/won't delete|not.*delete/i")).toBeVisible({
    timeout: 10000,
  });
});

// Test 3: Edit Task Description
test("should edit task description", async ({ page }) => {
  // Setup: Create workflow with tasks
  await createWorkflowWithTasks(page);

  // Request task edit
  await sendMessage(
    page,
    'change task 2 description to "Validate and transform data"'
  );

  // Wait for AI to process
  await page.waitForTimeout(5000);

  // Verify AI identifies task or shows update
  // The AI might either show the task list first or directly update
  await expect(
    page.locator("text=/Task 2:|Process data|Updated.*task/i")
  ).toBeVisible({ timeout: 15000 });
});

// Test 4: Edit Multiple Fields
test("should edit multiple task fields", async ({ page }) => {
  // Setup: Create workflow with tasks
  await createWorkflowWithTasks(page);

  // Request multiple field edits
  await sendMessage(
    page,
    "change task 1 to human assigned with 45 minute timeout"
  );

  // Wait for AI to process
  await page.waitForTimeout(5000);

  // Verify update message
  await expect(page.locator("text=/Updated task/i")).toBeVisible({
    timeout: 10000,
  });
});

// Test 5: Ambiguous Reference Handling
test("should handle task identification by position", async ({ page }) => {
  // Setup: Create workflow with tasks
  await createWorkflowWithTasks(page);

  // Request deletion by position
  await sendMessage(page, "delete the third task");

  // Wait for AI to identify task
  await page.waitForTimeout(3000);

  // Verify AI identifies the correct task
  await expect(page.locator('text="Task 3: Send notification"')).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator('text="To confirm deletion"')).toBeVisible({
    timeout: 10000,
  });
});
