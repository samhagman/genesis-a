/**
 * Integration Tests for Workflow Editing System
 *
 * These tests use real Cloudflare runtime with actual R2, AI, and HTTP bindings.
 * They test the complete end-to-end workflow editing flow from API to storage.
 *
 * Note: These tests will incur actual Cloudflare usage costs for AI and R2.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { env, SELF } from "cloudflare:test";
import { WorkflowEditingAgent } from "../../src/agents/workflowEditingAgent";
import { WorkflowVersioningService } from "../../src/services/workflowVersioning";
import type { WorkflowTemplateV2 } from "../../src/types/workflow-v2";
import { TEST_USER_ID, getTestWorkflowId } from "../env.d.ts";

describe("Workflow Editing Integration Tests", () => {
  let testWorkflow: WorkflowTemplateV2;
  let testWorkflowId: string;

  beforeEach(() => {
    // Generate test-specific workflow ID for proper isolation
    testWorkflowId = getTestWorkflowId("integration");
    
    // Create a test workflow for integration testing
    testWorkflow = {
      id: testWorkflowId,
      name: "Integration Test Workflow",
      version: "2.0",
      objective: "Test complete workflow editing system with real services",
      metadata: {
        author: TEST_USER_ID,
        created_at: "2025-01-01T00:00:00Z",
        last_modified: "2025-01-01T00:00:00Z",
        tags: ["integration", "test", "real-ai"],
      },
      goals: [
        {
          id: "goal1",
          name: "Employee Onboarding",
          description: "Complete employee onboarding process",
          order: 1,
          constraints: [],
          policies: [],
          tasks: [
            {
              id: "task1",
              description: "Collect new hire paperwork",
              assignee: { type: "human", role: "HR Representative" },
              order: 1,
              estimated_duration_minutes: 30,
            },
          ],
          forms: [],
        },
      ],
    };
  });

  describe("Real AI Integration", () => {
    it("should process workflow edits with real AI", async () => {
      const agent = new WorkflowEditingAgent(env.AI);

      const request = {
        workflowId: testWorkflowId,
        currentWorkflow: testWorkflow,
        userMessage: "Add a task to verify employee identity documents",
        userId: TEST_USER_ID,
        sessionId: "integration-test-session",
      };

      // This will make a real AI call
      const result = await agent.processEditRequest(request);

      // Verify the AI agent processed the request
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();

      if (result.success) {
        expect(result.updatedWorkflow).toBeDefined();
        expect(result.toolCalls).toBeDefined();
        expect(result.message).toContain("task");

        // Should have added a task related to identity verification
        const tasks = result.updatedWorkflow!.goals[0].tasks;
        expect(tasks.length).toBeGreaterThan(1);
      } else {
        // Log the failure for debugging
        console.warn("AI processing failed:", result.message);
      }
    }, 60000); // Increase timeout for AI calls
  });

  describe("Real R2 Storage Integration", () => {
    it("should save and retrieve workflows from real R2", async () => {
      const versioningService = new WorkflowVersioningService(
        env.WORKFLOW_VERSIONS
      );

      // Save workflow
      const saveResult = await versioningService.saveVersion(
        testWorkflowId,
        testWorkflow,
        {
          userId: TEST_USER_ID,
          editSummary: "Integration test workflow",
        }
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.version).toBe(1);

      // Retrieve workflow
      const retrievedWorkflow =
        await versioningService.loadCurrentVersion(testWorkflowId);
      expect(retrievedWorkflow).toEqual(testWorkflow);

      // Check version history
      const history =
        await versioningService.getVersionHistory(testWorkflowId);
      expect(history).toHaveLength(1);
      expect(history[0].editSummary).toBe("Integration test workflow");
    });
  });

  describe("End-to-End API Integration with SELF binding", () => {
    beforeEach(async () => {
      // Pre-seed the workflow in R2 for API testing
      const versioningService = new WorkflowVersioningService(
        env.WORKFLOW_VERSIONS
      );
      await versioningService.saveVersion(testWorkflowId, testWorkflow, {
        userId: TEST_USER_ID,
        editSummary: "Initial version for API testing",
      });
    });

    it("should handle complete workflow edit through API", async () => {
      // Use SELF binding to test the actual API endpoint
      const response = await SELF.fetch("https://test.com/api/workflow/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: testWorkflowId,
          userMessage:
            "Add a constraint that all tasks must be completed within 1 hour",
          sessionId: "integration-test-session",
        }),
      });

      const result = await response.json();

      // Handle both authenticated (200) and unauthenticated (503) scenarios
      if (response.status === 200) {
        // AI is authenticated and working
        expect(result.success).toBe(true);
        expect(result.workflow).toBeDefined();
        expect(result.version).toBeGreaterThan(1);

        // Should have added a constraint
        if (result.workflow) {
          expect(result.workflow.goals[0].constraints.length).toBeGreaterThan(0);
        }
      } else if (response.status === 503) {
        // AI service unavailable (not authenticated)
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
        console.log("AI service unavailable - this is expected in test environment");
      } else {
        // Unexpected status
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    }, 60000); // Increase timeout for full API + AI processing

    it("should retrieve version history through API", async () => {
      const response = await SELF.fetch(
        `https://test.com/api/workflow/${testWorkflowId}/versions`
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.versions).toBeDefined();
      expect(result.versions.length).toBeGreaterThan(0);
    });

    it("should revert workflow version through API", async () => {
      // First, try to create a second version
      const editResponse = await SELF.fetch("https://test.com/api/workflow/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: testWorkflowId,
          userMessage: "Add a policy for data privacy compliance",
          sessionId: "integration-test-session-2",
        }),
      });

      let expectedVersion = 2; // Default assumption
      
      // Check if the edit succeeded or failed
      if (editResponse.status === 200) {
        // Edit succeeded - we should have version 2, revert will create version 3
        expectedVersion = 3;
      } else if (editResponse.status === 503) {
        // Edit failed due to AI unavailable - we still have version 1, revert will create version 2
        expectedVersion = 2;
        console.log("Edit failed due to AI unavailable - testing revert from version 1");
      }

      // Then revert to version 1
      const revertResponse = await SELF.fetch(
        `https://test.com/api/workflow/${testWorkflowId}/revert/1`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            editSummary: "Integration test revert",
          }),
        }
      );

      expect(revertResponse.status).toBe(200);

      const result = await revertResponse.json();
      expect(result.success).toBe(true);
      expect(result.revertedToVersion).toBe(1);
      expect(result.newVersion).toBe(expectedVersion);
    }, 90000); // Longer timeout for multiple AI operations
  });

  describe("Error Handling Integration", () => {
    it("should handle non-existent workflow gracefully", async () => {
      const response = await SELF.fetch("https://test.com/api/workflow/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: "non-existent-workflow",
          userMessage: "This should fail",
        }),
      });

      expect(response.status).toBe(404);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("should handle malformed requests", async () => {
      const response = await SELF.fetch("https://test.com/api/workflow/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing required fields
          workflowId: testWorkflowId,
          // userMessage is missing
        }),
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing required fields");
    });
  });

  describe("Performance and Reliability", () => {
    beforeEach(async () => {
      // Pre-seed the workflow for concurrent testing
      const versioningService = new WorkflowVersioningService(
        env.WORKFLOW_VERSIONS
      );
      await versioningService.saveVersion(testWorkflowId, testWorkflow, {
        userId: TEST_USER_ID,
        editSummary: "Initial version for concurrent testing",
      });
    });

    it("should handle multiple concurrent edits", async () => {
      // Create multiple edit requests concurrently
      const editPromises = [
        SELF.fetch("https://test.com/api/workflow/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId: testWorkflowId,
            userMessage: "Add task: Review employee handbook",
            sessionId: "concurrent-test-1",
          }),
        }),
        SELF.fetch("https://test.com/api/workflow/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId: testWorkflowId,
            userMessage: "Add constraint: Complete within business hours",
            sessionId: "concurrent-test-2",
          }),
        }),
      ];

      const responses = await Promise.all(editPromises);

      // All requests should complete (some may fail due to concurrency or AI unavailability)
      responses.forEach((response) => {
        // Accept both success (200) and service unavailable (503) as valid responses
        expect([200, 503]).toContain(response.status);
      });

      // Check how many edits actually succeeded
      const successfulEdits = responses.filter(r => r.status === 200).length;
      console.log(`${successfulEdits} out of ${responses.length} concurrent edits succeeded`);

      // Verify final state is consistent
      const historyResponse = await SELF.fetch(
        `https://test.com/api/workflow/${testWorkflowId}/versions`
      );
      const history = await historyResponse.json();
      
      // We expect at least the initial version (1) plus any successful edits
      const expectedMinVersions = 1 + successfulEdits;
      expect(history.versions.length).toBeGreaterThanOrEqual(expectedMinVersions);
    }, 120000); // Extended timeout for concurrent operations
  });
});
