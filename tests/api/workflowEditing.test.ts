/**
 * Tests for Workflow Editing API Endpoints
 * Validates HTTP API integration with WorkflowEditingAgent and WorkflowVersioningService
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WorkflowEditingAPI,
  routeWorkflowEditingAPI,
  validateWorkflowEditingEnv,
} from "../../src/api/workflowEditing";
import type { WorkflowTemplateV2 } from "../../src/types/workflow-v2";

describe("WorkflowEditingAPI", () => {
  let mockEnv: WorkflowEditingEnv;
  let api: WorkflowEditingAPI;
  let testWorkflow: WorkflowTemplateV2;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    // Mock Cloudflare Workers AI
    const mockAi = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          toolCalls: [
            {
              tool: "addTask",
              params: {
                goalId: "goal1",
                task: {
                  description: "Test task",
                  assignee: { type: "ai_agent", model: "test" },
                },
              },
            },
          ],
          reasoning: "Added task as requested",
        }),
      }),
    };

    // Mock R2 bucket
    const storage = new Map<
      string,
      {
        content: string;
        metadata?: Record<string, unknown>;
        customMetadata?: Record<string, unknown>;
      }
    >();
    const mockR2 = {
      put: vi.fn(
        async (
          key: string,
          content: string | Uint8Array,
          options?: Record<string, unknown>
        ) => {
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
        }
      ),
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
      _storage: storage,
      _clear: () => storage.clear(),
    };

    mockEnv = {
      AI: mockAi,
      WORKFLOW_VERSIONS: mockR2,
      OPENAI_API_KEY: "test-key",
      Chat: {},
    };

    api = new WorkflowEditingAPI(mockEnv);

    // Create test workflow
    testWorkflow = {
      id: "test-workflow",
      name: "Test Workflow",
      version: "2.0",
      objective: "Test workflow for API validation",
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

    // Pre-populate storage with test workflow
    storage.set("workflows/test-workflow/v1.json", {
      content: JSON.stringify(testWorkflow, null, 2),
    });

    storage.set("workflows/test-workflow/index.json", {
      content: JSON.stringify({
        templateId: "test-workflow",
        currentVersion: 1,
        versions: [
          {
            version: 1,
            templateId: "test-workflow",
            createdAt: "2025-01-01T00:00:00Z",
            createdBy: "test-user",
            editSummary: "Initial version",
            filePath: "workflows/test-workflow/v1.json",
            fileSize: JSON.stringify(testWorkflow).length,
          },
        ],
        createdAt: "2025-01-01T00:00:00Z",
        lastModified: "2025-01-01T00:00:00Z",
      }),
    });
  });

  describe("Environment Validation", () => {
    it("should validate proper environment configuration", () => {
      expect(validateWorkflowEditingEnv(mockEnv)).toBe(true);
    });

    it("should reject environment missing AI binding", () => {
      const { AI, ...envWithoutAI } = mockEnv;
      expect(validateWorkflowEditingEnv(envWithoutAI)).toBe(false);
    });

    it("should reject environment missing R2 binding", () => {
      const { WORKFLOW_VERSIONS, ...envWithoutR2 } = mockEnv;
      expect(validateWorkflowEditingEnv(envWithoutR2)).toBe(false);
    });
  });

  describe("POST /api/workflow/edit", () => {
    it("should successfully process a workflow edit request", async () => {
      const request = new Request("https://example.com/api/workflow/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "test-workflow",
          userMessage: "Add a new task to the first goal",
          userId: "test-user",
        }),
      });

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.workflow.goals[0].tasks).toHaveLength(1);
      expect(result.message).toContain("Successfully");
      expect(result.version).toBe(2); // Should create new version
      expect(result.auditLog).toBeDefined();
    });

    it("should reject requests with missing required fields", async () => {
      const request = new Request("https://example.com/api/workflow/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "test-workflow",
          // Missing userMessage
        }),
      });

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing required fields");
    });

    it("should handle non-existent workflow", async () => {
      const request = new Request("https://example.com/api/workflow/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "non-existent-workflow",
          userMessage: "Add a task",
        }),
      });

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("should handle AI agent failures gracefully", async () => {
      // Create fresh API instance with failing AI mock
      const failingAi = {
        run: vi.fn().mockRejectedValue(new Error("AI service unavailable")),
      };

      const failingEnv = { ...mockEnv, AI: failingAi };
      const failingApi = new WorkflowEditingAPI(failingEnv);

      const request = new Request("https://example.com/api/workflow/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "test-workflow",
          userMessage: "Add a task",
        }),
      });

      const response = await failingApi.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(503);
      expect(result.success).toBe(false);
      expect(result.message).toContain("An error occurred while processing");
    });
  });

  describe("GET /api/workflow/{id}/versions", () => {
    beforeEach(async () => {
      // Add more versions for testing
      const v2Workflow = { ...testWorkflow, name: "Updated Workflow" };
      mockEnv.WORKFLOW_VERSIONS._storage.set(
        "workflows/test-workflow/v2.json",
        {
          content: JSON.stringify(v2Workflow, null, 2),
        }
      );

      const updatedIndex = {
        templateId: "test-workflow",
        currentVersion: 2,
        versions: [
          {
            version: 1,
            templateId: "test-workflow",
            createdAt: "2025-01-01T00:00:00Z",
            createdBy: "test-user",
            editSummary: "Initial version",
            filePath: "workflows/test-workflow/v1.json",
            fileSize: JSON.stringify(testWorkflow).length,
          },
          {
            version: 2,
            templateId: "test-workflow",
            createdAt: "2025-01-01T01:00:00Z",
            createdBy: "test-user",
            editSummary: "Updated workflow name",
            filePath: "workflows/test-workflow/v2.json",
            fileSize: JSON.stringify(v2Workflow).length,
          },
        ],
        createdAt: "2025-01-01T00:00:00Z",
        lastModified: "2025-01-01T01:00:00Z",
      };

      mockEnv.WORKFLOW_VERSIONS._storage.set(
        "workflows/test-workflow/index.json",
        {
          content: JSON.stringify(updatedIndex),
        }
      );
    });

    it("should return version history", async () => {
      const request = new Request(
        "https://example.com/api/workflow/test-workflow/versions"
      );

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.workflowId).toBe("test-workflow");
      expect(result.versions).toHaveLength(2);
      expect(result.versions[0].version).toBe(2); // Latest first
      expect(result.versions[1].version).toBe(1);
    });

    it("should support pagination parameters", async () => {
      const request = new Request(
        "https://example.com/api/workflow/test-workflow/versions?limit=1&offset=0"
      );

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.versions).toHaveLength(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.offset).toBe(0);
    });

    it("should include content when requested", async () => {
      const request = new Request(
        "https://example.com/api/workflow/test-workflow/versions?includeContent=true&limit=1"
      );

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.versions[0].content).toBeDefined();
      expect(result.versions[0].content.name).toBe("Updated Workflow");
    });
  });

  describe("GET /api/workflow/{id}/version/{v}", () => {
    it("should return specific workflow version", async () => {
      const request = new Request(
        "https://example.com/api/workflow/test-workflow/version/1"
      );

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.workflowId).toBe("test-workflow");
      expect(result.version).toBe(1);
      expect(result.workflow).toBeDefined();
      expect(result.workflow.name).toBe("Test Workflow");
      expect(result.metadata).toBeDefined();
    });

    it("should handle invalid version numbers", async () => {
      const request = new Request(
        "https://example.com/api/workflow/test-workflow/version/invalid"
      );

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid version number");
    });

    it("should handle non-existent versions", async () => {
      const request = new Request(
        "https://example.com/api/workflow/test-workflow/version/999"
      );

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("POST /api/workflow/{id}/revert/{v}", () => {
    it("should revert workflow to previous version", async () => {
      // First create version 2 and update index
      const v2Workflow = { ...testWorkflow, name: "Updated Workflow" };
      mockEnv.WORKFLOW_VERSIONS._storage.set(
        "workflows/test-workflow/v2.json",
        {
          content: JSON.stringify(v2Workflow, null, 2),
        }
      );

      // Update index to reflect version 2 as current
      const updatedIndex = {
        templateId: "test-workflow",
        currentVersion: 2,
        versions: [
          {
            version: 1,
            templateId: "test-workflow",
            createdAt: "2025-01-01T00:00:00Z",
            createdBy: "test-user",
            editSummary: "Initial version",
            filePath: "workflows/test-workflow/v1.json",
            fileSize: JSON.stringify(testWorkflow).length,
          },
          {
            version: 2,
            templateId: "test-workflow",
            createdAt: "2025-01-01T01:00:00Z",
            createdBy: "test-user",
            editSummary: "Updated workflow name",
            filePath: "workflows/test-workflow/v2.json",
            fileSize: JSON.stringify(v2Workflow).length,
          },
        ],
        createdAt: "2025-01-01T00:00:00Z",
        lastModified: "2025-01-01T01:00:00Z",
      };

      mockEnv.WORKFLOW_VERSIONS._storage.set(
        "workflows/test-workflow/index.json",
        {
          content: JSON.stringify(updatedIndex),
        }
      );

      const request = new Request(
        "https://example.com/api/workflow/test-workflow/revert/1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "test-user",
            editSummary: "Reverting to initial version",
          }),
        }
      );

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.revertedToVersion).toBe(1);
      expect(result.newVersion).toBe(3); // Creates new version
      expect(result.workflow).toBeDefined();
    });

    it("should handle revert to non-existent version", async () => {
      const request = new Request(
        "https://example.com/api/workflow/test-workflow/revert/999",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed to revert");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid API endpoints", async () => {
      const request = new Request("https://example.com/api/invalid");

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid API endpoint");
    });

    it("should handle unsupported methods", async () => {
      const request = new Request("https://example.com/api/workflow/edit", {
        method: "GET", // Should be POST
      });

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Endpoint not found");
    });

    it("should handle malformed JSON requests", async () => {
      const request = new Request("https://example.com/api/workflow/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const response = await api.handleRequest(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed to process edit request");
    });
  });

  describe("Route Helper Functions", () => {
    it("should route workflow editing requests correctly", async () => {
      const request = new Request(
        "https://example.com/api/workflow/test-workflow/versions"
      );

      const response = await routeWorkflowEditingAPI(request, mockEnv);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);
    });

    it("should return null for non-workflow API requests", async () => {
      const request = new Request("https://example.com/other/endpoint");

      const response = await routeWorkflowEditingAPI(request, mockEnv);

      expect(response).toBeNull();
    });
  });
});
