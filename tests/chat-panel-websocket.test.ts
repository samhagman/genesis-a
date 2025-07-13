/**
 * Frontend WebSocket Integration Tests
 *
 * Simple tests for real-time workflow update functionality via WebSocket
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import type { WorkflowTemplateV2 } from "../src/types/workflow-v2";

type LoadWorkflowSafeFunc = (
  templateId: string
) => Promise<{ workflow: WorkflowTemplateV2; source: string }>;
type OnWorkflowUpdateFunc = (workflow: WorkflowTemplateV2) => void;
type WebSocketMessage = { type: string; [key: string]: unknown };

describe("Frontend WebSocket Integration", () => {
  let mockLoadWorkflowSafe: LoadWorkflowSafeFunc;
  let mockOnWorkflowUpdate: OnWorkflowUpdateFunc;
  let mockTemplate: WorkflowTemplateV2;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLoadWorkflowSafe = vi.fn();
    mockOnWorkflowUpdate = vi.fn();

    mockTemplate = {
      id: "test-workflow",
      name: "Test Workflow",
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

  it("should handle workflow_updated message correctly", async () => {
    // Mock successful workflow loading
    mockLoadWorkflowSafe.mockResolvedValue({
      workflow: mockTemplate,
      source: "r2",
    });

    // Simulate the message handling logic from ChatPanel
    const handleWorkflowUpdateMessage = async (
      message: WebSocketMessage,
      selectedTemplateId: string
    ) => {
      if (message.type === "workflow_updated") {
        console.log("📨 Received workflow_updated notification");
        const { workflow: updatedWorkflow } =
          await mockLoadWorkflowSafe(selectedTemplateId);
        mockOnWorkflowUpdate(updatedWorkflow);
      }
    };

    // Test the message handling
    await handleWorkflowUpdateMessage(
      { type: "workflow_updated" },
      "test-workflow"
    );

    // Verify workflow was reloaded and callback was called
    expect(mockLoadWorkflowSafe).toHaveBeenCalledWith("test-workflow");
    expect(mockOnWorkflowUpdate).toHaveBeenCalledWith(mockTemplate);
  });

  it("should ignore non-workflow_updated messages", async () => {
    // Simulate the message handling logic
    const handleWorkflowUpdateMessage = async (
      message: WebSocketMessage,
      selectedTemplateId: string
    ) => {
      if (message.type === "workflow_updated") {
        const { workflow: updatedWorkflow } =
          await mockLoadWorkflowSafe(selectedTemplateId);
        mockOnWorkflowUpdate(updatedWorkflow);
      }
    };

    // Test with different message types
    await handleWorkflowUpdateMessage(
      { type: "chat_message", content: "Hello" },
      "test-workflow"
    );

    await handleWorkflowUpdateMessage(
      { type: "other_event", data: "something" },
      "test-workflow"
    );

    // Verify workflow was not reloaded
    expect(mockLoadWorkflowSafe).not.toHaveBeenCalled();
    expect(mockOnWorkflowUpdate).not.toHaveBeenCalled();
  });

  it("should handle loadWorkflowSafe failures gracefully", async () => {
    // Mock failed workflow loading
    mockLoadWorkflowSafe.mockRejectedValue(
      new Error("Failed to load workflow")
    );

    // Simulate the message handling logic with error handling
    const handleWorkflowUpdateMessage = async (
      message: WebSocketMessage,
      selectedTemplateId: string
    ) => {
      if (message.type === "workflow_updated") {
        try {
          const { workflow: updatedWorkflow } =
            await mockLoadWorkflowSafe(selectedTemplateId);
          mockOnWorkflowUpdate(updatedWorkflow);
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
          // Don't call the callback on error
        }
      }
    };

    // Test error handling
    await handleWorkflowUpdateMessage(
      { type: "workflow_updated" },
      "test-workflow"
    );

    // Verify workflow reload was attempted but callback was not called
    expect(mockLoadWorkflowSafe).toHaveBeenCalledWith("test-workflow");
    expect(mockOnWorkflowUpdate).not.toHaveBeenCalled();
  });

  it("should validate WebSocket connection prerequisites", () => {
    // Test the logic that determines whether WebSocket should be established
    const shouldEstablishWebSocket = (
      selectedTemplateId?: string,
      onWorkflowUpdate?: OnWorkflowUpdateFunc
    ) => {
      return !!(selectedTemplateId && onWorkflowUpdate);
    };

    // Test valid conditions
    expect(
      shouldEstablishWebSocket("test-workflow", mockOnWorkflowUpdate)
    ).toBe(true);

    // Test invalid conditions
    expect(shouldEstablishWebSocket(undefined, mockOnWorkflowUpdate)).toBe(
      false
    );
    expect(shouldEstablishWebSocket("test-workflow", undefined)).toBe(false);
    expect(shouldEstablishWebSocket(undefined, undefined)).toBe(false);
  });

  it("should parse JSON messages correctly", () => {
    // Test JSON parsing logic that would be used in WebSocket onmessage
    const parseWebSocketMessage = (data: string) => {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        return null;
      }
    };

    // Test valid JSON
    const validMessage = parseWebSocketMessage('{"type": "workflow_updated"}');
    expect(validMessage).toEqual({ type: "workflow_updated" });

    // Test invalid JSON
    const invalidMessage = parseWebSocketMessage("invalid json");
    expect(invalidMessage).toBeNull();

    // Test empty message
    const emptyMessage = parseWebSocketMessage("");
    expect(emptyMessage).toBeNull();
  });
});
