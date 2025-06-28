/**
 * Workflow Editing Tools
 *
 * This module provides semantic editing tools for WorkflowTemplateV2 that can be safely
 * called by AI agents to modify workflow templates through natural language commands.
 *
 * Key Features:
 * - Schema-aware editing functions that maintain V2 integrity
 * - Immutable operations that return new workflow instances
 * - Comprehensive validation and error handling
 * - Support for all V2 workflow elements: Goals, Constraints, Policies, Tasks, Forms
 */

import type {
  WorkflowTemplateV2,
  Goal,
  Constraint,
  Policy,
  Task,
  Form,
  WorkflowMetadata,
  GlobalSettings,
} from "../types/workflow-v2";
import {
  validateWorkflowV2Strict,
  validateGoalStrict,
  validateConstraintStrict,
  validatePolicyStrict,
  validateTaskStrict,
  validateFormStrict,
} from "../utils/schema-validation";

// ============================================================================
// Core Workflow Editing Tool Interface
// ============================================================================

/**
 * Essential semantic tools for workflow modification
 * These functions translate high-level editing commands into safe, validated changes
 */
export interface WorkflowEditingTools {
  // Goal Operations
  addGoal(
    workflow: WorkflowTemplateV2,
    goal: Omit<Goal, "order">
  ): WorkflowTemplateV2;
  updateGoal(
    workflow: WorkflowTemplateV2,
    goalId: string,
    updates: Partial<Goal>
  ): WorkflowTemplateV2;
  deleteGoal(workflow: WorkflowTemplateV2, goalId: string): WorkflowTemplateV2;
  reorderGoals(
    workflow: WorkflowTemplateV2,
    goalOrder: string[]
  ): WorkflowTemplateV2;

  // Task Operations
  addTask(
    workflow: WorkflowTemplateV2,
    goalId: string,
    task: Task
  ): WorkflowTemplateV2;
  updateTask(
    workflow: WorkflowTemplateV2,
    taskId: string,
    updates: Partial<Task>
  ): WorkflowTemplateV2;
  deleteTask(workflow: WorkflowTemplateV2, taskId: string): WorkflowTemplateV2;

  // Constraint Operations
  addConstraint(
    workflow: WorkflowTemplateV2,
    goalId: string,
    constraint: Constraint
  ): WorkflowTemplateV2;
  updateConstraint(
    workflow: WorkflowTemplateV2,
    constraintId: string,
    updates: Partial<Constraint>
  ): WorkflowTemplateV2;
  deleteConstraint(
    workflow: WorkflowTemplateV2,
    constraintId: string
  ): WorkflowTemplateV2;

  // Policy Operations
  addPolicy(
    workflow: WorkflowTemplateV2,
    goalId: string,
    policy: Policy
  ): WorkflowTemplateV2;
  updatePolicy(
    workflow: WorkflowTemplateV2,
    policyId: string,
    updates: Partial<Policy>
  ): WorkflowTemplateV2;
  deletePolicy(
    workflow: WorkflowTemplateV2,
    policyId: string
  ): WorkflowTemplateV2;

  // Form Operations
  addForm(
    workflow: WorkflowTemplateV2,
    goalId: string,
    form: Form
  ): WorkflowTemplateV2;
  updateForm(
    workflow: WorkflowTemplateV2,
    formId: string,
    updates: Partial<Form>
  ): WorkflowTemplateV2;
  deleteForm(workflow: WorkflowTemplateV2, formId: string): WorkflowTemplateV2;

  // Workflow Metadata Operations
  updateWorkflowMetadata(
    workflow: WorkflowTemplateV2,
    updates: Partial<WorkflowMetadata>
  ): WorkflowTemplateV2;
  updateGlobalSettings(
    workflow: WorkflowTemplateV2,
    settings: Partial<GlobalSettings>
  ): WorkflowTemplateV2;

  // Bulk Operations
  duplicateGoal(
    workflow: WorkflowTemplateV2,
    goalId: string,
    newGoalName?: string
  ): WorkflowTemplateV2;
  moveElementBetweenGoals(
    workflow: WorkflowTemplateV2,
    elementType: "task" | "constraint" | "policy" | "form",
    elementId: string,
    fromGoalId: string,
    toGoalId: string
  ): WorkflowTemplateV2;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID for new workflow elements
 */
function generateId(prefix: string = "item"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone a workflow to ensure immutability
 */
function cloneWorkflow(workflow: WorkflowTemplateV2): WorkflowTemplateV2 {
  return JSON.parse(JSON.stringify(workflow));
}

/**
 * Find goal by ID and return both goal and its index
 */
function findGoal(
  workflow: WorkflowTemplateV2,
  goalId: string
): { goal: Goal; index: number } {
  const index = workflow.goals.findIndex((g) => g.id === goalId);
  if (index === -1) {
    throw new Error(`Goal with id "${goalId}" not found`);
  }
  return { goal: workflow.goals[index], index };
}

/**
 * Find element within goals and return goal + element details
 */
function findElementInGoals<T>(
  workflow: WorkflowTemplateV2,
  elementId: string,
  elementType: "tasks" | "constraints" | "policies" | "forms"
): { goalId: string; goalIndex: number; elementIndex: number; element: T } {
  for (let goalIndex = 0; goalIndex < workflow.goals.length; goalIndex++) {
    const goal = workflow.goals[goalIndex];
    const elements = goal[elementType] as T[];
    const elementIndex = elements.findIndex(
      (item: any) => item.id === elementId
    );

    if (elementIndex !== -1) {
      return {
        goalId: goal.id,
        goalIndex,
        elementIndex,
        element: elements[elementIndex],
      };
    }
  }

  throw new Error(
    `${elementType.slice(0, -1)} with id "${elementId}" not found in any goal`
  );
}

/**
 * Update workflow metadata timestamp
 */
function updateTimestamp(workflow: WorkflowTemplateV2): WorkflowTemplateV2 {
  workflow.metadata.last_modified = new Date().toISOString();
  return workflow;
}

// ============================================================================
// Core Implementation
// ============================================================================

export const workflowEditingTools: WorkflowEditingTools = {
  // ============================================================================
  // Goal Operations
  // ============================================================================

  addGoal(
    workflow: WorkflowTemplateV2,
    goal: Omit<Goal, "order">
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);

    // Auto-assign order as the last goal
    const maxOrder = newWorkflow.goals.reduce(
      (max, g) => Math.max(max, g.order),
      0
    );

    const newGoal: Goal = {
      ...goal,
      id: goal.id || generateId("goal"),
      order: maxOrder + 1,
      constraints: goal.constraints || [],
      policies: goal.policies || [],
      tasks: goal.tasks || [],
      forms: goal.forms || [],
    };

    // Validate the goal
    validateGoalStrict(newGoal);

    newWorkflow.goals.push(newGoal);

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  updateGoal(
    workflow: WorkflowTemplateV2,
    goalId: string,
    updates: Partial<Goal>
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goal, index } = findGoal(newWorkflow, goalId);

    // Merge updates while preserving required fields
    const updatedGoal: Goal = {
      ...goal,
      ...updates,
      id: goalId, // Ensure ID cannot be changed
      constraints: updates.constraints || goal.constraints,
      policies: updates.policies || goal.policies,
      tasks: updates.tasks || goal.tasks,
      forms: updates.forms || goal.forms,
    };

    // Validate updated goal
    validateGoalStrict(updatedGoal);

    newWorkflow.goals[index] = updatedGoal;

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  deleteGoal(workflow: WorkflowTemplateV2, goalId: string): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { index } = findGoal(newWorkflow, goalId);

    // Remove the goal
    newWorkflow.goals.splice(index, 1);

    // Reorder remaining goals to maintain sequential order
    newWorkflow.goals.forEach((goal, i) => {
      goal.order = i + 1;
    });

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  reorderGoals(
    workflow: WorkflowTemplateV2,
    goalOrder: string[]
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);

    // Validate that all goal IDs are present
    const currentGoalIds = new Set(newWorkflow.goals.map((g) => g.id));
    const providedGoalIds = new Set(goalOrder);

    if (
      currentGoalIds.size !== providedGoalIds.size ||
      ![...currentGoalIds].every((id) => providedGoalIds.has(id))
    ) {
      throw new Error(
        "Goal order must include all existing goal IDs exactly once"
      );
    }

    // Reorder goals based on provided order
    const reorderedGoals: Goal[] = [];
    goalOrder.forEach((goalId, index) => {
      const goal = newWorkflow.goals.find((g) => g.id === goalId);
      if (goal) {
        goal.order = index + 1;
        reorderedGoals.push(goal);
      }
    });

    newWorkflow.goals = reorderedGoals;

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  // ============================================================================
  // Task Operations
  // ============================================================================

  addTask(
    workflow: WorkflowTemplateV2,
    goalId: string,
    task: Task
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goal, index } = findGoal(newWorkflow, goalId);

    const newTask: Task = {
      ...task,
      id: task.id || generateId("task"),
    };

    // Validate the task
    validateTaskStrict(newTask);

    // Add task to goal
    newWorkflow.goals[index] = {
      ...goal,
      tasks: [...goal.tasks, newTask],
    };

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  updateTask(
    workflow: WorkflowTemplateV2,
    taskId: string,
    updates: Partial<Task>
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const {
      goalIndex,
      elementIndex,
      element: task,
    } = findElementInGoals<Task>(newWorkflow, taskId, "tasks");

    const updatedTask: Task = {
      ...task,
      ...updates,
      id: taskId, // Ensure ID cannot be changed
    };

    // Validate updated task
    validateTaskStrict(updatedTask);

    newWorkflow.goals[goalIndex].tasks[elementIndex] = updatedTask;

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  deleteTask(workflow: WorkflowTemplateV2, taskId: string): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goalIndex, elementIndex } = findElementInGoals<Task>(
      newWorkflow,
      taskId,
      "tasks"
    );

    // Remove task
    newWorkflow.goals[goalIndex].tasks.splice(elementIndex, 1);

    // Remove dependencies on this task from other tasks
    newWorkflow.goals.forEach((goal) => {
      goal.tasks.forEach((task) => {
        if (task.depends_on) {
          task.depends_on = task.depends_on.filter((dep) => dep !== taskId);
        }
      });
    });

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  // ============================================================================
  // Constraint Operations
  // ============================================================================

  addConstraint(
    workflow: WorkflowTemplateV2,
    goalId: string,
    constraint: Constraint
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goal, index } = findGoal(newWorkflow, goalId);

    const newConstraint: Constraint = {
      ...constraint,
      id: constraint.id || generateId("const"),
    };

    // Validate the constraint
    validateConstraintStrict(newConstraint);

    // Add constraint to goal
    newWorkflow.goals[index] = {
      ...goal,
      constraints: [...goal.constraints, newConstraint],
    };

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  updateConstraint(
    workflow: WorkflowTemplateV2,
    constraintId: string,
    updates: Partial<Constraint>
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const {
      goalIndex,
      elementIndex,
      element: constraint,
    } = findElementInGoals<Constraint>(
      newWorkflow,
      constraintId,
      "constraints"
    );

    const updatedConstraint: Constraint = {
      ...constraint,
      ...updates,
      id: constraintId, // Ensure ID cannot be changed
    };

    // Validate updated constraint
    validateConstraintStrict(updatedConstraint);

    newWorkflow.goals[goalIndex].constraints[elementIndex] = updatedConstraint;

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  deleteConstraint(
    workflow: WorkflowTemplateV2,
    constraintId: string
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goalIndex, elementIndex } = findElementInGoals<Constraint>(
      newWorkflow,
      constraintId,
      "constraints"
    );

    // Remove constraint
    newWorkflow.goals[goalIndex].constraints.splice(elementIndex, 1);

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  // ============================================================================
  // Policy Operations
  // ============================================================================

  addPolicy(
    workflow: WorkflowTemplateV2,
    goalId: string,
    policy: Policy
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goal, index } = findGoal(newWorkflow, goalId);

    const newPolicy: Policy = {
      ...policy,
      id: policy.id || generateId("pol"),
    };

    // Validate the policy
    validatePolicyStrict(newPolicy);

    // Add policy to goal
    newWorkflow.goals[index] = {
      ...goal,
      policies: [...goal.policies, newPolicy],
    };

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  updatePolicy(
    workflow: WorkflowTemplateV2,
    policyId: string,
    updates: Partial<Policy>
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const {
      goalIndex,
      elementIndex,
      element: policy,
    } = findElementInGoals<Policy>(newWorkflow, policyId, "policies");

    const updatedPolicy: Policy = {
      ...policy,
      ...updates,
      id: policyId, // Ensure ID cannot be changed
    };

    // Validate updated policy
    validatePolicyStrict(updatedPolicy);

    newWorkflow.goals[goalIndex].policies[elementIndex] = updatedPolicy;

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  deletePolicy(
    workflow: WorkflowTemplateV2,
    policyId: string
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goalIndex, elementIndex } = findElementInGoals<Policy>(
      newWorkflow,
      policyId,
      "policies"
    );

    // Remove policy
    newWorkflow.goals[goalIndex].policies.splice(elementIndex, 1);

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  // ============================================================================
  // Form Operations
  // ============================================================================

  addForm(
    workflow: WorkflowTemplateV2,
    goalId: string,
    form: Form
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goal, index } = findGoal(newWorkflow, goalId);

    const newForm: Form = {
      ...form,
      id: form.id || generateId("form"),
    };

    // Validate the form
    validateFormStrict(newForm);

    // Add form to goal
    newWorkflow.goals[index] = {
      ...goal,
      forms: [...goal.forms, newForm],
    };

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  updateForm(
    workflow: WorkflowTemplateV2,
    formId: string,
    updates: Partial<Form>
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const {
      goalIndex,
      elementIndex,
      element: form,
    } = findElementInGoals<Form>(newWorkflow, formId, "forms");

    const updatedForm: Form = {
      ...form,
      ...updates,
      id: formId, // Ensure ID cannot be changed
    };

    // Validate updated form
    validateFormStrict(updatedForm);

    newWorkflow.goals[goalIndex].forms[elementIndex] = updatedForm;

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  deleteForm(workflow: WorkflowTemplateV2, formId: string): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goalIndex, elementIndex } = findElementInGoals<Form>(
      newWorkflow,
      formId,
      "forms"
    );

    // Remove form
    newWorkflow.goals[goalIndex].forms.splice(elementIndex, 1);

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  // ============================================================================
  // Workflow Metadata Operations
  // ============================================================================

  updateWorkflowMetadata(
    workflow: WorkflowTemplateV2,
    updates: Partial<WorkflowMetadata>
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);

    newWorkflow.metadata = {
      ...newWorkflow.metadata,
      ...updates,
      last_modified: new Date().toISOString(), // Always update timestamp
    };

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return newWorkflow;
  },

  updateGlobalSettings(
    workflow: WorkflowTemplateV2,
    settings: Partial<GlobalSettings>
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);

    // Only update defined settings to avoid undefined assignment issues
    const currentSettings = newWorkflow.global_settings || {
      max_execution_time_hours: 24,
      data_retention_days: 30,
      default_timezone: "UTC",
      notification_channels: {
        urgent: [],
        normal: [],
        reports: [],
      },
      integrations: {},
    };

    newWorkflow.global_settings = {
      ...currentSettings,
      ...(settings.max_execution_time_hours !== undefined && {
        max_execution_time_hours: settings.max_execution_time_hours,
      }),
      ...(settings.data_retention_days !== undefined && {
        data_retention_days: settings.data_retention_days,
      }),
      ...(settings.default_timezone !== undefined && {
        default_timezone: settings.default_timezone,
      }),
      ...(settings.notification_channels !== undefined && {
        notification_channels: settings.notification_channels,
      }),
      ...(settings.integrations !== undefined && {
        integrations: settings.integrations,
      }),
    };

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  duplicateGoal(
    workflow: WorkflowTemplateV2,
    goalId: string,
    newGoalName?: string
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const { goal } = findGoal(newWorkflow, goalId);

    // Create duplicate with new IDs
    const duplicatedGoal: Goal = {
      ...JSON.parse(JSON.stringify(goal)), // Deep clone
      id: generateId("goal"),
      name: newGoalName || `${goal.name} (Copy)`,
      order: newWorkflow.goals.length + 1,
      // Generate new IDs for all nested elements
      constraints: goal.constraints.map((c) => ({
        ...c,
        id: generateId("const"),
      })),
      policies: goal.policies.map((p) => ({ ...p, id: generateId("pol") })),
      tasks: goal.tasks.map((t) => ({
        ...t,
        id: generateId("task"),
        depends_on: [],
      })), // Clear dependencies
      forms: goal.forms.map((f) => ({ ...f, id: generateId("form") })),
    };

    // Validate the duplicated goal
    validateGoalStrict(duplicatedGoal);

    newWorkflow.goals.push(duplicatedGoal);

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },

  moveElementBetweenGoals(
    workflow: WorkflowTemplateV2,
    elementType: "task" | "constraint" | "policy" | "form",
    elementId: string,
    fromGoalId: string,
    toGoalId: string
  ): WorkflowTemplateV2 {
    const newWorkflow = cloneWorkflow(workflow);
    const pluralType = `${elementType}s` as
      | "tasks"
      | "constraints"
      | "policies"
      | "forms";

    // Find source and destination goals
    const { goal: fromGoal, index: fromIndex } = findGoal(
      newWorkflow,
      fromGoalId
    );
    const { index: toIndex } = findGoal(newWorkflow, toGoalId);

    // Find element in source goal
    const elementIndex = fromGoal[pluralType].findIndex(
      (item: any) => item.id === elementId
    );
    if (elementIndex === -1) {
      throw new Error(
        `${elementType} with id "${elementId}" not found in goal "${fromGoalId}"`
      );
    }

    // Extract element from source goal
    const element = fromGoal[pluralType][elementIndex];
    newWorkflow.goals[fromIndex][pluralType].splice(elementIndex, 1);

    // Add element to destination goal
    (newWorkflow.goals[toIndex][pluralType] as any[]).push(element);

    // Validate the entire workflow
    validateWorkflowV2Strict(newWorkflow);

    return updateTimestamp(newWorkflow);
  },
};

// ============================================================================
// Tool Registration for AI Agent Use
// ============================================================================

/**
 * Tool definitions for AI agent integration
 * These provide structured interfaces for LLM tool calling
 */
export const WORKFLOW_EDITING_TOOL_DEFINITIONS = {
  addGoal: {
    name: "addGoal",
    description: "Add a new goal to the workflow with all required elements",
    parameters: {
      type: "object",
      properties: {
        goal: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description:
                "Unique identifier for the goal (optional, will be auto-generated)",
            },
            name: { type: "string", description: "Goal name" },
            description: { type: "string", description: "Goal description" },
            timeout_minutes: {
              type: "number",
              description: "Optional timeout in minutes",
            },
            constraints: {
              type: "array",
              description: "Array of constraints (optional)",
            },
            policies: {
              type: "array",
              description: "Array of policies (optional)",
            },
            tasks: { type: "array", description: "Array of tasks (optional)" },
            forms: { type: "array", description: "Array of forms (optional)" },
          },
          required: ["name", "description"],
        },
      },
      required: ["goal"],
    },
  },

  addTask: {
    name: "addTask",
    description: "Add a task to a specific goal",
    parameters: {
      type: "object",
      properties: {
        goalId: {
          type: "string",
          description: "ID of the goal to add the task to",
        },
        task: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique identifier (optional)" },
            description: { type: "string", description: "Task description" },
            assignee: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["ai_agent", "human"] },
                model: {
                  type: "string",
                  description: "AI model name (for ai_agent)",
                },
                role: {
                  type: "string",
                  description: "Human role (for human assignee)",
                },
                capabilities: { type: "array", items: { type: "string" } },
              },
              required: ["type"],
            },
            timeout_minutes: { type: "number" },
            depends_on: { type: "array", items: { type: "string" } },
          },
          required: ["description", "assignee"],
        },
      },
      required: ["goalId", "task"],
    },
  },

  addConstraint: {
    name: "addConstraint",
    description: "Add a constraint to a specific goal",
    parameters: {
      type: "object",
      properties: {
        goalId: {
          type: "string",
          description: "ID of the goal to add the constraint to",
        },
        constraint: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique identifier (optional)" },
            description: {
              type: "string",
              description: "Constraint description",
            },
            type: {
              type: "string",
              enum: [
                "time_limit",
                "data_validation",
                "business_rule",
                "rate_limit",
                "access_control",
              ],
            },
            enforcement: {
              type: "string",
              enum: [
                "hard_stop",
                "block_progression",
                "require_approval",
                "warn",
              ],
            },
            value: { description: "Constraint value" },
            condition: { type: "string", description: "Constraint condition" },
          },
          required: ["description", "type", "enforcement"],
        },
      },
      required: ["goalId", "constraint"],
    },
  },

  // Goal Operations
  updateGoal: {
    name: "updateGoal",
    description: "Update properties of an existing goal",
    parameters: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "ID of the goal to update" },
        updates: {
          type: "object",
          properties: {
            name: { type: "string", description: "Goal name" },
            description: { type: "string", description: "Goal description" },
            timeout_minutes: { type: "number", description: "Timeout in minutes" },
          },
        },
      },
      required: ["goalId", "updates"],
    },
  },

  deleteGoal: {
    name: "deleteGoal",
    description: "Delete a goal and all its elements",
    parameters: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "ID of the goal to delete" },
      },
      required: ["goalId"],
    },
  },

  reorderGoals: {
    name: "reorderGoals",
    description: "Reorder goals in the workflow",
    parameters: {
      type: "object",
      properties: {
        goalIds: { 
          type: "array", 
          items: { type: "string" },
          description: "Array of goal IDs in new order" 
        },
      },
      required: ["goalIds"],
    },
  },

  duplicateGoal: {
    name: "duplicateGoal",
    description: "Duplicate an existing goal with a new name",
    parameters: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "ID of the goal to duplicate" },
        newName: { type: "string", description: "Name for the duplicated goal" },
      },
      required: ["goalId", "newName"],
    },
  },

  // Task Operations
  updateTask: {
    name: "updateTask",
    description: "Update properties of an existing task",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task to update" },
        updates: {
          type: "object",
          properties: {
            description: { type: "string", description: "Task description" },
            assignee: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["ai_agent", "human"] },
                model: { type: "string", description: "AI model name" },
                role: { type: "string", description: "Human role" },
              },
            },
            timeout_minutes: { type: "number", description: "Task timeout" },
          },
        },
      },
      required: ["taskId", "updates"],
    },
  },

  deleteTask: {
    name: "deleteTask",
    description: "Delete a task and clean up dependencies",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task to delete" },
      },
      required: ["taskId"],
    },
  },

  // Constraint Operations
  updateConstraint: {
    name: "updateConstraint",
    description: "Update properties of an existing constraint",
    parameters: {
      type: "object",
      properties: {
        constraintId: { type: "string", description: "ID of the constraint to update" },
        updates: {
          type: "object",
          properties: {
            description: { type: "string", description: "Constraint description" },
            enforcement: {
              type: "string",
              enum: ["hard_stop", "block_progression", "require_approval", "warn"],
            },
            value: { description: "Constraint value" },
            condition: { type: "string", description: "Constraint condition" },
          },
        },
      },
      required: ["constraintId", "updates"],
    },
  },

  deleteConstraint: {
    name: "deleteConstraint",
    description: "Delete a constraint",
    parameters: {
      type: "object",
      properties: {
        constraintId: { type: "string", description: "ID of the constraint to delete" },
      },
      required: ["constraintId"],
    },
  },

  // Policy Operations
  addPolicy: {
    name: "addPolicy",
    description: "Add a policy to a specific goal",
    parameters: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "ID of the goal to add the policy to" },
        policy: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique identifier (optional)" },
            name: { type: "string", description: "Policy name" },
            if: {
              type: "object",
              properties: {
                condition: { type: "string", description: "Condition string" },
                field: { type: "string", description: "Field to check" },
                operator: { type: "string", description: "Comparison operator" },
                value: { description: "Value to compare against" },
              },
            },
            then: {
              type: "object",
              properties: {
                action: { type: "string", description: "Action to take" },
                params: { type: "object", description: "Action parameters" },
              },
              required: ["action", "params"],
            },
          },
          required: ["name", "if", "then"],
        },
      },
      required: ["goalId", "policy"],
    },
  },

  updatePolicy: {
    name: "updatePolicy",
    description: "Update properties of an existing policy",
    parameters: {
      type: "object",
      properties: {
        policyId: { type: "string", description: "ID of the policy to update" },
        updates: {
          type: "object",
          properties: {
            name: { type: "string", description: "Policy name" },
            if: { type: "object", description: "Policy condition" },
            then: { type: "object", description: "Policy action" },
          },
        },
      },
      required: ["policyId", "updates"],
    },
  },

  deletePolicy: {
    name: "deletePolicy",
    description: "Delete a policy",
    parameters: {
      type: "object",
      properties: {
        policyId: { type: "string", description: "ID of the policy to delete" },
      },
      required: ["policyId"],
    },
  },

  // Form Operations
  addForm: {
    name: "addForm",
    description: "Add a form to a specific goal",
    parameters: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "ID of the goal to add the form to" },
        form: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique identifier (optional)" },
            name: { type: "string", description: "Form name" },
            description: { type: "string", description: "Form description" },
            type: { 
              type: "string", 
              enum: ["structured", "conversational", "automated"],
              description: "Form type" 
            },
            schema: { type: "object", description: "Form schema (optional)" },
            agent: { type: "string", description: "Agent for conversational forms (optional)" },
            template: { type: "string", description: "Template for automated forms (optional)" },
          },
          required: ["name", "type"],
        },
      },
      required: ["goalId", "form"],
    },
  },

  updateForm: {
    name: "updateForm",
    description: "Update properties of an existing form",
    parameters: {
      type: "object",
      properties: {
        formId: { type: "string", description: "ID of the form to update" },
        updates: {
          type: "object",
          properties: {
            name: { type: "string", description: "Form name" },
            description: { type: "string", description: "Form description" },
            type: { 
              type: "string", 
              enum: ["structured", "conversational", "automated"] 
            },
            schema: { type: "object", description: "Form schema" },
          },
        },
      },
      required: ["formId", "updates"],
    },
  },

  deleteForm: {
    name: "deleteForm",
    description: "Delete a form",
    parameters: {
      type: "object",
      properties: {
        formId: { type: "string", description: "ID of the form to delete" },
      },
      required: ["formId"],
    },
  },

  // Bulk Operations
  moveElementBetweenGoals: {
    name: "moveElementBetweenGoals",
    description: "Move an element (task, constraint, policy, or form) between goals",
    parameters: {
      type: "object",
      properties: {
        elementType: { 
          type: "string", 
          enum: ["task", "constraint", "policy", "form"],
          description: "Type of element to move" 
        },
        elementId: { type: "string", description: "ID of the element to move" },
        fromGoalId: { type: "string", description: "ID of the source goal" },
        toGoalId: { type: "string", description: "ID of the destination goal" },
      },
      required: ["elementType", "elementId", "fromGoalId", "toGoalId"],
    },
  },

  // Metadata Operations
  updateWorkflowMetadata: {
    name: "updateWorkflowMetadata",
    description: "Update workflow metadata",
    parameters: {
      type: "object",
      properties: {
        updates: {
          type: "object",
          properties: {
            author: { type: "string", description: "Workflow author" },
            tags: { 
              type: "array", 
              items: { type: "string" },
              description: "Workflow tags" 
            },
          },
        },
      },
      required: ["updates"],
    },
  },

  updateGlobalSettings: {
    name: "updateGlobalSettings",
    description: "Update global workflow settings",
    parameters: {
      type: "object",
      properties: {
        settings: {
          type: "object",
          properties: {
            max_execution_time_hours: { type: "number", description: "Maximum execution time" },
            data_retention_days: { type: "number", description: "Data retention period" },
            default_timezone: { type: "string", description: "Default timezone" },
          },
        },
      },
      required: ["settings"],
    },
  },
};

/**
 * Export the tools for use in the AI agent
 */
export default workflowEditingTools;
