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
import type {
  WorkflowTemplateV2,
  Task,
  Goal,
  Policy,
  Constraint,
} from "./types/workflow-v2";

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

**Detailed Goal and Task Information:**
${workflow.goals
  .map(
    (g, i) =>
      `${i + 1}. **${g.name}** (ID: ${g.id})
     - Tasks: ${g.tasks?.length || 0}
     - Constraints: ${g.constraints?.length || 0}
     - Policies: ${g.policies?.length || 0}
     
     **Tasks in this goal:**
${
  g.tasks
    ?.map(
      (task, taskIndex) =>
        `     ${taskIndex + 1}. ${task.description} (ID: ${task.id})`
    )
    .join("\n") || "     No tasks"
}
     
     **Constraints in this goal:**
${
  g.constraints
    ?.map(
      (constraint, constraintIndex) =>
        `     ${constraintIndex + 1}. ${constraint.description} (ID: ${constraint.id})`
    )
    .join("\n") || "     No constraints"
}
     
     **Policies in this goal:**
${
  g.policies
    ?.map(
      (policy, policyIndex) =>
        `     ${policyIndex + 1}. ${policy.name} (ID: ${policy.id})`
    )
    .join("\n") || "     No policies"
}`
  )
  .join("\n\n")}
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
    "Remove a specific task from the workflow. This action requires your approval.",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to delete"),
  }),
  // No execute function - requires human confirmation following deleteGoal pattern
});

/**
 * Remove a specific constraint from the workflow (requires confirmation)
 */
const deleteConstraint = tool({
  description:
    "Remove a specific constraint from a goal in the workflow. This action requires your approval.",
  parameters: z.object({
    constraintId: z.string().describe("ID of the constraint to delete"),
  }),
  // No execute function - requires human confirmation following deleteGoal pattern
});

/**
 * Add a policy to a specific goal in the workflow (requires confirmation)
 */
const addPolicy = tool({
  description:
    "Add a policy to a specific goal in the workflow. Policies define automated actions based on conditions. This action requires your approval.",
  parameters: z.object({
    goalId: z.string().describe("ID of the goal to add the policy to"),
    name: z.string().describe("Name of the policy"),
    condition: z
      .object({
        field: z
          .string()
          .describe("Field to check (e.g., 'employee.work_arrangement')"),
        operator: z.string().describe("Operator (e.g., '==', '!=', '>', '<')"),
        value: z.unknown().describe("Value to compare against"),
      })
      .describe("Condition that triggers the policy"),
    action: z
      .object({
        action: z
          .string()
          .describe("Action to take (e.g., 'create_task', 'notify', 'block')"),
        params: z.record(z.unknown()).describe("Parameters for the action"),
      })
      .describe("Action to execute when condition is met"),
  }),
  // No execute function - requires human confirmation
});

/**
 * Edit an existing task within a goal. Supports partial updates.
 */
const editTask = tool({
  description: "Edit an existing task within a goal. Supports partial updates.",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to edit"),
    updates: z
      .object({
        description: z.string().optional().describe("New task description"),
        assigneeType: z.enum(["ai_agent", "human"]).optional(),
        assigneeDetails: z
          .string()
          .optional()
          .describe("Role or model details"),
        timeoutMinutes: z.number().positive().optional(),
        dependsOn: z.array(z.string()).optional(),
      })
      .describe("Fields to update (unspecified fields remain unchanged)"),
  }),
  execute: async ({ taskId, updates }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    // Find task and its goal
    let foundTask = null;
    let foundGoal = null;

    for (const goal of workflow.goals) {
      const task = goal.tasks?.find((t) => t.id === taskId);
      if (task) {
        foundTask = task;
        foundGoal = goal;
        break;
      }
    }

    if (!foundTask || !foundGoal) {
      throw new Error(`Task "${taskId}" not found in any goal.`);
    }

    // Handle assignee updates specially
    const processedUpdates: Partial<Task> = {};

    // Copy over direct field mappings
    if (updates.description !== undefined) {
      processedUpdates.description = updates.description;
    }

    // Handle assignee field mapping
    if (updates.assigneeType || updates.assigneeDetails) {
      processedUpdates.assignee = {
        type: updates.assigneeType || foundTask.assignee.type,
        ...(updates.assigneeType === "ai_agent"
          ? { model: updates.assigneeDetails || foundTask.assignee.model }
          : { role: updates.assigneeDetails || foundTask.assignee.role }),
      };
    }

    // Handle timeout field name mapping
    if (updates.timeoutMinutes !== undefined) {
      processedUpdates.timeout_minutes = updates.timeoutMinutes;
    }

    // Handle depends_on field name mapping
    if (updates.dependsOn !== undefined) {
      processedUpdates.depends_on = updates.dependsOn;
    }

    const updatedWorkflow = workflowEditingTools.updateTask(
      workflow,
      taskId,
      processedUpdates
    );

    await agent!.saveCurrentWorkflow(updatedWorkflow);

    return `Updated task "${foundTask.description}" in goal "${foundGoal.name}".`;
  },
});

/**
 * Edit an existing goal in the workflow. Supports partial updates.
 */
const editGoal = tool({
  description:
    "Edit an existing goal in the workflow. Supports partial updates.",
  parameters: z.object({
    goalId: z.string().describe("ID of the goal to edit"),
    updates: z
      .object({
        name: z.string().optional().describe("New goal name"),
        description: z.string().optional().describe("New goal description"),
        order: z
          .number()
          .positive()
          .optional()
          .describe("Goal execution order"),
        timeoutMinutes: z
          .number()
          .positive()
          .optional()
          .describe("Goal timeout in minutes"),
        activationCondition: z
          .string()
          .optional()
          .describe("Condition for goal activation"),
        continuous: z
          .boolean()
          .optional()
          .describe("Whether goal runs continuously"),
        stopCondition: z
          .string()
          .optional()
          .describe("Condition to stop the goal"),
        trigger: z.string().optional().describe("Goal trigger condition"),
        successCriteria: z
          .object({
            outputs_required: z
              .array(z.string())
              .describe("Required outputs for success"),
          })
          .optional()
          .describe("Criteria for goal success"),
      })
      .describe("Fields to update (unspecified fields remain unchanged)"),
  }),
  execute: async ({ goalId, updates }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    // Find goal
    const goal = workflow.goals.find((g) => g.id === goalId);
    if (!goal) {
      const availableGoals = workflow.goals
        .map((g) => `${g.id} (${g.name})`)
        .join(", ");
      throw new Error(
        `Goal "${goalId}" not found. Available goals: ${availableGoals}`
      );
    }

    // Process updates with field name mapping
    const processedUpdates: Partial<Goal> = {};

    // Direct field mappings
    if (updates.name !== undefined) {
      processedUpdates.name = updates.name;
    }
    if (updates.description !== undefined) {
      processedUpdates.description = updates.description;
    }
    if (updates.order !== undefined) {
      processedUpdates.order = updates.order;
    }
    if (updates.continuous !== undefined) {
      processedUpdates.continuous = updates.continuous;
    }
    if (updates.trigger !== undefined) {
      processedUpdates.trigger = updates.trigger;
    }

    // Field name mappings (camelCase to snake_case)
    if (updates.timeoutMinutes !== undefined) {
      processedUpdates.timeout_minutes = updates.timeoutMinutes;
    }
    if (updates.activationCondition !== undefined) {
      processedUpdates.activation_condition = updates.activationCondition;
    }
    if (updates.stopCondition !== undefined) {
      processedUpdates.stop_condition = updates.stopCondition;
    }
    if (updates.successCriteria !== undefined) {
      processedUpdates.success_criteria = updates.successCriteria;
    }

    const updatedWorkflow = workflowEditingTools.updateGoal(
      workflow,
      goalId,
      processedUpdates
    );

    await agent!.saveCurrentWorkflow(updatedWorkflow);

    return `Updated goal "${goal.name}".`;
  },
});

/**
 * Edit an existing policy in the workflow. Supports partial updates.
 */
const editPolicy = tool({
  description:
    "Edit an existing policy in the workflow. Supports partial updates.",
  parameters: z.object({
    policyId: z.string().describe("ID of the policy to edit"),
    updates: z
      .object({
        name: z.string().optional().describe("New policy name"),
        condition: z
          .object({
            field: z
              .string()
              .optional()
              .describe("Field to check (e.g., 'employee.work_arrangement')"),
            operator: z
              .string()
              .optional()
              .describe("Operator (e.g., '==', '!=', '>', '<')"),
            value: z.unknown().optional().describe("Value to compare against"),
            type: z.string().optional().describe("Condition type"),
            condition: z.string().optional().describe("Condition expression"),
          })
          .optional()
          .describe("Updated condition that triggers the policy"),
        action: z
          .object({
            action: z
              .string()
              .optional()
              .describe(
                "Action to take (e.g., 'create_task', 'notify', 'block')"
              ),
            params: z
              .record(z.unknown())
              .optional()
              .describe("Parameters for the action"),
          })
          .optional()
          .describe("Updated action to execute when condition is met"),
      })
      .describe("Fields to update (unspecified fields remain unchanged)"),
  }),
  execute: async ({ policyId, updates }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    // Find policy and its goal
    let foundPolicy = null;
    let foundGoal = null;

    for (const goal of workflow.goals) {
      const policy = goal.policies?.find((p) => p.id === policyId);
      if (policy) {
        foundPolicy = policy;
        foundGoal = goal;
        break;
      }
    }

    if (!foundPolicy || !foundGoal) {
      throw new Error(`Policy "${policyId}" not found in any goal.`);
    }

    // Process updates with field mapping
    const processedUpdates: Partial<Policy> = {};

    // Direct field mapping for name
    if (updates.name !== undefined) {
      processedUpdates.name = updates.name;
    }

    // Handle condition updates (maps to 'if' field)
    if (updates.condition !== undefined) {
      processedUpdates.if = {
        ...foundPolicy.if,
        ...updates.condition,
      };
    }

    // Handle action updates (maps to 'then' field)
    if (updates.action !== undefined) {
      processedUpdates.then = {
        ...foundPolicy.then,
        ...updates.action,
      };
    }

    const updatedWorkflow = workflowEditingTools.updatePolicy(
      workflow,
      policyId,
      processedUpdates
    );

    await agent!.saveCurrentWorkflow(updatedWorkflow);

    return `Updated policy "${foundPolicy.name}" in goal "${foundGoal.name}".`;
  },
});

/**
 * Edit an existing constraint in the workflow. Supports partial updates.
 */
const editConstraint = tool({
  description:
    "Edit an existing constraint in the workflow. Supports partial updates.",
  parameters: z.object({
    constraintId: z.string().describe("ID of the constraint to edit"),
    updates: z
      .object({
        description: z
          .string()
          .optional()
          .describe("New constraint description"),
        type: z
          .enum([
            "time_limit",
            "data_validation",
            "business_rule",
            "rate_limit",
            "access_control",
            "timing",
            "change_management",
            "data_protection",
            "privacy",
            "content_validation",
          ])
          .optional()
          .describe("Type of constraint"),
        enforcement: z
          .enum([
            "hard_stop",
            "block_progression",
            "require_approval",
            "warn",
            "skip_workflow",
            "delay_until_allowed",
            "filter_recipients",
            "content_review",
            "block_until_met",
            "block_duplicate",
          ])
          .optional()
          .describe("How strictly to enforce this constraint"),
        value: z
          .any()
          .optional()
          .describe(
            "Constraint value (e.g., time limit in minutes, validation rules)"
          ),
        unit: z.string().optional().describe("Unit for the constraint value"),
        condition: z.string().optional().describe("Condition expression"),
        requiredFields: z
          .array(z.string())
          .optional()
          .describe("Required fields for validation"),
        scope: z.string().optional().describe("Scope of the constraint"),
        limit: z.number().optional().describe("Numeric limit value"),
        maxValue: z.string().optional().describe("Maximum allowed value"),
        check: z.string().optional().describe("Validation check expression"),
        rule: z.string().optional().describe("Business rule expression"),
      })
      .describe("Fields to update (unspecified fields remain unchanged)"),
  }),
  execute: async ({ constraintId, updates }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    // Find constraint and its goal
    let foundConstraint = null;
    let foundGoal = null;

    for (const goal of workflow.goals) {
      const constraint = goal.constraints?.find((c) => c.id === constraintId);
      if (constraint) {
        foundConstraint = constraint;
        foundGoal = goal;
        break;
      }
    }

    if (!foundConstraint || !foundGoal) {
      throw new Error(`Constraint "${constraintId}" not found in any goal.`);
    }

    // Process updates with field name mapping
    const processedUpdates: Partial<Constraint> = {};

    // Direct field mappings
    if (updates.description !== undefined) {
      processedUpdates.description = updates.description;
    }
    if (updates.type !== undefined) {
      processedUpdates.type = updates.type;
    }
    if (updates.enforcement !== undefined) {
      processedUpdates.enforcement = updates.enforcement;
    }
    if (updates.value !== undefined) {
      processedUpdates.value = updates.value;
    }
    if (updates.unit !== undefined) {
      processedUpdates.unit = updates.unit;
    }
    if (updates.condition !== undefined) {
      processedUpdates.condition = updates.condition;
    }
    if (updates.scope !== undefined) {
      processedUpdates.scope = updates.scope;
    }
    if (updates.limit !== undefined) {
      processedUpdates.limit = updates.limit;
    }
    if (updates.check !== undefined) {
      processedUpdates.check = updates.check;
    }
    if (updates.rule !== undefined) {
      processedUpdates.rule = updates.rule;
    }

    // Field name mappings (camelCase to snake_case)
    if (updates.requiredFields !== undefined) {
      processedUpdates.required_fields = updates.requiredFields;
    }
    if (updates.maxValue !== undefined) {
      processedUpdates.max_value = updates.maxValue;
    }

    const updatedWorkflow = workflowEditingTools.updateConstraint(
      workflow,
      constraintId,
      processedUpdates
    );

    await agent!.saveCurrentWorkflow(updatedWorkflow);

    return `Updated constraint "${foundConstraint.description}" in goal "${foundGoal.name}".`;
  },
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
  deleteConstraint,
  addPolicy,
  editTask,
  editGoal,
  editPolicy,
  editConstraint,
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

  deleteTask: async ({ taskId }: { taskId: string }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    // Find the task to get its description for the return message
    let taskDescription = "";
    let goalName = "";

    for (const goal of workflow.goals) {
      const task = goal.tasks?.find((t) => t.id === taskId);
      if (task) {
        taskDescription = task.description;
        goalName = goal.name;
        break;
      }
    }

    if (!taskDescription) {
      throw new Error(`Task "${taskId}" not found in any goal.`);
    }

    const updatedWorkflow = workflowEditingTools.deleteTask(workflow, taskId);
    await agent!.saveCurrentWorkflow(updatedWorkflow);

    return `Successfully deleted task "${taskDescription}" from goal "${goalName}".`;
  },

  deleteConstraint: async ({ constraintId }: { constraintId: string }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent!.getCurrentWorkflow();

    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    // Find the constraint to get its description for the return message
    let constraintDescription = "";
    let goalName = "";

    for (const goal of workflow.goals) {
      const constraint = goal.constraints?.find((c) => c.id === constraintId);
      if (constraint) {
        constraintDescription = constraint.description;
        goalName = goal.name;
        break;
      }
    }

    if (!constraintDescription) {
      throw new Error(`Constraint "${constraintId}" not found in any goal.`);
    }

    const updatedWorkflow = workflowEditingTools.deleteConstraint(
      workflow,
      constraintId
    );
    await agent!.saveCurrentWorkflow(updatedWorkflow);

    return `Successfully deleted constraint "${constraintDescription}" from goal "${goalName}".`;
  },

  addPolicy: async ({
    goalId,
    name,
    condition,
    action,
  }: {
    goalId: string;
    name: string;
    condition: {
      field: string;
      operator: string;
      value?: unknown;
    };
    action: {
      action: string;
      params: Record<string, unknown>;
    };
  }) => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent!.getCurrentWorkflow();
    if (!workflow) {
      throw new Error("No workflow loaded.");
    }

    const goal = workflow.goals.find((g) => g.id === goalId);
    if (!goal) {
      throw new Error(`Goal "${goalId}" not found.`);
    }

    // Create the policy using workflowEditingTools
    const policy = {
      id: `pol_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      if: {
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
      },
      then: {
        action: action.action,
        params: action.params,
      },
    };

    const updatedWorkflow = workflowEditingTools.addPolicy(
      workflow,
      goalId,
      policy
    );

    await agent!.saveCurrentWorkflow(updatedWorkflow);

    // Find the newly added policy
    const updatedGoal = updatedWorkflow.goals.find((g) => g.id === goalId);
    const newPolicy = updatedGoal?.policies[updatedGoal.policies.length - 1];

    return `Added policy "${name}" to goal "${goal.name}" (Policy ID: ${newPolicy?.id || "generated"}). The policy will trigger when ${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}.`;
  },
};
