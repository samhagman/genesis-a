# Local Agent Workflow Tools Integration Plan

## Project Challenge Overview

The Genesis AI Agent system currently has sophisticated workflow editing capabilities that are isolated from the main agent system and cannot be tested locally. This plan addresses integrating these workflow modification tools into the main agent system following official Cloudflare best practices for AI agent development and testing.

### Current Architecture Analysis

**Existing Strengths**:

- ✅ Excellent foundation using Vercel AI SDK and Durable Objects
- ✅ Sophisticated workflow editing tools (`src/agents/workflowEditingTools.ts`) with 20+ semantic operations
- ✅ Comprehensive testing setup with `@cloudflare/vitest-pool-workers`
- ✅ Proper separation of concerns between tools and agent logic

**Current Limitation**:

- **Tool System Isolation**: Workflow editing tools are accessible only via separate `/api/workflow/edit` endpoint
- **Local Development Gap**: Cannot test workflow editing capabilities locally due to AI binding requirements
- **Agent Tool Access**: Main chat agent cannot access workflow modification capabilities

### Architecture Alignment with Cloudflare Best Practices

Based on the official Cloudflare agent development guide, your current architecture already follows many best practices:

1. **Durable Objects for State**: ✅ Your `Chat` class properly uses Durable Objects
2. **Tool Separation**: ✅ Tools are properly separated in `src/tools.ts`
3. **Vercel AI SDK Integration**: ✅ Using `streamText` and proper tool calling patterns
4. **Testing Infrastructure**: ✅ Using `@cloudflare/vitest-pool-workers` for high-fidelity testing

**Key Alignment Needed**:

- Integrate workflow tools into main agent tool system
- Implement proper AI mocking strategy for local development
- Add human-in-the-loop patterns for sensitive workflow operations
- Use service binding mocking for deterministic testing

## Solution Strategy: Official Cloudflare Patterns

Following the definitive Cloudflare agent testing guide, this plan implements a multi-layered approach that aligns with proven patterns while preserving your excellent existing architecture.

### Core Solution Components

1. **AI Service Abstraction**: Intelligent switching between local mocks and remote AI
2. **Tool Integration Bridge**: Seamless integration of workflow tools into main agent
3. **Official Mock AI Pattern**: Service binding replacement for deterministic testing
4. **Multi-Layered Testing**: Unit, integration, and end-to-end testing following Cloudflare patterns

## Implementation Phases

### Phase 1: Tool Integration & AI Abstraction (Week 1)

**Objective**: Integrate workflow editing tools into the main agent system using official Cloudflare patterns.

#### 1.1 Workflow Tool Integration Following Cloudflare Patterns

**Enhanced Tool Definition**: Integrate workflow tools using the official `tool()` pattern from Vercel AI SDK

```typescript
// src/tools.ts - Enhanced with workflow capabilities
import { tool } from "ai";
import { z } from "zod";
import { getCurrentAgent } from "agents";
import { workflowEditingTools } from "./agents/workflowEditingTools";
import type { Chat } from "./server";

// Workflow lifecycle tools
export const createWorkflow = tool({
  description:
    "Create a new workflow template to begin editing. Use this when the user wants to start a new workflow from scratch.",
  parameters: z.object({
    name: z
      .string()
      .describe(
        "Name of the workflow (e.g., 'Employee Onboarding', 'Order Processing')"
      ),
    description: z
      .string()
      .describe("Brief description of what this workflow accomplishes"),
  }),
  execute: async ({ name, description }) => {
    const { agent } = getCurrentAgent<Chat>();

    const newWorkflow = {
      id: `wf-${Date.now()}`,
      name,
      version: "1.0.0",
      objective: description,
      metadata: {
        author: "AI Agent",
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        tags: ["ai-created"],
      },
      goals: [],
    };

    await agent.saveCurrentWorkflow(newWorkflow);
    return `Created new workflow "${name}". You can now add goals, tasks, and constraints to build out the workflow.`;
  },
});

export const viewCurrentWorkflow = tool({
  description:
    "Display the current workflow being edited, including all goals, tasks, and constraints.",
  parameters: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent.getCurrentWorkflow();

    if (!workflow) {
      return "No workflow is currently loaded. Use 'createWorkflow' to start a new one or load an existing workflow.";
    }

    const summary = `
**Workflow: ${workflow.metadata.name}**
- Version: ${workflow.version}
- Goals: ${workflow.goals.length}

**Goal Summary:**
${workflow.goals
  .map(
    (g, i) =>
      `${i + 1}. **${g.name}**
     - Tasks: ${g.tasks?.length || 0}
     - Constraints: ${g.constraints?.length || 0}
     - Policies: ${g.policies?.length || 0}`
  )
  .join("\n")}
    `.trim();

    return summary;
  },
});

// Workflow editing tools with validation
export const addGoal = tool({
  description:
    "Add a new goal to the current workflow. Goals represent major phases or objectives in the workflow.",
  parameters: z.object({
    name: z
      .string()
      .min(3)
      .describe(
        "Name of the goal (e.g., 'Complete Employee Setup', 'Process Order')"
      ),
    description: z
      .string()
      .min(10)
      .describe("Detailed description of what this goal accomplishes"),
    order: z
      .number()
      .optional()
      .describe(
        "Position in workflow execution order (optional, defaults to end)"
      ),
  }),
  execute: async ({ name, description, order }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent.getCurrentWorkflow();

    if (!workflow) {
      throw new Error(
        "No workflow loaded. Create or load a workflow first using 'createWorkflow'."
      );
    }

    // Use existing workflow editing tools (pure functions)
    const goalData = {
      name,
      description,
      order: order || workflow.goals.length + 1,
      constraints: [],
      policies: [],
      tasks: [],
      forms: [],
    };

    const updatedWorkflow = workflowEditingTools.addGoal(workflow, goalData);
    await agent.saveCurrentWorkflow(updatedWorkflow);

    const newGoal = updatedWorkflow.goals[updatedWorkflow.goals.length - 1];
    return `Added goal "${name}" to workflow (ID: ${newGoal.id}). You can now add tasks, constraints, and policies to this goal.`;
  },
});

export const addTask = tool({
  description:
    "Add a task to a specific goal in the workflow. Tasks are specific work items that can be assigned to humans or AI agents.",
  parameters: z.object({
    goalId: z.string().describe("ID of the goal to add the task to"),
    description: z
      .string()
      .min(10)
      .describe("Clear description of what this task accomplishes"),
    assigneeType: z
      .enum(["ai_agent", "human"])
      .describe("Who should complete this task"),
    assigneeDetails: z
      .string()
      .optional()
      .describe("Specific role, model, or capabilities required"),
    timeoutMinutes: z
      .number()
      .positive()
      .optional()
      .describe("Maximum time allowed for task completion"),
    dependsOn: z
      .array(z.string())
      .optional()
      .describe("IDs of tasks that must complete first"),
  }),
  execute: async ({
    goalId,
    description,
    assigneeType,
    assigneeDetails,
    timeoutMinutes,
    dependsOn,
  }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    // Validate goal exists
    const goal = workflow.goals.find((g) => g.id === goalId);
    if (!goal) {
      const availableGoals = workflow.goals
        .map((g) => `${g.id} (${g.name})`)
        .join(", ");
      throw new Error(
        `Goal "${goalId}" not found. Available goals: ${availableGoals}`
      );
    }

    const taskData = {
      description,
      assignee: {
        type: assigneeType,
        ...(assigneeDetails &&
          (assigneeType === "ai_agent"
            ? { model: assigneeDetails }
            : { role: assigneeDetails })),
      },
      ...(timeoutMinutes && { timeout_minutes: timeoutMinutes }),
      ...(dependsOn && { depends_on: dependsOn }),
    };

    const updatedWorkflow = workflowEditingTools.addTask(
      workflow,
      goalId,
      taskData
    );
    await agent.saveCurrentWorkflow(updatedWorkflow);

    return `Added ${assigneeType} task "${description}" to goal "${goal.name}". Task will ${timeoutMinutes ? `timeout after ${timeoutMinutes} minutes` : "run indefinitely"}.`;
  },
});

export const addConstraint = tool({
  description:
    "Add a constraint to enforce rules and boundaries on a goal. Constraints ensure workflow quality and compliance.",
  parameters: z.object({
    goalId: z.string().describe("ID of the goal to add the constraint to"),
    description: z
      .string()
      .min(10)
      .describe("Clear description of what this constraint enforces"),
    type: z
      .enum([
        "time_limit",
        "data_validation",
        "business_rule",
        "rate_limit",
        "access_control",
      ])
      .describe("Type of constraint"),
    enforcement: z
      .enum(["hard_stop", "block_progression", "require_approval", "warn"])
      .describe("How strictly to enforce this constraint"),
    value: z
      .any()
      .optional()
      .describe(
        "Constraint value (e.g., time limit in minutes, validation rules)"
      ),
  }),
  execute: async ({ goalId, description, type, enforcement, value }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    const goal = workflow.goals.find((g) => g.id === goalId);
    if (!goal) {
      throw new Error(`Goal "${goalId}" not found.`);
    }

    const constraintData = {
      description,
      type,
      enforcement,
      ...(value !== undefined && { value }),
    };

    const updatedWorkflow = workflowEditingTools.addConstraint(
      workflow,
      goalId,
      constraintData
    );
    await agent.saveCurrentWorkflow(updatedWorkflow);

    return `Added ${type} constraint "${description}" to goal "${goal.name}" with ${enforcement} enforcement.`;
  },
});

// Human-in-the-loop tools for destructive operations
export const deleteGoal = tool({
  description:
    "Remove a goal and all its contents from the workflow. This is a destructive operation that requires confirmation.",
  parameters: z.object({
    goalId: z.string().describe("ID of the goal to delete"),
    confirmationPhrase: z
      .string()
      .describe(
        "User must type 'DELETE GOAL' to confirm this destructive action"
      ),
  }),
  // No execute function - requires human confirmation following Cloudflare pattern
});

export const deleteTask = tool({
  description:
    "Remove a specific task from the workflow. This requires confirmation as it may affect dependencies.",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to delete"),
    confirmationPhrase: z
      .string()
      .describe("User must type 'DELETE TASK' to confirm"),
  }),
  // No execute function - requires human confirmation
});

// Tool executions for confirmed actions (Cloudflare pattern)
export const executions = {
  deleteGoal: async ({
    goalId,
    confirmationPhrase,
  }: {
    goalId: string;
    confirmationPhrase: string;
  }) => {
    if (confirmationPhrase !== "DELETE GOAL") {
      throw new Error(
        "Invalid confirmation. Type 'DELETE GOAL' to confirm this destructive action."
      );
    }

    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    const goal = workflow.goals.find((g) => g.id === goalId);
    if (!goal) {
      throw new Error(`Goal "${goalId}" not found.`);
    }

    const updatedWorkflow = workflowEditingTools.deleteGoal(workflow, goalId);
    await agent.saveCurrentWorkflow(updatedWorkflow);

    return `Deleted goal "${goal.name}" and all its tasks, constraints, policies, and forms.`;
  },

  deleteTask: async ({
    taskId,
    confirmationPhrase,
  }: {
    taskId: string;
    confirmationPhrase: string;
  }) => {
    if (confirmationPhrase !== "DELETE TASK") {
      throw new Error(
        "Invalid confirmation. Type 'DELETE TASK' to confirm this destructive action."
      );
    }

    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    const updatedWorkflow = workflowEditingTools.deleteTask(workflow, taskId);
    await agent.saveCurrentWorkflow(updatedWorkflow);

    return `Deleted task "${taskId}".`;
  },
};

// Export all tools for agent integration
export const tools = {
  // Existing tools (unchanged)
  scheduleTask,
  getLocalTime,
  getWeatherInformation,

  // New workflow tools
  createWorkflow,
  viewCurrentWorkflow,
  addGoal,
  addTask,
  addConstraint,
  deleteGoal,
  deleteTask,
};
```

#### 1.2 Enhanced Chat Agent with Workflow State Management

**Update `src/server.ts`** to properly manage workflow state following Durable Object patterns:

```typescript
// src/server.ts - Enhanced Chat agent
import { AIChatAgent } from "agents";
import { tools, executions } from "./tools";
import type { WorkflowTemplateV2 } from "./types/workflow-v2";
import { validateWorkflowV2Strict } from "./utils/workflow-validation";

export class Chat extends AIChatAgent<Env> {
  private currentWorkflow: WorkflowTemplateV2 | null = null;
  private workflowLoaded = false;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.initializeWorkflowState();
  }

  private async initializeWorkflowState() {
    try {
      const stored =
        await this.state.storage.get<WorkflowTemplateV2>("currentWorkflow");
      this.currentWorkflow = stored || null;
      this.workflowLoaded = true;

      if (this.currentWorkflow) {
        console.log(
          `Loaded workflow: ${this.currentWorkflow.metadata.name} (${this.currentWorkflow.goals.length} goals)`
        );
      }
    } catch (error) {
      console.warn("Failed to load workflow state:", error);
      this.currentWorkflow = null;
      this.workflowLoaded = true;
    }
  }

  getCurrentWorkflow(): WorkflowTemplateV2 | null {
    return this.currentWorkflow;
  }

  async saveCurrentWorkflow(workflow: WorkflowTemplateV2): Promise<void> {
    // Validate workflow before saving (following Cloudflare best practices)
    const validationResult = validateWorkflowV2Strict(workflow);
    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors
        .map((e) => e.message)
        .join(", ");
      throw new Error(`Workflow validation failed: ${errorMessages}`);
    }

    // Update last modified timestamp
    workflow.metadata.last_modified = new Date().toISOString();

    this.currentWorkflow = workflow;
    await this.state.storage.put("currentWorkflow", workflow);

    // Also save to R2 for persistence and versioning
    if (this.env.WORKFLOW_VERSIONS) {
      const key = `workflows/${workflow.id}/current.json`;
      await this.env.WORKFLOW_VERSIONS.put(
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
    }

    console.log(
      `Saved workflow: ${workflow.metadata.name} (${workflow.goals.length} goals)`
    );
  }

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<typeof tools>,
    options?: { abortSignal?: AbortSignal }
  ) {
    // Wait for workflow state to be loaded
    if (!this.workflowLoaded) {
      await this.initializeWorkflowState();
    }

    // Enhanced system prompt with workflow awareness
    const workflowContext = this.currentWorkflow
      ? `Currently editing workflow: "${this.currentWorkflow.metadata.name}" with ${this.currentWorkflow.goals.length} goals.`
      : "No workflow currently loaded. Use 'createWorkflow' to start a new workflow.";

    const systemPrompt = `You are a helpful AI assistant with advanced workflow editing capabilities.

**Current Context:**
${workflowContext}

**Workflow Tool Guidelines:**
- Always use 'viewCurrentWorkflow' to understand the current state before making changes
- When adding goals, use descriptive names that clearly indicate the goal's purpose
- For tasks, choose appropriate assignee types (ai_agent for automated tasks, human for tasks requiring judgment)
- Add constraints to enforce important business rules and quality standards
- Use specific, actionable descriptions for all workflow elements

**Tool Usage Patterns:**
1. **Starting a workflow**: Use 'createWorkflow' with a clear name and description
2. **Understanding current state**: Use 'viewCurrentWorkflow' to see all goals and tasks
3. **Adding structure**: Use 'addGoal' to create major workflow phases
4. **Adding work items**: Use 'addTask' to define specific work within goals
5. **Adding rules**: Use 'addConstraint' to enforce quality and compliance

**Safety**: Destructive operations (delete actions) require user confirmation. Present the confirmation requirements clearly.

When users ask about workflows, follow this pattern:
1. Check current workflow state with 'viewCurrentWorkflow'
2. Make requested changes using appropriate tools
3. Confirm changes were applied successfully`;

    return await this.streamText({
      system: systemPrompt,
      messages: this.getMessages(),
      tools,
      toolChoice: "auto",
      onFinish,
      abortSignal: options?.abortSignal,
      maxTokens: 4000,
      temperature: 0.7,
    });
  }

  // Override tool execution to handle confirmed actions
  async processToolCall(toolCall: any): Promise<any> {
    // Handle confirmed executions (human-in-the-loop pattern)
    if (executions[toolCall.toolName]) {
      return await executions[toolCall.toolName](toolCall.args);
    }

    // Default tool processing
    return await super.processToolCall(toolCall);
  }
}
```

### Phase 2: Official Cloudflare Testing Patterns (Week 2)

**Objective**: Implement the official Cloudflare mock AI testing strategy for deterministic local development and testing.

#### 2.1 Mock AI Worker Implementation

Following the official Cloudflare testing guide, create a mock AI worker for deterministic testing:

```typescript
// test/mock-ai-worker.ts - Official Cloudflare pattern
export default {
  async fetch(request: Request): Promise<Response> {
    const { messages, tools } = await request.json();
    const lastUserMessage =
      messages.findLast((m: any) => m.role === "user")?.content || "";

    console.log(`Mock AI received: "${lastUserMessage.slice(0, 100)}..."`);

    // Workflow creation patterns
    if (
      lastUserMessage.toLowerCase().includes("create") &&
      lastUserMessage.toLowerCase().includes("workflow")
    ) {
      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "createWorkflow",
              arguments: JSON.stringify({
                name:
                  this.extractWorkflowName(lastUserMessage) || "New Workflow",
                description:
                  this.extractWorkflowDescription(lastUserMessage) ||
                  "Workflow created via AI assistant",
              }),
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // View workflow patterns
    if (
      lastUserMessage.toLowerCase().includes("show") ||
      lastUserMessage.toLowerCase().includes("view") ||
      lastUserMessage.toLowerCase().includes("current workflow")
    ) {
      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_2",
            type: "function",
            function: {
              name: "viewCurrentWorkflow",
              arguments: "{}",
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // Add goal patterns
    if (
      lastUserMessage.toLowerCase().includes("add") &&
      lastUserMessage.toLowerCase().includes("goal")
    ) {
      const goalName = this.extractGoalName(lastUserMessage) || "New Goal";
      const goalDescription =
        this.extractGoalDescription(lastUserMessage) ||
        "Goal added via AI assistant";

      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_3",
            type: "function",
            function: {
              name: "addGoal",
              arguments: JSON.stringify({
                name: goalName,
                description: goalDescription,
              }),
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // Add task patterns
    if (
      lastUserMessage.toLowerCase().includes("add") &&
      lastUserMessage.toLowerCase().includes("task")
    ) {
      const taskDescription =
        this.extractTaskDescription(lastUserMessage) ||
        "Task added via AI assistant";
      const assigneeType = lastUserMessage.toLowerCase().includes("human")
        ? "human"
        : "ai_agent";

      // Mock goal ID - in real tests this would be extracted from workflow state
      const goalId = "goal-1";

      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_4",
            type: "function",
            function: {
              name: "addTask",
              arguments: JSON.stringify({
                goalId,
                description: taskDescription,
                assigneeType,
              }),
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // Default conversational response
    const defaultResponse = {
      role: "assistant",
      content:
        "I can help you create and modify workflows. Try asking me to 'create a new workflow' or 'add a goal' to get started.",
    };
    return new Response(JSON.stringify({ response: defaultResponse }));
  },

  // Helper methods for extracting information from user messages
  extractWorkflowName(message: string): string | null {
    // Simple pattern matching - in production this would be more sophisticated
    const match =
      message.match(/create.*workflow.*["']([^"']+)["']/i) ||
      message.match(/workflow.*called.*["']([^"']+)["']/i) ||
      message.match(/["']([^"']+)["'].*workflow/i);
    return match ? match[1] : null;
  },

  extractWorkflowDescription(message: string): string | null {
    const match = message.match(/for (.+?)(?:\.|$)/i);
    return match ? match[1] : null;
  },

  extractGoalName(message: string): string | null {
    const match =
      message.match(/goal.*["']([^"']+)["']/i) ||
      message.match(/add.*["']([^"']+)["'].*goal/i);
    return match ? match[1] : null;
  },

  extractGoalDescription(message: string): string | null {
    const match = message.match(/goal.*for (.+?)(?:\.|$)/i);
    return match ? match[1] : null;
  },

  extractTaskDescription(message: string): string | null {
    const match =
      message.match(/task.*["']([^"']+)["']/i) ||
      message.match(/add.*["']([^"']+)["'].*task/i);
    return match ? match[1] : null;
  },
};
```

#### 2.2 Enhanced Vitest Configuration

**Update `vitest.config.ts`** to use the official service binding mock pattern:

```typescript
// vitest.config.ts - Official Cloudflare testing pattern
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          // Essential for testing agents (official pattern)
          durableObjects: {
            AGENT: "Chat", // Maps binding name to class name in src/server.ts
          },

          // Define mock AI worker (official pattern)
          workers: [
            {
              name: "mock-ai",
              modules: true,
              scriptPath: "./test/mock-ai-worker.ts",
            },
          ],

          // Override AI binding to use mock (official pattern)
          serviceBindings: {
            AI: "mock-ai",
          },

          // Local R2 simulation for workflow storage
          r2Buckets: ["WORKFLOW_VERSIONS"],

          // KV and other bindings use local simulation by default
        },
      },
    },
  },
});
```

#### 2.3 Comprehensive Integration Tests

**Create `test/workflow-agent.integration.test.ts`** following official patterns:

```typescript
// test/workflow-agent.integration.test.ts - Official Cloudflare testing
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { SELF, fetchMock, env } from "cloudflare:test";

describe("Workflow Agent Integration Tests", () => {
  beforeAll(() => {
    // Official pattern for mocking external APIs
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  it("should create a new workflow when requested", async () => {
    // Get agent Durable Object stub (official pattern)
    const id = env.AGENT.newUniqueId();
    const stub = env.AGENT.get(id);

    // Send user message to agent
    const response = await stub.fetch("http://localhost/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Create a workflow called 'Employee Onboarding' for managing new hire setup",
      }),
    });

    expect(response.ok).toBe(true);
    const responseText = await response.text();

    // Verify the agent used the createWorkflow tool
    expect(responseText).toContain("Employee Onboarding");
    expect(responseText).toContain("Created new workflow");
  });

  it("should add goals to an existing workflow", async () => {
    const id = env.AGENT.newUniqueId();
    const stub = env.AGENT.get(id);

    // First create a workflow
    await stub.fetch("http://localhost/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Create a workflow called 'Order Processing'",
      }),
    });

    // Then add a goal
    const response = await stub.fetch("http://localhost/chat", {
      method: "POST",
      body: JSON.stringify({
        message:
          "Add a goal called 'Validate Order' for checking order details and inventory",
      }),
    });

    const responseText = await response.text();
    expect(responseText).toContain("Validate Order");
    expect(responseText).toContain("Added goal");
  });

  it("should add tasks to workflow goals", async () => {
    const id = env.AGENT.newUniqueId();
    const stub = env.AGENT.get(id);

    // Create workflow and goal first
    await stub.fetch("http://localhost/chat", {
      method: "POST",
      body: JSON.stringify({
        message:
          "Create a workflow called 'Customer Support' with a goal 'Handle Ticket'",
      }),
    });

    // Add a task
    const response = await stub.fetch("http://localhost/chat", {
      method: "POST",
      body: JSON.stringify({
        message:
          "Add a human task 'Review customer complaint' to the Handle Ticket goal",
      }),
    });

    const responseText = await response.text();
    expect(responseText).toContain("Review customer complaint");
    expect(responseText).toContain("human task");
  });

  it("should maintain workflow state across multiple interactions", async () => {
    const id = env.AGENT.newUniqueId();
    const stub = env.AGENT.get(id);

    // Create workflow
    await stub.fetch("http://localhost/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Create a workflow called 'Product Launch'",
      }),
    });

    // Add multiple goals
    await stub.fetch("http://localhost/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Add a goal 'Market Research'",
      }),
    });

    await stub.fetch("http://localhost/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Add a goal 'Product Development'",
      }),
    });

    // View workflow to confirm state persistence
    const response = await stub.fetch("http://localhost/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Show me the current workflow",
      }),
    });

    const responseText = await response.text();
    expect(responseText).toContain("Product Launch");
    expect(responseText).toContain("Market Research");
    expect(responseText).toContain("Product Development");
    expect(responseText).toContain("Goals: 2");
  });

  it("should handle workflow validation errors gracefully", async () => {
    const id = env.AGENT.newUniqueId();
    const stub = env.AGENT.get(id);

    // Try to add a goal without a workflow
    const response = await stub.fetch("http://localhost/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Add a goal called 'Test Goal'",
      }),
    });

    const responseText = await response.text();
    expect(responseText).toContain("No workflow loaded") ||
      expect(responseText).toContain("Create or load a workflow first");
  });
});
```

#### 2.4 Unit Tests for Workflow Tools

**Create `test/workflow-tools.unit.test.ts`** for testing tool logic in isolation:

```typescript
// test/workflow-tools.unit.test.ts - Unit testing following official patterns
import { describe, it, expect } from "vitest";
import { workflowEditingTools } from "../src/agents/workflowEditingTools";

describe("Workflow Editing Tools (Unit Tests)", () => {
  const mockWorkflow = {
    id: "test-workflow",
    name: "Test Workflow",
    version: "1.0.0",
    objective: "Test workflow for unit testing",
    metadata: {
      author: "Test",
      created_at: "2025-01-01T00:00:00Z",
      last_modified: "2025-01-01T00:00:00Z",
      tags: [],
    },
    goals: [
      {
        id: "goal-1",
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

  describe("addGoal", () => {
    it("should add a new goal to the workflow", () => {
      const goalData = {
        name: "New Goal",
        description: "A new test goal",
        order: 2,
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      };

      const result = workflowEditingTools.addGoal(mockWorkflow, goalData);

      expect(result.goals).toHaveLength(2);
      expect(result.goals[1].name).toBe("New Goal");
      expect(result.goals[1].description).toBe("A new test goal");
      expect(result.goals[1].id).toBeDefined();
    });

    it("should maintain workflow immutability", () => {
      const goalData = {
        name: "Immutability Test",
        description: "Testing immutability",
        order: 3,
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      };

      const result = workflowEditingTools.addGoal(mockWorkflow, goalData);

      // Original workflow should be unchanged
      expect(mockWorkflow.goals).toHaveLength(1);
      expect(result.goals).toHaveLength(2);
      expect(result).not.toBe(mockWorkflow);
    });
  });

  describe("addTask", () => {
    it("should add a task to the specified goal", () => {
      const taskData = {
        description: "Test task",
        assignee: { type: "ai_agent" as const, model: "gpt-4" },
        timeout_minutes: 30,
      };

      const result = workflowEditingTools.addTask(
        mockWorkflow,
        "goal-1",
        taskData
      );

      expect(result.goals[0].tasks).toHaveLength(1);
      expect(result.goals[0].tasks[0].description).toBe("Test task");
      expect(result.goals[0].tasks[0].assignee.type).toBe("ai_agent");
      expect(result.goals[0].tasks[0].id).toBeDefined();
    });

    it("should throw error for non-existent goal", () => {
      const taskData = {
        description: "Test task",
        assignee: { type: "human" as const, role: "Manager" },
      };

      expect(() => {
        workflowEditingTools.addTask(
          mockWorkflow,
          "non-existent-goal",
          taskData
        );
      }).toThrow("Goal with ID non-existent-goal not found");
    });
  });

  describe("addConstraint", () => {
    it("should add a constraint to the specified goal", () => {
      const constraintData = {
        description: "Time limit constraint",
        type: "time_limit" as const,
        enforcement: "hard_stop" as const,
        value: 60,
      };

      const result = workflowEditingTools.addConstraint(
        mockWorkflow,
        "goal-1",
        constraintData
      );

      expect(result.goals[0].constraints).toHaveLength(1);
      expect(result.goals[0].constraints[0].type).toBe("time_limit");
      expect(result.goals[0].constraints[0].value).toBe(60);
      expect(result.goals[0].constraints[0].id).toBeDefined();
    });
  });
});
```

### Phase 3: Local Development Experience Enhancement (Week 3)

**Objective**: Create seamless local development experience with multiple modes for different development needs.

#### 3.1 Development Mode Scripts

**Enhanced `package.json`** with official Cloudflare development patterns:

```json
{
  "scripts": {
    "dev": "wrangler dev --local",
    "dev:remote": "wrangler dev --remote",
    "dev:ai-local": "wrangler dev --local --binding AI=mock-ai",

    "test": "vitest",
    "test:unit": "vitest run test/*.unit.test.ts",
    "test:integration": "vitest run test/*.integration.test.ts",
    "test:workflow": "vitest run test/workflow-*.test.ts",
    "test:watch": "vitest --watch",

    "debug": "wrangler dev --local --compatibility-date=2024-03-20",
    "debug:ai": "wrangler dev --remote --compatibility-date=2024-03-20",

    "build": "wrangler deploy --dry-run",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging"
  }
}
```

#### 3.2 Local Development Configuration

**Enhanced `wrangler.jsonc`** following official Cloudflare patterns:

```jsonc
{
  "name": "genesis-a",
  "main": "src/index.ts",
  "compatibility_date": "2024-03-20",

  "durable_objects": {
    "bindings": [
      {
        "name": "AGENT",
        "class_name": "Chat",
      },
    ],
  },

  "ai": {
    "binding": "AI",
  },

  "r2_buckets": [
    {
      "binding": "WORKFLOW_VERSIONS",
      "bucket_name": "genesis-workflows",
    },
  ],

  "vars": {
    "ENVIRONMENT": "development",
  },

  "env": {
    "staging": {
      "name": "genesis-a-staging",
      "vars": {
        "ENVIRONMENT": "staging",
      },
    },
    "production": {
      "name": "genesis-a-production",
      "vars": {
        "ENVIRONMENT": "production",
      },
    },
  },
}
```

#### 3.3 AI Gateway Integration for Production Observability

**Enhanced agent with AI Gateway** for production observability:

```typescript
// src/services/aiGatewayService.ts - Production observability
export class AiGatewayService {
  constructor(private env: Env) {}

  async callAI(model: string, messages: any[], tools: any[]) {
    const isProduction = this.env.ENVIRONMENT === "production";
    const aiGatewayUrl = this.env.AI_GATEWAY_URL;

    if (isProduction && aiGatewayUrl) {
      // Route through AI Gateway for observability (official pattern)
      const response = await fetch(`${aiGatewayUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: "auto",
        }),
      });

      return response.json();
    } else {
      // Direct call for development (or fallback)
      return this.env.AI.run(model, { messages, tools });
    }
  }
}
```

### Phase 4: Production Deployment & Monitoring (Week 4)

**Objective**: Prepare for production deployment with proper monitoring, error handling, and team collaboration features.

#### 4.1 Error Handling and Validation

**Enhanced error handling** following Cloudflare best practices:

```typescript
// src/utils/workflowErrorHandling.ts - Production error handling
export class WorkflowOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public workflowId?: string,
    public details?: any
  ) {
    super(message);
    this.name = "WorkflowOperationError";
  }
}

export function handleWorkflowError(
  error: any,
  operation: string,
  workflowId?: string
): string {
  console.error(`Workflow operation failed: ${operation}`, error);

  if (error instanceof WorkflowOperationError) {
    return `Failed to ${operation}: ${error.message}`;
  }

  if (error.message?.includes("validation")) {
    return `Workflow validation failed: ${error.message}. Please check your input and try again.`;
  }

  if (error.message?.includes("not found")) {
    return `Could not find the specified workflow element. Use 'viewCurrentWorkflow' to see available options.`;
  }

  // Generic error handling
  return `Sorry, I encountered an error while trying to ${operation}. Please try again or rephrase your request.`;
}
```

#### 4.2 Production Deployment Scripts

**GitHub Actions workflow** for automated testing and deployment:

```yaml
# .github/workflows/deploy.yml - Production deployment
name: Deploy Genesis Agent

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Build check
        run: npm run build

  deploy-staging:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: npx wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: [test, deploy-staging]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Technical Architecture Decisions

### Alignment with Official Cloudflare Patterns

This implementation follows the official Cloudflare agent development guide:

1. **Tool Definition**: Using `tool()` function with Zod schemas (official pattern)
2. **Human-in-the-Loop**: Implementing confirmation pattern with separate `executions` object
3. **State Management**: Proper Durable Object usage for agent persistence
4. **Testing Strategy**: Multi-layered approach with mock AI worker (official pattern)
5. **Local Development**: `wrangler dev` with local/remote binding modes
6. **Observability**: AI Gateway integration for production monitoring

### Service Architecture

```typescript
// Clean separation following Cloudflare best practices
src/
├── agents/
│   ├── workflowEditingTools.ts    # Pure workflow editing functions (unchanged)
│   └── workflowValidation.ts      # Validation and error handling
├── services/
│   ├── aiGatewayService.ts        # AI Gateway integration
│   └── workflowStorage.ts         # R2 storage management
├── tools.ts                       # Integrated tool definitions
├── server.ts                      # Enhanced Chat agent
└── types/
    └── workflow-v2.ts             # TypeScript interfaces
```

### Testing Architecture

```typescript
// Official Cloudflare testing patterns
test/
├── mock-ai-worker.ts              # Mock AI service (official pattern)
├── workflow-tools.unit.test.ts    # Unit tests for tool logic
├── workflow-agent.integration.test.ts  # Integration tests with mock AI
└── setup.ts                       # Test environment setup
```

## Success Criteria

### Phase 1 Success Metrics

**Tool Integration (Week 1)**:

- [ ] Workflow tools accessible through main chat agent
- [ ] Natural language commands like "create workflow" and "add goal" work
- [ ] Workflow state persists across conversations in Durable Object
- [ ] All existing functionality remains intact
- [ ] Local development environment runs successfully

### Phase 2 Success Metrics

**Testing Implementation (Week 2)**:

- [ ] Mock AI worker provides deterministic responses for workflow operations
- [ ] Integration tests pass consistently with mocked AI
- [ ] Unit tests validate workflow tool logic in isolation
- [ ] Service binding configuration correctly routes AI calls to mock
- [ ] Test coverage >90% for workflow functionality

### Phase 3 Success Metrics

**Development Experience (Week 3)**:

- [ ] Multiple development modes (local, remote, mock) work seamlessly
- [ ] AI Gateway integration provides production observability
- [ ] Error handling provides helpful user feedback
- [ ] Development scripts enable efficient workflow
- [ ] Documentation enables team onboarding

### Phase 4 Success Metrics

**Production Ready (Week 4)**:

- [ ] Automated CI/CD pipeline deploys successfully
- [ ] Production monitoring provides visibility into agent behavior
- [ ] Error handling prevents system failures
- [ ] Performance meets production requirements
- [ ] Team training and documentation completed

### User Experience Goals

**Natural Language Workflow Editing**:

- Users can create and modify workflows through conversation
- Agent provides clear feedback on actions taken
- Error messages are helpful and actionable
- Complex operations are broken down into manageable steps

**Developer Experience**:

- Fast local development with instant feedback
- Reliable testing with predictable results
- Clear debugging and error tracking
- Seamless deployment to production

## Risk Mitigation

### Technical Risks

**Mock AI Fidelity**:

- **Risk**: Mock responses diverge from real AI behavior
- **Mitigation**: Regular validation against real AI, comprehensive test scenarios, pattern-based response generation

**State Management Complexity**:

- **Risk**: Workflow state becomes inconsistent or corrupted
- **Mitigation**: Immutable workflow operations, comprehensive validation, transactional updates

**Testing Complexity**:

- **Risk**: Tests become brittle or hard to maintain
- **Mitigation**: Follow official Cloudflare patterns, clear test separation, comprehensive mocking

### Operational Risks

**Production Deployment**:

- **Risk**: Deployment failures or service interruptions
- **Mitigation**: Staging environment, automated testing, gradual rollout, rollback procedures

**AI Gateway Dependency**:

- **Risk**: AI Gateway service issues affect production
- **Mitigation**: Fallback to direct AI calls, monitoring and alerting, circuit breaker patterns

## Implementation Timeline

### Week 1: Foundation

- **Days 1-2**: Tool integration and agent enhancement
- **Days 3-4**: Workflow state management and validation
- **Days 5-7**: Basic testing and local development setup

### Week 2: Testing

- **Days 1-3**: Mock AI worker and service binding configuration
- **Days 4-5**: Integration and unit test implementation
- **Days 6-7**: Test validation and debugging

### Week 3: Enhancement

- **Days 1-2**: Development mode scripts and configuration
- **Days 3-4**: AI Gateway integration and observability
- **Days 5-7**: Error handling and user experience improvements

### Week 4: Production

- **Days 1-2**: CI/CD pipeline and deployment automation
- **Days 3-4**: Production monitoring and error tracking
- **Days 5-7**: Documentation, training, and team rollout

## Next Steps

### Immediate Actions (This Week)

1. **Integrate workflow tools** into `src/tools.ts` using official patterns
2. **Enhance Chat agent** with workflow state management
3. **Create mock AI worker** following official testing patterns
4. **Update vitest configuration** for service binding mocks
5. **Test basic workflow operations** through chat interface

### Short Term (Next 2 Weeks)

1. **Implement comprehensive test suite** with official Cloudflare patterns
2. **Add AI Gateway integration** for production observability
3. **Create development mode scripts** for efficient workflow
4. **Document usage patterns** and best practices

### Long Term (Next Month)

1. **Gather team feedback** on development experience
2. **Optimize performance** based on usage analytics
3. **Implement advanced features** like workflow templates
4. **Plan next phase** of workflow execution capabilities

---

_This plan aligns Genesis's sophisticated workflow editing capabilities with official Cloudflare agent development patterns, enabling natural language workflow editing with production-grade testing and monitoring. The approach builds on existing strengths while following proven best practices for reliable AI agent development._
