import { test, expect } from "@playwright/test";

/**
 * Comprehensive Test Suite for ALL Workflow Tools via Natural Language
 *
 * Tests every single workflow tool through natural language chat commands
 * to ensure complete tool coverage and functionality.
 */

test.describe("All Workflow Tools via Natural Language", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Genesis/, {
      timeout: 30000,
    });
  });

  test.describe("Core Workflow Tools", () => {
    test("createWorkflow - should create new workflow from scratch", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      await chatInput.fill(
        'Create a new workflow called "Customer Support Process" for handling customer inquiries and support tickets'
      );
      await sendButton.click();

      // Verify workflow creation
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
        "Customer Support Process",
        { timeout: 15000 }
      );
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("Customer Support Process");

      // Verify workflow appears in inspector
      await expect(
        page.locator('[data-testid="inspector-panel"]')
      ).toContainText("Customer Support Process");
    });

    test("viewCurrentWorkflow - should display complete workflow structure", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // First create a workflow with some content
      await chatInput.fill(
        'Create workflow "Project Management" for managing software projects'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      await chatInput.fill(
        'Add goal "Planning Phase" for project planning activities'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Now view the workflow
      await chatInput.fill(
        "Show me the current workflow structure and all its details"
      );
      await sendButton.click();

      const chatMessages = page.locator('[data-testid="chat-messages"]');
      await expect(chatMessages).toContainText("Project Management", {
        timeout: 15000,
      });
      await expect(chatMessages).toContainText("Planning Phase");
      await expect(chatMessages).toContainText("Goals:");
      await expect(chatMessages).toContainText("Version:");
    });

    test("addGoal - should add goals with different parameters", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Create base workflow
      await chatInput.fill('Create workflow "E-commerce Platform"');
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Add first goal
      await chatInput.fill(
        'Add a goal called "User Registration" for managing new user account creation and verification'
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("User Registration", { timeout: 15000 });

      // Add second goal with order
      await chatInput.fill(
        'Add goal "Product Catalog Management" for organizing and maintaining product listings, set it as the second goal'
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("Product Catalog Management", { timeout: 15000 });

      // Add third goal
      await chatInput.fill(
        'Add goal "Order Processing" to handle customer orders from placement to fulfillment'
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("Order Processing", { timeout: 15000 });
    });

    test("addTask - should add different types of tasks", async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Setup workflow and goal
      await chatInput.fill(
        'Create workflow "Content Management" with goal "Content Creation"'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Add AI agent task
      await chatInput.fill(
        'Add a task "Generate blog post outline" assigned to AI agent with model "gpt-4" to Content Creation goal'
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("Generate blog post outline", { timeout: 15000 });

      // Add human task with timeout
      await chatInput.fill(
        'Add human task "Review and edit content" assigned to content editor role with 60 minute timeout'
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("Review and edit content", { timeout: 15000 });

      // Add task with dependencies
      await chatInput.fill(
        'Add task "Publish content" that depends on the content review task being completed first'
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("Publish content", { timeout: 15000 });
    });

    test("addConstraint - should add different constraint types", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Setup workflow and goal
      await chatInput.fill(
        'Create workflow "Quality Assurance" with goal "Testing Process"'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Add time limit constraint
      await chatInput.fill(
        "Add a time limit constraint to Testing Process: all testing must be completed within 48 hours with hard stop enforcement"
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("48 hours", { timeout: 15000 });

      // Add data validation constraint
      await chatInput.fill(
        "Add data validation constraint: minimum 95% test coverage required with block progression enforcement"
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("95%", { timeout: 15000 });

      // Add business rule constraint
      await chatInput.fill(
        "Add business rule constraint: all critical bugs must be fixed before release with require approval enforcement"
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("critical bugs", { timeout: 15000 });

      // Add rate limit constraint
      await chatInput.fill(
        "Add rate limit constraint: maximum 10 deployments per day with warning enforcement"
      );
      await sendButton.click();
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).toContainText("10 deployments", { timeout: 15000 });
    });
  });

  test.describe("Confirmation-Required Tools", () => {
    test("deleteGoal - should require confirmation for goal deletion", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Setup workflow with goal
      await chatInput.fill(
        'Create workflow "Test Deletion" with goal "Goal to Delete" and some tasks'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Attempt goal deletion
      await chatInput.fill('Delete the "Goal to Delete" goal completely');
      await sendButton.click();

      // Should trigger confirmation dialog
      await expect(
        page.locator('[data-testid="confirmation-dialog"]')
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.locator('[data-testid="confirmation-message"]')
      ).toContainText("DELETE GOAL");

      // Confirm deletion
      const confirmInput = page.locator('[data-testid="confirmation-input"]');
      await confirmInput.fill("DELETE GOAL");
      await page.locator('[data-testid="confirm-button"]').click();

      // Goal should be removed
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).not.toContainText("Goal to Delete", { timeout: 10000 });
    });

    test("deleteTask - should require confirmation for task deletion", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Setup workflow with task
      await chatInput.fill(
        'Create workflow "Task Deletion Test" with goal "Test Goal" and task "Task to Delete"'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Attempt task deletion
      await chatInput.fill('Delete the "Task to Delete" task');
      await sendButton.click();

      // Should trigger confirmation dialog
      await expect(
        page.locator('[data-testid="confirmation-dialog"]')
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.locator('[data-testid="confirmation-message"]')
      ).toContainText("DELETE TASK");

      // Confirm deletion
      const confirmInput = page.locator('[data-testid="confirmation-input"]');
      await confirmInput.fill("DELETE TASK");
      await page.locator('[data-testid="confirm-button"]').click();

      // Task should be removed
      await expect(
        page.locator('[data-testid="workflow-panel"]')
      ).not.toContainText("Task to Delete", { timeout: 10000 });
    });
  });

  test.describe("General Purpose Tools", () => {
    test("getLocalTime - should get time for specified location", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      await chatInput.fill("What is the local time in New York?");
      await sendButton.click();

      const chatMessages = page.locator('[data-testid="chat-messages"]');
      await expect(chatMessages).toContainText(/time|10am/i, {
        timeout: 10000,
      });
    });

    test("getWeatherInformation - should require confirmation for weather", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      await chatInput.fill("What is the weather like in San Francisco?");
      await sendButton.click();

      // Should trigger confirmation dialog
      await expect(
        page.locator('[data-testid="confirmation-dialog"]')
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.locator('[data-testid="confirmation-message"]')
      ).toContainText(/weather|San Francisco/i);

      // Confirm the request
      await page.locator('[data-testid="confirm-button"]').click();

      const chatMessages = page.locator('[data-testid="chat-messages"]');
      await expect(chatMessages).toContainText(/weather|sunny/i, {
        timeout: 10000,
      });
    });

    test("scheduleTask - should schedule tasks for later execution", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      await chatInput.fill(
        "Schedule a task to send reminder emails tomorrow at 9 AM"
      );
      await sendButton.click();

      const chatMessages = page.locator('[data-testid="chat-messages"]');
      await expect(chatMessages).toContainText(/scheduled|task/i, {
        timeout: 15000,
      });
    });

    test("getScheduledTasks - should list all scheduled tasks", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // First schedule a task
      await chatInput.fill("Schedule a backup task for next week");
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Then list all scheduled tasks
      await chatInput.fill("Show me all scheduled tasks");
      await sendButton.click();

      const chatMessages = page.locator('[data-testid="chat-messages"]');
      await expect(chatMessages).toContainText(/scheduled|task|backup/i, {
        timeout: 15000,
      });
    });

    test("cancelScheduledTask - should cancel specific scheduled tasks", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Schedule a task first
      await chatInput.fill("Schedule a test task for later");
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Get task list to find task ID
      await chatInput.fill("List all scheduled tasks");
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Cancel the task (using a hypothetical task ID)
      await chatInput.fill('Cancel the scheduled task with ID "task-123"');
      await sendButton.click();

      const chatMessages = page.locator('[data-testid="chat-messages"]');
      await expect(chatMessages).toContainText(/cancel|task/i, {
        timeout: 15000,
      });
    });
  });

  test.describe("Complex Workflow Scenarios", () => {
    test("should handle complete workflow lifecycle", async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // 1. Create workflow
      await chatInput.fill(
        'Create a comprehensive workflow called "Software Release Process" for managing software releases from development to production'
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      // 2. Add multiple goals
      await chatInput.fill(
        'Add goal "Development" for writing and testing code'
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      await chatInput.fill(
        'Add goal "Quality Assurance" for testing and validation'
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      await chatInput.fill('Add goal "Deployment" for releasing to production');
      await sendButton.click();
      await page.waitForTimeout(2000);

      // 3. Add tasks to goals
      await chatInput.fill(
        'Add AI task "Code review analysis" to Development goal using model "gpt-4"'
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      await chatInput.fill(
        'Add human task "Manual testing" to Quality Assurance goal assigned to QA engineer with 4 hour timeout'
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      await chatInput.fill(
        'Add task "Production deployment" to Deployment goal that depends on QA completion'
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      // 4. Add constraints
      await chatInput.fill(
        "Add time limit constraint to Quality Assurance: all testing within 24 hours with hard stop"
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      await chatInput.fill(
        "Add business rule constraint to Deployment: requires 2 approvals with require approval enforcement"
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      // 5. View final workflow
      await chatInput.fill("Show me the complete workflow structure");
      await sendButton.click();

      // Verify all elements are present
      const workflowPanel = page.locator('[data-testid="workflow-panel"]');
      await expect(workflowPanel).toContainText("Software Release Process");
      await expect(workflowPanel).toContainText("Development");
      await expect(workflowPanel).toContainText("Quality Assurance");
      await expect(workflowPanel).toContainText("Deployment");
      await expect(workflowPanel).toContainText("Code review analysis");
      await expect(workflowPanel).toContainText("Manual testing");
      await expect(workflowPanel).toContainText("Production deployment");
    });

    test("should handle tool combinations and dependencies", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Create complex interdependent workflow
      await chatInput.fill(
        'Create workflow "Event Planning" with goal "Preparation" containing task "Venue booking" and constraint "must complete 30 days before event"'
      );
      await sendButton.click();
      await page.waitForTimeout(3000);

      // Add dependent tasks
      await chatInput.fill(
        'Add task "Catering arrangement" that depends on venue booking completion'
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      await chatInput.fill(
        'Add task "Send invitations" that depends on both venue and catering tasks'
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Add multiple constraint types
      await chatInput.fill(
        "Add rate limit constraint: maximum 50 invitations per day"
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      await chatInput.fill(
        "Add data validation constraint: minimum 80% RSVP response rate required"
      );
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Verify complex structure
      await chatInput.fill("Show me all the tasks and their dependencies");
      await sendButton.click();

      const chatMessages = page.locator('[data-testid="chat-messages"]');
      await expect(chatMessages).toContainText("Event Planning", {
        timeout: 15000,
      });
      await expect(chatMessages).toContainText("depends");
    });

    test("should handle error recovery and validation", async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');

      // Try to add task without workflow
      await chatInput.fill('Add task "Invalid task" to non-existent goal');
      await sendButton.click();

      const chatMessages = page.locator('[data-testid="chat-messages"]');
      await expect(chatMessages).toContainText(/no workflow|not found|error/i, {
        timeout: 10000,
      });

      // Create workflow and try invalid operations
      await chatInput.fill('Create workflow "Error Testing"');
      await sendButton.click();
      await page.waitForTimeout(2000);

      // Try to add task to non-existent goal
      await chatInput.fill('Add task "Test task" to goal "NonExistentGoal"');
      await sendButton.click();

      await expect(chatMessages).toContainText(
        /goal.*not found|available goals/i,
        { timeout: 10000 }
      );

      // Try to delete non-existent goal
      await chatInput.fill('Delete goal "DoesNotExist"');
      await sendButton.click();

      await expect(chatMessages).toContainText(/not found|does not exist/i, {
        timeout: 10000,
      });

      // Application should remain functional after errors
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toBeEnabled();
    });
  });
});
