/**
 * Tests for WorkflowVersioningService
 * Validates R2-based immutable version control for workflow templates
 * Uses real Cloudflare runtime (workerd) for maximum production fidelity
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { env } from "cloudflare:test";
import { WorkflowVersioningService } from "../../src/services/workflowVersioning";
import type { WorkflowTemplateV2 } from "../../src/types/workflow-v2";
import { TEST_USER_ID, getTestWorkflowId } from "../env.d.ts";

describe("WorkflowVersioningService", () => {
  let versioningService: WorkflowVersioningService;
  let testWorkflow: WorkflowTemplateV2;
  let testWorkflowId: string;

  beforeEach(() => {
    // Use real R2 bucket from Cloudflare runtime
    // The env.WORKFLOW_VERSIONS binding is automatically configured from wrangler.jsonc
    // Per-test isolation ensures each test gets a clean storage environment
    versioningService = new WorkflowVersioningService(env.WORKFLOW_VERSIONS);

    // Generate unique workflow ID for each test to ensure proper isolation
    testWorkflowId = getTestWorkflowId("versioning");

    // Create test workflow using isolated ID
    testWorkflow = {
      id: testWorkflowId,
      name: "Test Workflow",
      version: "2.0",
      objective: "Test workflow for versioning with real R2 storage",
      metadata: {
        author: TEST_USER_ID,
        created_at: "2025-01-01T00:00:00Z",
        last_modified: "2025-01-01T00:00:00Z",
        tags: ["test", "r2-runtime"],
      },
      goals: [
        {
          id: "goal1",
          name: "Test Goal",
          description: "A test goal",
          order: 1,
          constraints: [],
          policies: [],
          tasks: [],
          forms: [],
        },
      ],
    };
  });

  describe("Version Creation", () => {
    it("should save the first version of a workflow", async () => {
      const result = await versioningService.saveVersion(
        testWorkflowId,
        testWorkflow,
        {
          userId: TEST_USER_ID,
          editSummary: "Initial version",
        }
      );

      expect(result.success).toBe(true);
      expect(result.version).toBe(1);
      expect(result.filePath).toBe(`workflows/${testWorkflowId}/v1.json`);
      expect(result.skipped).toBeUndefined();

      // Verify workflow content was saved correctly by loading through service
      const savedWorkflow = await versioningService.loadVersion(testWorkflowId, 1);
      expect(savedWorkflow).not.toBeNull();
      expect(savedWorkflow).toEqual(testWorkflow);

      // Verify index was created correctly by loading through service
      const index = await versioningService.getVersionIndex(testWorkflowId);
      expect(index).not.toBeNull();
      expect(index!.templateId).toBe(testWorkflowId);
      expect(index!.currentVersion).toBe(1);
      expect(index.versions).toHaveLength(1);
      expect(index.versions[0].createdBy).toBe(TEST_USER_ID);
      expect(index.versions[0].editSummary).toBe("Initial version");

      // Verify checksum is present (real R2 provides this)
      expect(index.versions[0].checksum).toBeDefined();
      expect(index.versions[0].fileSize).toBeGreaterThan(0);
    });

    it("should save subsequent versions correctly", async () => {
      // Save first version
      await versioningService.saveVersion(testWorkflowId, testWorkflow);

      // Modify workflow
      const modifiedWorkflow = {
        ...testWorkflow,
        name: "Modified Test Workflow",
        goals: [
          ...testWorkflow.goals,
          {
            id: "goal2",
            name: "Second Goal",
            description: "A second goal",
            order: 2,
            constraints: [],
            policies: [],
            tasks: [],
            forms: [],
          },
        ],
      };

      // Save second version
      const result = await versioningService.saveVersion(
        testWorkflowId,
        modifiedWorkflow,
        {
          editSummary: "Added second goal",
        }
      );

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);
      expect(result.filePath).toBe(`workflows/${testWorkflowId}/v2.json`);

      // Verify both versions exist in real R2 bucket
      const v1Object = await env.WORKFLOW_VERSIONS.get(
        `workflows/${testWorkflowId}/v1.json`
      );
      const v2Object = await env.WORKFLOW_VERSIONS.get(
        `workflows/${testWorkflowId}/v2.json`
      );
      expect(v1Object).not.toBeNull();
      expect(v2Object).not.toBeNull();

      // Verify version content differences
      const v1Content = JSON.parse(await v1Object!.text());
      const v2Content = JSON.parse(await v2Object!.text());
      expect(v1Content.name).toBe("Test Workflow");
      expect(v2Content.name).toBe("Modified Test Workflow");
      expect(v1Content.goals).toHaveLength(1);
      expect(v2Content.goals).toHaveLength(2);

      // Verify index was updated
      const indexObject = await env.WORKFLOW_VERSIONS.get(
        `workflows/${testWorkflowId}/index.json`
      );
      const indexContent = await indexObject!.text();
      const index = JSON.parse(indexContent);
      expect(index.currentVersion).toBe(2);
      expect(index.versions).toHaveLength(2);
      expect(index.versions[1].editSummary).toBe("Added second goal");
    });

    it("should detect and skip duplicate workflows", async () => {
      // Save first version
      await versioningService.saveVersion(testWorkflowId, testWorkflow);

      // Try to save identical workflow
      const result = await versioningService.saveVersion(
        testWorkflowId,
        testWorkflow
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.version).toBe(1); // Should return current version

      // Should not have created v2.json in real R2 bucket
      const v2Object = await env.WORKFLOW_VERSIONS.get(
        `workflows/${testWorkflowId}/v2.json`
      );
      expect(v2Object).toBeNull();
    });

    it("should allow skipping duplicate check when requested", async () => {
      // Save first version
      await versioningService.saveVersion(testWorkflowId, testWorkflow);

      // Save identical workflow with skipDuplicateCheck
      const result = await versioningService.saveVersion(
        testWorkflowId,
        testWorkflow,
        {
          skipDuplicateCheck: true,
          editSummary: "Force save duplicate",
        }
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBeUndefined();
      expect(result.version).toBe(2);

      // Verify version 2 exists by loading it through the service
      // This avoids direct R2 access that might cause isolated storage issues
      const loadedWorkflow = await versioningService.loadVersion(testWorkflowId, 2);
      expect(loadedWorkflow).not.toBeNull();
      expect(loadedWorkflow?.id).toBe(testWorkflowId);
    });
  });

  describe("Version Loading", () => {
    beforeEach(async () => {
      // Set up test data with multiple versions
      await versioningService.saveVersion("test-workflow", testWorkflow);

      const modifiedWorkflow = {
        ...testWorkflow,
        name: "Modified Workflow",
      };
      await versioningService.saveVersion("test-workflow", modifiedWorkflow);
    });

    it("should load a specific version", async () => {
      const version1 = await versioningService.loadVersion("test-workflow", 1);
      const version2 = await versioningService.loadVersion("test-workflow", 2);

      expect(version1).toBeDefined();
      expect(version1!.name).toBe("Test Workflow");

      expect(version2).toBeDefined();
      expect(version2!.name).toBe("Modified Workflow");
    });

    it("should load the current version", async () => {
      const current =
        await versioningService.loadCurrentVersion("test-workflow");

      expect(current).toBeDefined();
      expect(current!.name).toBe("Modified Workflow");
    });

    it("should return null for non-existent version", async () => {
      const nonExistent = await versioningService.loadVersion(
        testWorkflowId,
        999
      );
      expect(nonExistent).toBeUndefined();
    });

    it("should return null for non-existent workflow", async () => {
      const nonExistent = await versioningService.loadCurrentVersion(
        "non-existent-workflow"
      );
      expect(nonExistent).toBeUndefined();
    });
  });

  describe("Version History", () => {
    beforeEach(async () => {
      // Create multiple versions
      await versioningService.saveVersion("test-workflow", testWorkflow, {
        editSummary: "Version 1",
      });

      const v2 = { ...testWorkflow, name: "Version 2" };
      await versioningService.saveVersion("test-workflow", v2, {
        editSummary: "Version 2",
      });

      const v3 = { ...testWorkflow, name: "Version 3" };
      await versioningService.saveVersion("test-workflow", v3, {
        editSummary: "Version 3",
      });
    });

    it("should return version history in reverse chronological order", async () => {
      const history =
        await versioningService.getVersionHistory("test-workflow");

      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(3); // Latest first
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(1);

      expect(history[0].editSummary).toBe("Version 3");
      expect(history[1].editSummary).toBe("Version 2");
      expect(history[2].editSummary).toBe("Version 1");
    });

    it("should support pagination", async () => {
      const page1 = await versioningService.getVersionHistory("test-workflow", {
        limit: 2,
      });

      expect(page1).toHaveLength(2);
      expect(page1[0].version).toBe(3);
      expect(page1[1].version).toBe(2);

      const page2 = await versioningService.getVersionHistory("test-workflow", {
        limit: 2,
        offset: 2,
      });

      expect(page2).toHaveLength(1);
      expect(page2[0].version).toBe(1);
    });

    it("should include content when requested", async () => {
      const historyWithContent = await versioningService.getVersionHistory(
        "test-workflow",
        {
          includeContent: true,
          limit: 2,
        }
      );

      expect(historyWithContent).toHaveLength(2);
      expect(historyWithContent[0].content).toBeDefined();
      expect(historyWithContent[0].content!.name).toBe("Version 3");
      expect(historyWithContent[1].content!.name).toBe("Version 2");
    });
  });

  describe("Version Reversion", () => {
    beforeEach(async () => {
      // Create multiple versions
      await versioningService.saveVersion("test-workflow", testWorkflow);

      const v2 = { ...testWorkflow, name: "Version 2" };
      await versioningService.saveVersion("test-workflow", v2);

      const v3 = { ...testWorkflow, name: "Version 3" };
      await versioningService.saveVersion("test-workflow", v3);
    });

    it("should revert to a previous version", async () => {
      const result = await versioningService.revertToVersion(
        "test-workflow",
        1,
        {
          userId: "test-user",
          editSummary: "Reverted to initial version",
        }
      );

      expect(result.success).toBe(true);
      expect(result.version).toBe(4); // New version created

      // Verify the current version is now the same as version 1
      const current =
        await versioningService.loadCurrentVersion("test-workflow");
      const original = await versioningService.loadVersion("test-workflow", 1);

      expect(current!.name).toBe(original!.name);
      expect(current!.goals).toEqual(original!.goals);

      // Verify version history shows the revert
      const history =
        await versioningService.getVersionHistory("test-workflow");
      expect(history[0].editSummary).toBe("Reverted to initial version");
    });

    it("should handle revert to non-existent version", async () => {
      const result = await versioningService.revertToVersion(
        "test-workflow",
        999
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("Version 999 not found");
    });
  });

  describe("Workflow Management", () => {
    beforeEach(async () => {
      // Create test workflows
      await versioningService.saveVersion("workflow-1", testWorkflow);
      await versioningService.saveVersion("workflow-2", {
        ...testWorkflow,
        id: "workflow-2",
        name: "Second Workflow",
      });
    });

    it("should get version index information", async () => {
      const index = await versioningService.getVersionIndex("workflow-1");

      expect(index).toBeDefined();
      expect(index!.templateId).toBe("workflow-1");
      expect(index!.currentVersion).toBe(1);
      expect(index!.versions).toHaveLength(1);
    });

    it("should list all workflows", async () => {
      const workflows = await versioningService.listWorkflows();

      expect(workflows).toHaveLength(2);

      const workflow1 = workflows.find((w) => w.templateId === "workflow-1");
      const workflow2 = workflows.find((w) => w.templateId === "workflow-2");

      expect(workflow1).toBeDefined();
      expect(workflow1!.currentVersion).toBe(1);

      expect(workflow2).toBeDefined();
      expect(workflow2!.currentVersion).toBe(1);
    });

    it("should delete a workflow and all versions", async () => {
      const workflowId = "workflow-to-delete";

      // Add multiple versions
      await versioningService.saveVersion(workflowId, testWorkflow);
      const modified = { ...testWorkflow, name: "Modified" };
      await versioningService.saveVersion(workflowId, modified);

      // Delete the workflow
      const result = await versioningService.deleteWorkflow(workflowId);

      expect(result.success).toBe(true);

      // Verify all files were deleted from real R2 bucket
      const v1Object = await env.WORKFLOW_VERSIONS.get(
        `workflows/${workflowId}/v1.json`
      );
      const v2Object = await env.WORKFLOW_VERSIONS.get(
        `workflows/${workflowId}/v2.json`
      );
      const indexObject = await env.WORKFLOW_VERSIONS.get(
        `workflows/${workflowId}/index.json`
      );

      expect(v1Object).toBeNull();
      expect(v2Object).toBeNull();
      expect(indexObject).toBeNull();
    });
  });

  describe("Error Handling", () => {
    // These tests use mock R2 buckets to simulate failure scenarios
    // while keeping integration tests with real R2 runtime elsewhere

    it("should handle R2 put failures gracefully", async () => {
      // Create a mock R2 bucket that fails on put operations
      const failingR2Bucket = {
        get: vi.fn().mockResolvedValue(null), // Allow get to succeed for initial checks
        put: vi.fn().mockRejectedValue(new Error("R2 put operation failed")),
        delete: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue({ objects: [] })
      };

      const failingService = new WorkflowVersioningService(failingR2Bucket as any);

      const result = await failingService.saveVersion(
        testWorkflowId,
        testWorkflow,
        {
          userId: TEST_USER_ID,
          editSummary: "Test save with R2 failure"
        }
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("R2 put operation failed");
      expect(failingR2Bucket.put).toHaveBeenCalled();
    });

    it("should handle R2 get failures gracefully", async () => {
      // Create a mock R2 bucket that fails on workflow file gets but allows index operations
      const failingR2Bucket = {
        get: vi.fn().mockImplementation(async (key: string) => {
          // Allow index operations to succeed (return null = no index exists yet)
          if (key.includes('/index.json')) {
            return null;
          }
          // Fail workflow file operations
          throw new Error("R2 get operation failed");
        }),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue({ objects: [] })
      };

      const failingService = new WorkflowVersioningService(failingR2Bucket as any);

      // Test loadCurrentVersion with get failure - should return undefined since no index exists
      const workflow = await failingService.loadCurrentVersion(testWorkflowId);
      expect(workflow).toBeUndefined();
      expect(failingR2Bucket.get).toHaveBeenCalled();

      // Test loadVersion with get failure - should return undefined due to file get failure
      const versionWorkflow = await failingService.loadVersion(testWorkflowId, 1);
      expect(versionWorkflow).toBeUndefined();
    });

    it("should handle corrupted index files", async () => {
      // Save a valid version first
      await versioningService.saveVersion(testWorkflowId, testWorkflow);

      // Manually corrupt the index file by writing invalid JSON
      await env.WORKFLOW_VERSIONS.put(
        `workflows/${testWorkflowId}/index.json`,
        "invalid json content"
      );

      // SLC MVP: Should throw error instead of recovering
      await expect(
        versioningService.saveVersion(testWorkflowId, {
          ...testWorkflow,
          name: "After corruption",
        })
      ).rejects.toThrow(`Corrupted workflow index: ${testWorkflowId}`);
    });
  });

  describe("Data Integrity", () => {
    it("should generate and validate checksums", async () => {
      await versioningService.saveVersion(testWorkflowId, testWorkflow);

      // Check that checksum was stored in version metadata through service
      const index = await versioningService.getVersionIndex(testWorkflowId);
      expect(index).not.toBeNull();
      expect(index!.versions).toHaveLength(1);
      const version = index!.versions[0];
      expect(version.checksum).toBeDefined();
      expect(version.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("should include file size in version metadata", async () => {
      const result = await versioningService.saveVersion(
        testWorkflowId,
        testWorkflow
      );

      const index = await versioningService.getVersionIndex(testWorkflowId);
      const version = index!.versions.find((v) => v.version === result.version);

      expect(version!.fileSize).toBeDefined();
      expect(version!.fileSize).toBeGreaterThan(0);
    });
  });
});
