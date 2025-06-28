/**
 * Tests for WorkflowVersioningService
 * Validates R2-based immutable version control for workflow templates
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { WorkflowVersioningService } from "../../src/services/workflowVersioning";
import type { WorkflowTemplateV2 } from "../../src/types/workflow-v2";

describe("WorkflowVersioningService", () => {
  let mockR2: any;
  let versioningService: WorkflowVersioningService;
  let testWorkflow: WorkflowTemplateV2;

  beforeEach(() => {
    // Mock R2 bucket
    const storage = new Map<
      string,
      { content: string; metadata?: any; customMetadata?: any }
    >();

    mockR2 = {
      put: vi.fn(async (key: string, content: any, options?: any) => {
        const contentStr =
          typeof content === "string"
            ? content
            : new TextDecoder().decode(content);
        storage.set(key, {
          content: contentStr,
          metadata: options?.httpMetadata,
          customMetadata: options?.customMetadata,
        });
        return Promise.resolve();
      }),

      get: vi.fn(async (key: string) => {
        const item = storage.get(key);
        if (!item) return null;

        return {
          text: () => Promise.resolve(item.content),
          customMetadata: item.customMetadata || {},
          httpMetadata: item.metadata || {},
        };
      }),

      delete: vi.fn(async (key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),

      list: vi.fn(async (options?: { prefix?: string }) => {
        const keys = Array.from(storage.keys());
        const filteredKeys = options?.prefix
          ? keys.filter((key) => key.startsWith(options.prefix!))
          : keys;

        return {
          objects: filteredKeys.map((key) => ({
            key,
            size: storage.get(key)?.content.length || 0,
            uploaded: new Date(),
            etag: "mock-etag",
          })),
        };
      }),

      // Helper for tests
      _storage: storage,
      _clear: () => storage.clear(),
    };

    versioningService = new WorkflowVersioningService(mockR2, "test-bucket");

    // Create test workflow
    testWorkflow = {
      id: "test-workflow",
      name: "Test Workflow",
      version: "2.0",
      objective: "Test workflow for versioning",
      metadata: {
        author: "test-author",
        created_at: "2025-01-01T00:00:00Z",
        last_modified: "2025-01-01T00:00:00Z",
        tags: ["test"],
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
        "test-workflow",
        testWorkflow,
        {
          userId: "test-user",
          editSummary: "Initial version",
        }
      );

      expect(result.success).toBe(true);
      expect(result.version).toBe(1);
      expect(result.filePath).toBe("workflows/test-workflow/v1.json");
      expect(result.skipped).toBeUndefined();

      // Check that files were created
      expect(mockR2.put).toHaveBeenCalledTimes(2); // workflow + index

      // Verify workflow content was saved
      const workflowContent = mockR2._storage.get(
        "workflows/test-workflow/v1.json"
      );
      expect(workflowContent).toBeDefined();
      expect(JSON.parse(workflowContent.content)).toEqual(testWorkflow);

      // Verify index was created
      const indexContent = mockR2._storage.get(
        "workflows/test-workflow/index.json"
      );
      expect(indexContent).toBeDefined();

      const index = JSON.parse(indexContent.content);
      expect(index.templateId).toBe("test-workflow");
      expect(index.currentVersion).toBe(1);
      expect(index.versions).toHaveLength(1);
      expect(index.versions[0].createdBy).toBe("test-user");
      expect(index.versions[0].editSummary).toBe("Initial version");
    });

    it("should save subsequent versions correctly", async () => {
      // Save first version
      await versioningService.saveVersion("test-workflow", testWorkflow);

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
        "test-workflow",
        modifiedWorkflow,
        {
          editSummary: "Added second goal",
        }
      );

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);
      expect(result.filePath).toBe("workflows/test-workflow/v2.json");

      // Verify both versions exist
      expect(mockR2._storage.has("workflows/test-workflow/v1.json")).toBe(true);
      expect(mockR2._storage.has("workflows/test-workflow/v2.json")).toBe(true);

      // Verify index was updated
      const indexContent = mockR2._storage.get(
        "workflows/test-workflow/index.json"
      );
      const index = JSON.parse(indexContent.content);
      expect(index.currentVersion).toBe(2);
      expect(index.versions).toHaveLength(2);
      expect(index.versions[1].editSummary).toBe("Added second goal");
    });

    it("should detect and skip duplicate workflows", async () => {
      // Save first version
      await versioningService.saveVersion("test-workflow", testWorkflow);

      // Try to save identical workflow
      const result = await versioningService.saveVersion(
        "test-workflow",
        testWorkflow
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.version).toBe(1); // Should return current version

      // Should not have created v2.json
      expect(mockR2._storage.has("workflows/test-workflow/v2.json")).toBe(
        false
      );
    });

    it("should allow skipping duplicate check when requested", async () => {
      // Save first version
      await versioningService.saveVersion("test-workflow", testWorkflow);

      // Save identical workflow with skipDuplicateCheck
      const result = await versioningService.saveVersion(
        "test-workflow",
        testWorkflow,
        {
          skipDuplicateCheck: true,
          editSummary: "Force save duplicate",
        }
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBeUndefined();
      expect(result.version).toBe(2);

      // Should have created v2.json
      expect(mockR2._storage.has("workflows/test-workflow/v2.json")).toBe(true);
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
        "test-workflow",
        999
      );
      expect(nonExistent).toBeNull();
    });

    it("should return null for non-existent workflow", async () => {
      const nonExistent = await versioningService.loadCurrentVersion(
        "non-existent-workflow"
      );
      expect(nonExistent).toBeNull();
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
      // Add multiple versions to workflow-1
      const modified = { ...testWorkflow, name: "Modified" };
      await versioningService.saveVersion("workflow-1", modified);

      // Delete the workflow
      const result = await versioningService.deleteWorkflow("workflow-1");

      expect(result.success).toBe(true);

      // Verify all files were deleted
      expect(mockR2._storage.has("workflows/workflow-1/v1.json")).toBe(false);
      expect(mockR2._storage.has("workflows/workflow-1/v2.json")).toBe(false);
      expect(mockR2._storage.has("workflows/workflow-1/index.json")).toBe(
        false
      );

      // Verify workflow-2 still exists
      expect(mockR2._storage.has("workflows/workflow-2/v1.json")).toBe(true);
      expect(mockR2._storage.has("workflows/workflow-2/index.json")).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle R2 put failures gracefully", async () => {
      mockR2.put.mockRejectedValueOnce(new Error("R2 service unavailable"));

      const result = await versioningService.saveVersion(
        "test-workflow",
        testWorkflow
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("R2 service unavailable");
    });

    it("should handle R2 get failures gracefully", async () => {
      mockR2.get.mockRejectedValueOnce(new Error("R2 service unavailable"));

      const workflow = await versioningService.loadVersion("test-workflow", 1);

      expect(workflow).toBeNull();
    });

    it("should handle corrupted index files", async () => {
      // Save a valid version first
      await versioningService.saveVersion("test-workflow", testWorkflow);

      // Corrupt the index file
      mockR2._storage.set("workflows/test-workflow/index.json", {
        content: "invalid json content",
      });

      // SLC MVP: Should throw error instead of recovering
      await expect(
        versioningService.saveVersion("test-workflow", {
          ...testWorkflow,
          name: "After corruption",
        })
      ).rejects.toThrow("Corrupted workflow index: test-workflow");
    });
  });

  describe("Data Integrity", () => {
    it("should generate and validate checksums", async () => {
      await versioningService.saveVersion("test-workflow", testWorkflow);

      // Check that checksum was stored
      const workflowData = mockR2._storage.get(
        "workflows/test-workflow/v1.json"
      );
      expect(workflowData.customMetadata.checksum).toBeDefined();
      expect(workflowData.customMetadata.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("should include file size in version metadata", async () => {
      const result = await versioningService.saveVersion(
        "test-workflow",
        testWorkflow
      );

      const index = await versioningService.getVersionIndex("test-workflow");
      const version = index!.versions.find((v) => v.version === result.version);

      expect(version!.fileSize).toBeDefined();
      expect(version!.fileSize).toBeGreaterThan(0);
    });
  });
});
