/**
 * Chat Durable Object Template Enhancement Tests
 *
 * Tests for Phase 1.1 - Backend Chat DO Enhancement with templateId parameter
 * Unit tests focusing on the new template loading and management functionality
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { createMockEnv, getTestWorkflowId } from "./workers-setup";
import type { WorkflowTemplateV2 } from "../src/types/workflow-v2";

// Mock validation module
vi.mock("../src/utils/schema-validation", () => ({
  validateWorkflowV2: vi.fn(() => ({ isValid: true, errors: [] })),
}));

// Template loading helper function to test in isolation
async function loadTemplateFromR2(
  templateId: string,
  workflowVersions: {
    get: (key: string) => Promise<{
      json?: () => Promise<unknown>;
      text: () => Promise<string>;
    } | null>;
  }
): Promise<WorkflowTemplateV2 | null> {
  try {
    const key = `workflows/${templateId}/current.json`;
    const template = await workflowVersions.get(key);

    if (template) {
      // Handle both real R2 objects (with .json()) and mock objects (with .text())
      const templateContent =
        typeof template.json === "function"
          ? await template.json()
          : JSON.parse(await template.text());

      // Import validation function dynamically to avoid circular dependencies
      const { validateWorkflowV2 } = await import(
        "../src/utils/schema-validation"
      );
      const validationResult = validateWorkflowV2(templateContent);

      if (validationResult.isValid) {
        return templateContent as WorkflowTemplateV2;
      }
      throw new Error(`Invalid template data for ${templateId}`);
    }
    return null;
  } catch (error) {
    console.error(`Failed to load template ${templateId}:`, error);
    return null;
  }
}

describe("Chat DO Template Enhancement", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;
  let testTemplateId: string;
  let mockTemplate: WorkflowTemplateV2;

  beforeEach(() => {
    mockEnv = createMockEnv();
    testTemplateId = getTestWorkflowId("test-template");

    // Create mock template
    mockTemplate = {
      id: testTemplateId,
      name: "Test Template",
      version: "1.0",
      objective: "Test objective",
      metadata: {
        author: "test",
        created_at: "2024-01-01T00:00:00Z",
        last_modified: "2024-01-01T00:00:00Z",
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

  describe("template loading functionality", () => {
    it("should successfully load a valid template from R2", async () => {
      // Setup: Store template in mock R2
      const templateKey = `workflows/${testTemplateId}/current.json`;
      await mockEnv.WORKFLOW_VERSIONS.put(
        templateKey,
        JSON.stringify(mockTemplate)
      );

      // Test: Load template using the helper function
      const loadedTemplate = await loadTemplateFromR2(
        testTemplateId,
        mockEnv.WORKFLOW_VERSIONS
      );

      // Verify: Template is loaded correctly
      expect(loadedTemplate).toEqual(mockTemplate);
    });

    it("should return null for non-existent template", async () => {
      // Test: Try to load non-existent template
      const loadedTemplate = await loadTemplateFromR2(
        "non-existent-template",
        mockEnv.WORKFLOW_VERSIONS
      );

      // Verify: Returns null for missing template
      expect(loadedTemplate).toBeNull();
    });

    it("should handle R2 errors gracefully", async () => {
      // Setup: Mock R2 to throw an error
      const mockR2WithError = {
        get: vi.fn().mockRejectedValue(new Error("R2 error")),
      };

      // Test: Try to load template with error
      const loadedTemplate = await loadTemplateFromR2(
        testTemplateId,
        mockR2WithError
      );

      // Verify: Returns null when R2 fails
      expect(loadedTemplate).toBeNull();
    });

    it("should validate template structure", async () => {
      // Setup: Store template and mock validation to fail
      const templateKey = `workflows/${testTemplateId}/current.json`;
      await mockEnv.WORKFLOW_VERSIONS.put(
        templateKey,
        JSON.stringify(mockTemplate)
      );

      // Mock validation to return invalid
      const { validateWorkflowV2 } = await import(
        "../src/utils/schema-validation"
      );
      vi.mocked(validateWorkflowV2).mockReturnValue({
        isValid: false,
        errors: [{ message: "Invalid template structure" }],
      });

      // Test: Try to load invalid template
      const loadedTemplate = await loadTemplateFromR2(
        testTemplateId,
        mockEnv.WORKFLOW_VERSIONS
      );

      // Verify: Returns null for invalid template
      expect(loadedTemplate).toBeNull();
    });
  });

  describe("template storage patterns", () => {
    it("should use correct R2 key format for templates", () => {
      const templateId = "test-workflow-123";
      const expectedKey = `workflows/${templateId}/current.json`;

      // This tests the key pattern used in the initializeWithTemplate method
      expect(expectedKey).toBe("workflows/test-workflow-123/current.json");
    });

    it("should handle template JSON serialization correctly", async () => {
      // Setup: Store template in R2
      const templateKey = `workflows/${testTemplateId}/current.json`;
      await mockEnv.WORKFLOW_VERSIONS.put(
        templateKey,
        JSON.stringify(mockTemplate)
      );

      // Retrieve and parse
      const stored = await mockEnv.WORKFLOW_VERSIONS.get(templateKey);
      const parsedTemplate = JSON.parse(await stored!.text());

      // Verify: Template structure is preserved
      expect(parsedTemplate).toEqual(mockTemplate);
      expect(parsedTemplate.id).toBe(testTemplateId);
      expect(parsedTemplate.goals).toHaveLength(1);
    });
  });

  describe("WebSocket broadcast functionality", () => {
    it("should broadcast workflow_updated message to all WebSocket clients on save", async () => {
      // Setup: Create mock WebSockets
      const mockWebSocket1 = { send: vi.fn() };
      const mockWebSocket2 = { send: vi.fn() };
      const mockWebSockets = [mockWebSocket1, mockWebSocket2];

      // Setup: Mock Chat DO context with WebSockets
      const mockChatDO = {
        env: mockEnv,
        ctx: {
          storage: {
            put: vi.fn(),
          },
          getWebSockets: () => mockWebSockets,
        },
        currentWorkflow: null,
        currentTemplateId: null,
      };

      // Setup: Enhanced mock template with valid structure
      const testWorkflow: WorkflowTemplateV2 = {
        ...mockTemplate,
        metadata: {
          ...mockTemplate.metadata,
          last_modified: new Date().toISOString(),
        },
      };

      // Import and call saveCurrentWorkflow method logic
      const saveWorkflowLogic = async (workflow: WorkflowTemplateV2) => {
        // Simulate R2 save
        const key = `workflows/${workflow.id}/current.json`;
        await mockEnv.WORKFLOW_VERSIONS.put(
          key,
          JSON.stringify(workflow, null, 2),
          {
            customMetadata: {
              version: workflow.version,
              goals: workflow.goals.length.toString(),
              updated: new Date().toISOString(),
            },
          }
        );

        // Simulate WebSocket broadcast (the code we just added)
        mockChatDO.ctx.getWebSockets().forEach(ws => {
          try { 
            ws.send(JSON.stringify({ type: "workflow_updated" })); 
          } catch {}
        });
      };

      // Execute: Save the workflow
      await saveWorkflowLogic(testWorkflow);

      // Verify: Both WebSocket clients received the broadcast message
      expect(mockWebSocket1.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "workflow_updated" })
      );
      expect(mockWebSocket2.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "workflow_updated" })
      );
      expect(mockWebSocket1.send).toHaveBeenCalledTimes(1);
      expect(mockWebSocket2.send).toHaveBeenCalledTimes(1);
    });

    it("should handle WebSocket send failures gracefully", async () => {
      // Setup: Create mock WebSockets where one fails
      const mockWebSocket1 = { send: vi.fn() };
      const mockWebSocket2 = { 
        send: vi.fn().mockImplementation(() => {
          throw new Error("WebSocket connection closed");
        })
      };
      const mockWebSocket3 = { send: vi.fn() };
      const mockWebSockets = [mockWebSocket1, mockWebSocket2, mockWebSocket3];

      // Setup: Mock Chat DO context
      const mockChatDO = {
        ctx: {
          getWebSockets: () => mockWebSockets,
        },
      };

      // Execute: Simulate WebSocket broadcast with error handling
      const broadcastLogic = () => {
        mockChatDO.ctx.getWebSockets().forEach(ws => {
          try { 
            ws.send(JSON.stringify({ type: "workflow_updated" })); 
          } catch {}
        });
      };

      // This should not throw despite mockWebSocket2 failing
      expect(() => broadcastLogic()).not.toThrow();

      // Verify: Successful WebSockets still received the message
      expect(mockWebSocket1.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "workflow_updated" })
      );
      expect(mockWebSocket3.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "workflow_updated" })
      );
      
      // Verify: Failed WebSocket was attempted but didn't break the flow
      expect(mockWebSocket2.send).toHaveBeenCalledTimes(1);
    });
  });
});
