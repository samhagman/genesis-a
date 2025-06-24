/**
 * Workflow Instance Factory
 *
 * Creates workflow instances from templates with proper initialization.
 * Handles the conversion from static templates to dynamic runtime state.
 */

import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import type {
  WorkflowInstance,
  RuntimeEnvelope,
  GoalInstance,
  ConstraintInstance,
  PolicyInstance,
  TaskInstance,
  FormInstance,
  FieldInstance,
} from "@/types/workflow-instance";

// Generate unique IDs for instances
function generateInstanceId(): string {
  return `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a goal instance from template
export function createGoalInstance(
  templateId: string,
  parentInstanceId?: string
): GoalInstance {
  return {
    id: generateInstanceId(),
    templateId,
    status: "NOT_STARTED",
    createdAt: new Date(),
    updatedAt: new Date(),
    parentInstanceId,
    progressPercent: 0,
    ctx: {},
  };
}

// Create a constraint instance from template
export function createConstraintInstance(
  templateId: string,
  parentInstanceId: string
): ConstraintInstance {
  return {
    id: generateInstanceId(),
    templateId,
    status: "NOT_STARTED",
    createdAt: new Date(),
    updatedAt: new Date(),
    parentInstanceId,
    satisfied: null,
    violationCount: 0,
    enforcement: "warn", // Will be updated from template
    ctx: {},
  };
}

// Create a policy instance from template
export function createPolicyInstance(
  templateId: string,
  parentInstanceId: string
): PolicyInstance {
  return {
    id: generateInstanceId(),
    templateId,
    status: "NOT_STARTED",
    createdAt: new Date(),
    updatedAt: new Date(),
    parentInstanceId,
    fireCount: 0,
    evaluationHistory: [],
    ctx: {},
  };
}

// Create a task instance from template
export function createTaskInstance(
  templateId: string,
  parentInstanceId: string
): TaskInstance {
  return {
    id: generateInstanceId(),
    templateId,
    status: "NOT_STARTED",
    createdAt: new Date(),
    updatedAt: new Date(),
    parentInstanceId,
    retryCount: 0,
    ctx: {},
  };
}

// Create a form instance from template
export function createFormInstance(
  templateId: string,
  parentInstanceId: string
): FormInstance {
  return {
    id: generateInstanceId(),
    templateId,
    status: "NOT_STARTED",
    createdAt: new Date(),
    updatedAt: new Date(),
    parentInstanceId,
    fields: {},
    ctx: {},
  };
}

// Create a field instance for forms
export function createFieldInstance(value: any = null): FieldInstance {
  return {
    value,
    dirty: false,
    touched: false,
    valid: null,
    updatedAt: new Date(),
  };
}

// Main factory function to create a complete workflow instance from a template
export function createWorkflowInstance(
  template: WorkflowTemplateV2,
  scenario: "fresh_start" | "in_progress" | "happy_path" = "fresh_start"
): WorkflowInstance {
  const workflowInstanceId = generateInstanceId();
  const nodeMap: Record<string, RuntimeEnvelope> = {};
  const templateToInstanceMap: Record<string, string> = {};

  // Create instances for all template nodes
  for (const goal of template.goals) {
    // Create goal instance
    const goalInstance = createGoalInstance(goal.id);
    nodeMap[goalInstance.id] = goalInstance;
    templateToInstanceMap[goal.id] = goalInstance.id;

    // Create constraint instances
    for (const constraint of goal.constraints) {
      const constraintInstance = createConstraintInstance(
        constraint.id,
        goalInstance.id
      );
      constraintInstance.enforcement = constraint.enforcement;
      nodeMap[constraintInstance.id] = constraintInstance;
      templateToInstanceMap[constraint.id] = constraintInstance.id;
    }

    // Create policy instances
    for (const policy of goal.policies) {
      const policyInstance = createPolicyInstance(policy.id, goalInstance.id);
      nodeMap[policyInstance.id] = policyInstance;
      templateToInstanceMap[policy.id] = policyInstance.id;
    }

    // Create task instances
    for (const task of goal.tasks) {
      const taskInstance = createTaskInstance(task.id, goalInstance.id);
      nodeMap[taskInstance.id] = taskInstance;
      templateToInstanceMap[task.id] = taskInstance.id;
    }

    // Create form instances
    for (const form of goal.forms) {
      const formInstance = createFormInstance(form.id, goalInstance.id);

      // Initialize form fields if schema exists
      if (form.schema?.sections) {
        for (const section of form.schema.sections) {
          if (section.fields) {
            for (const field of section.fields) {
              formInstance.fields[field.name] = createFieldInstance();
            }
          }
        }
      }

      nodeMap[formInstance.id] = formInstance;
      templateToInstanceMap[form.id] = formInstance.id;
    }
  }

  // Apply scenario-specific state modifications
  applyScenarioState(nodeMap, template, scenario);

  const instance: WorkflowInstance = {
    id: workflowInstanceId,
    templateId: template.id,
    templateVersion: template.version,
    status: "NOT_STARTED",
    createdAt: new Date(),
    updatedAt: new Date(),
    nodeMap,
    templateToInstanceMap,
    context: {},
    metadata: {
      scenario,
      tags: ["development"],
    },
  };

  // Set overall instance status based on node states
  updateWorkflowStatus(instance);

  return instance;
}

// Apply scenario-specific state to nodes
function applyScenarioState(
  nodeMap: Record<string, RuntimeEnvelope>,
  template: WorkflowTemplateV2,
  scenario: string
): void {
  const nodes = Object.values(nodeMap);

  switch (scenario) {
    case "fresh_start":
      // All nodes remain NOT_STARTED (default)
      break;

    case "in_progress":
      // First goal active, some constraints satisfied, some tasks assigned
      const firstGoal = nodes.find((n) =>
        template.goals.some((g) => g.id === n.templateId)
      );
      if (firstGoal) {
        firstGoal.status = "ACTIVE";
        (firstGoal as GoalInstance).progressPercent = 30;
      }

      // Some constraints satisfied
      nodes
        .filter((n) => n.templateId.includes("constraint"))
        .slice(0, 2)
        .forEach((constraint) => {
          constraint.status = "COMPLETED";
          (constraint as ConstraintInstance).satisfied = true;
        });

      // Some tasks assigned
      nodes
        .filter((n) => n.templateId.includes("task"))
        .slice(0, 1)
        .forEach((task) => {
          task.status = "ACTIVE";
          (task as TaskInstance).assignedAt = new Date();
        });

      break;

    case "happy_path":
      // Most nodes completed successfully
      nodes.forEach((node, index) => {
        if (index < nodes.length * 0.8) {
          node.status = "COMPLETED";
          node.updatedAt = new Date(
            Date.now() - (nodes.length - index) * 60000
          );

          if (node.templateId.includes("goal")) {
            (node as GoalInstance).progressPercent = 100;
            (node as GoalInstance).completedAt = node.updatedAt;
          } else if (node.templateId.includes("constraint")) {
            (node as ConstraintInstance).satisfied = true;
          } else if (node.templateId.includes("task")) {
            (node as TaskInstance).completedAt = node.updatedAt;
            (node as TaskInstance).result = { success: true };
          }
        }
      });
      break;
  }
}

// Update overall workflow status based on node states
function updateWorkflowStatus(instance: WorkflowInstance): void {
  const nodes = Object.values(instance.nodeMap);
  const goals = nodes.filter(
    (n) =>
      instance.templateToInstanceMap &&
      Object.keys(instance.templateToInstanceMap).includes(n.templateId)
  );

  if (goals.every((g) => g.status === "NOT_STARTED")) {
    instance.status = "NOT_STARTED";
  } else if (goals.some((g) => g.status === "ACTIVE")) {
    instance.status = "ACTIVE";
  } else if (goals.every((g) => g.status === "COMPLETED")) {
    instance.status = "COMPLETED";
    instance.completedAt = new Date();
  } else if (goals.some((g) => g.status === "FAILED")) {
    instance.status = "FAILED";
  } else {
    instance.status = "ACTIVE";
  }
}
