import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkflowEditingAgent } from "@/agents/workflowEditingAgent";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";

// Mock the AI interface
const mockAI = {
  run: vi.fn(),
} as any;

// Mock workflow for testing
const testWorkflow: WorkflowTemplateV2 = {
  id: "test-workflow",
  name: "Test Workflow",
  version: "1.0.0",
  objective: "Test workflow for validation",
  metadata: {
    author: "Test Author",
    created_at: "2024-01-01",
    last_modified: "2024-01-01",
    tags: ["test"],
  },
  goals: [
    {
      id: "goal_1",
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

describe("WorkflowEditingAgent Validation Safety Net", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should validate workflow after each tool execution", async () => {
    const agent = new WorkflowEditingAgent(mockAI);

    // Mock AI response with a valid tool call
    mockAI.run.mockResolvedValue({
      response: JSON.stringify({
        toolCalls: [
          {
            tool: "addGoal",
            params: {
              goal: {
                name: "New Goal",
                description: "A new goal for testing",
                constraints: [],
                policies: [],
                tasks: [],
                forms: [],
              },
            },
          },
        ],
        reasoning: "Adding a new goal as requested",
      }),
    });

    const request = {
      workflowId: "test-workflow",
      currentWorkflow: testWorkflow,
      userMessage: "Add a new goal called 'New Goal'",
      userId: "test-user",
      sessionId: "test-session",
    };

    const result = await agent.processEditRequest(request);

    expect(result.success).toBe(true);
    expect(result.updatedWorkflow).toBeDefined();
    expect(result.updatedWorkflow?.goals).toHaveLength(2);
  });

  it("should retry on schema validation failure with enhanced guidance", async () => {
    const agent = new WorkflowEditingAgent(mockAI);

    // First call returns invalid tool call (missing required fields)
    // Second call returns valid tool call
    mockAI.run
      .mockResolvedValueOnce({
        response: JSON.stringify({
          toolCalls: [
            {
              tool: "addGoal",
              params: {
                goal: {
                  // Missing required fields like 'name' and 'description'
                  constraints: [],
                  policies: [],
                  tasks: [],
                  forms: [],
                },
              },
            },
          ],
          reasoning: "Adding goal with incomplete data",
        }),
      })
      .mockResolvedValueOnce({
        response: JSON.stringify({
          toolCalls: [
            {
              tool: "addGoal",
              params: {
                goal: {
                  name: "Corrected Goal",
                  description: "A properly formatted goal",
                  constraints: [],
                  policies: [],
                  tasks: [],
                  forms: [],
                },
              },
            },
          ],
          reasoning: "Adding goal with complete data after validation error",
        }),
      });

    const request = {
      workflowId: "test-workflow",
      currentWorkflow: testWorkflow,
      userMessage: "Add a new goal",
      userId: "test-user",
      sessionId: "test-session",
    };

    const result = await agent.processEditRequest(request);

    // Should succeed after retry with corrected data
    expect(result.success).toBe(true);
    expect(result.updatedWorkflow?.goals).toHaveLength(2);

    // Should succeed after retry with corrected data
    expect(mockAI.run).toHaveBeenCalledTimes(2);

    // Second call should include validation error guidance
    const secondCallArgs = mockAI.run.mock.calls[1][1];
    const userPrompt = secondCallArgs.messages[1].content;
    expect(userPrompt).toContain("VALIDATION ERROR GUIDANCE");
  });

  it("should fail after maximum retries with validation errors", async () => {
    const agent = new WorkflowEditingAgent(mockAI);

    // All calls return invalid tool calls
    mockAI.run.mockResolvedValue({
      response: JSON.stringify({
        toolCalls: [
          {
            tool: "addGoal",
            params: {
              goal: {
                // Always missing required fields
                constraints: [],
                policies: [],
                tasks: [],
                forms: [],
              },
            },
          },
        ],
        reasoning: "Adding incomplete goal",
      }),
    });

    const request = {
      workflowId: "test-workflow",
      currentWorkflow: testWorkflow,
      userMessage: "Add a new goal",
      userId: "test-user",
      sessionId: "test-session",
    };

    const result = await agent.processEditRequest(request);

    // Should fail after maximum retries
    expect(result.success).toBe(false);
    expect(result.errorDetails).toContain("validation failed");

    // Should have called AI multiple times due to retries
    expect(mockAI.run).toHaveBeenCalledTimes(3);
  });

  it("should provide specific guidance for common validation errors", () => {
    const agent = new WorkflowEditingAgent(mockAI);

    // Test private method through reflection
    const generateGuidance = (
      agent as any
    ).generateValidationErrorGuidance.bind(agent);

    // Test required field validation error guidance (matching actual error format)
    const nameError =
      "Goal validation failed: goal.name: Required field 'name' is missing";
    const nameGuidance = generateGuidance(nameError);
    expect(nameGuidance).toContain("required fields must be present");
    expect(nameGuidance).toContain("Goals need name and description");

    // Test assignee validation error guidance
    const assigneeError =
      "Task validation failed: task.assignee: invalid assignee type";
    const assigneeGuidance = generateGuidance(assigneeError);
    expect(assigneeGuidance).toContain("ai_agent");
    expect(assigneeGuidance).toContain("human");

    // Test enforcement validation error guidance
    const enforcementError =
      "Constraint validation failed: constraint.enforcement: invalid enforcement level";
    const enforcementGuidance = generateGuidance(enforcementError);
    expect(enforcementGuidance).toContain("hard_stop");
    expect(enforcementGuidance).toContain("require_approval");
  });
});
