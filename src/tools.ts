/**
 * Tool definitions for the AI assistant
 * Tools can either require human confirmation or execute automatically
 */
import { tool } from "ai";
import { z } from "zod";

import { getCurrentAgent } from "agents";
import { unstable_scheduleSchema } from "agents/schedule";
import { workflowEditingTools } from "./agents/workflowEditingTools";
import type { Chat } from "./server";
import type { WorkflowTemplateV2 } from "./types/workflow-v2";

/**
 * Weather information tool that requires human confirmation
 * When invoked, this will present a confirmation dialog to the user
 * The actual implementation is in the executions object below
 */
const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  parameters: z.object({ city: z.string() }),
  // Omitting execute function makes this tool require human confirmation
});

/**
 * Local time tool that executes automatically
 * Since it includes an execute function, it will run without user confirmation
 * This is suitable for low-risk operations that don't need oversight
 */
const getLocalTime = tool({
  description: "get the local time for a specified location",
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    console.log(`Getting local time for ${location}`);
    return "10am";
  },
});

const scheduleTask = tool({
  description: "A tool to schedule a task to be executed at a later time",
  parameters: unstable_scheduleSchema,
  execute: async ({ when, description }) => {
    // we can now read the agent context from the ALS store
    const { agent } = getCurrentAgent<Chat>();

    function throwError(msg: string): string {
      throw new Error(msg);
    }
    if (when.type === "no-schedule") {
      return "Not a valid schedule input";
    }
    const input =
      when.type === "scheduled"
        ? when.date // scheduled
        : when.type === "delayed"
          ? when.delayInSeconds // delayed
          : when.type === "cron"
            ? when.cron // cron
            : throwError("not a valid schedule input");
    try {
      const schedule = await agent!.schedule(
        input!,
        "executeTask",
        description
      );
      console.log("Task scheduled successfully:", schedule.id);
    } catch (error) {
      console.error("error scheduling task", error);
      return `Error scheduling task: ${error}`;
    }
    return `Task scheduled for type "${when.type}" : ${input}`;
  },
});

/**
 * Tool to list all scheduled tasks
 * This executes automatically without requiring human confirmation
 */
const getScheduledTasks = tool({
  description: "List all tasks that have been scheduled",
  parameters: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();

    try {
      const tasks = agent!.getSchedules();
      if (!tasks || tasks.length === 0) {
        return "No scheduled tasks found.";
      }
      return tasks;
    } catch (error) {
      console.error("Error listing scheduled tasks", error);
      return `Error listing scheduled tasks: ${error}`;
    }
  },
});

/**
 * Tool to cancel a scheduled task by its ID
 * This executes automatically without requiring human confirmation
 */
const cancelScheduledTask = tool({
  description: "Cancel a scheduled task using its ID",
  parameters: z.object({
    taskId: z.string().describe("The ID of the task to cancel"),
  }),
  execute: async ({ taskId }) => {
    const { agent } = getCurrentAgent<Chat>();
    try {
      const success = await agent!.cancelSchedule(taskId);
      if (success) {
        return `Task ${taskId} has been successfully canceled.`;
      }
      return `Task ${taskId} could not be canceled (may not exist or already completed).`;
    } catch (error) {
      console.error("Error canceling scheduled task", error);
      return `Error canceling task ${taskId}: ${error}`;
    }
  },
});

// ============================================================================
// Workflow Tools - Following Cloudflare Patterns
// ============================================================================

/**
 * Create a new workflow template to begin editing
 */
const createWorkflow = tool({
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

    const newWorkflow: WorkflowTemplateV2 = {
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
      global_settings: {
        max_execution_time_hours: 24,
        data_retention_days: 30,
        default_timezone: "UTC",
        notification_channels: {
          urgent: [],
          normal: [],
          reports: [],
        },
        integrations: {},
      },
    };

    await agent!.saveCurrentWorkflow(newWorkflow);
    return `Created new workflow "${name}". You can now add goals, tasks, and constraints to build out the workflow.`;
  },
});

/**
 * Display the current workflow being edited
 */
const viewCurrentWorkflow = tool({
  description:
    "Display the current workflow being edited, including all goals, tasks, and constraints.",
  parameters: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      return "No workflow is currently loaded. Use 'createWorkflow' to start a new one or load an existing workflow.";
    }

    const summary = `
**Workflow: ${workflow.name}**
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

/**
 * Add a new goal to the current workflow
 */
const addGoal = tool({
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
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error(
        "No workflow loaded. Create or load a workflow first using 'createWorkflow'."
      );
    }

    // Use existing workflow editing tools (pure functions)
    const goalData = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      order: order || workflow.goals.length + 1,
      constraints: [],
      policies: [],
      tasks: [],
      forms: [],
    };

    const updatedWorkflow = workflowEditingTools.addGoal(workflow, goalData);
    await agent!.saveCurrentWorkflow(updatedWorkflow);

    const newGoal = updatedWorkflow.goals[updatedWorkflow.goals.length - 1];
    return `Added goal "${name}" to workflow (ID: ${newGoal.id}). You can now add tasks, constraints, and policies to this goal.`;
  },
});

/**
 * Add a task to a specific goal in the workflow
 */
const addTask = tool({
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
    const workflow = agent!.getCurrentWorkflow();

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
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    await agent!.saveCurrentWorkflow(updatedWorkflow);

    return `Added ${assigneeType} task "${description}" to goal "${goal.name}". Task will ${timeoutMinutes ? `timeout after ${timeoutMinutes} minutes` : "run indefinitely"}.`;
  },
});

/**
 * Add a constraint to enforce rules and boundaries on a goal
 */
const addConstraint = tool({
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
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    const goal = workflow.goals.find((g) => g.id === goalId);
    if (!goal) {
      throw new Error(`Goal "${goalId}" not found.`);
    }

    const constraintData = {
      id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    await agent!.saveCurrentWorkflow(updatedWorkflow);

    return `Added ${type} constraint "${description}" to goal "${goal.name}" with ${enforcement} enforcement.`;
  },
});

/**
 * Remove a goal and all its contents from the workflow (requires confirmation)
 */
const deleteGoal = tool({
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

/**
 * Remove a specific task from the workflow (requires confirmation)
 */
const deleteTask = tool({
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

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  // Existing tools
  getWeatherInformation,
  getLocalTime,
  scheduleTask,
  getScheduledTasks,
  cancelScheduledTask,

  // Workflow tools
  createWorkflow,
  viewCurrentWorkflow,
  addGoal,
  addTask,
  addConstraint,
  deleteGoal,
  deleteTask,
};

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 * NOTE: keys below should match toolsRequiringConfirmation in app.tsx
 */
export const executions = {
  getWeatherInformation: async ({ city }: { city: string }) => {
    console.log(`Getting weather information for ${city}`);
    return `The weather in ${city} is sunny`;
  },

  // Workflow tool executions for confirmed actions (Cloudflare pattern)
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
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    const goal = workflow.goals.find((g) => g.id === goalId);
    if (!goal) {
      throw new Error(`Goal "${goalId}" not found.`);
    }

    const updatedWorkflow = workflowEditingTools.deleteGoal(workflow, goalId);
    await agent!.saveCurrentWorkflow(updatedWorkflow);

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
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    const updatedWorkflow = workflowEditingTools.deleteTask(workflow, taskId);
    await agent!.saveCurrentWorkflow(updatedWorkflow);

    return `Deleted task "${taskId}".`;
  },
};
