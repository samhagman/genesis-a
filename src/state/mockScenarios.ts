/**
 * Mock Workflow Scenarios
 *
 * Provides realistic execution scenarios for development and testing.
 * Each scenario represents a different state of workflow execution.
 */

import type {
  ConstraintInstance,
  ExecutionScenario,
  FormInstance,
  GoalInstance,
  PolicyInstance,
  TaskInstance,
} from "@/types/workflow-instance";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import { createWorkflowInstance } from "./instanceFactory";

// Create a fresh start scenario
export function createFreshStartScenario(
  template: WorkflowTemplateV2
): ExecutionScenario {
  const instance = createWorkflowInstance(template, "fresh_start");

  return {
    name: "fresh_start",
    description: "Brand new workflow - nothing has started yet",
    instance,
  };
}

// Create an in-progress scenario
export function createInProgressScenario(
  template: WorkflowTemplateV2
): ExecutionScenario {
  const instance = createWorkflowInstance(template, "in_progress");

  return {
    name: "in_progress",
    description: "Workflow actively running with mixed progress",
    instance,
  };
}

// Create a happy path scenario (mostly successful)
export function createHappyPathScenario(
  template: WorkflowTemplateV2
): ExecutionScenario {
  const instance = createWorkflowInstance(template, "happy_path");

  return {
    name: "happy_path",
    description: "Successful workflow execution with most elements completed",
    instance,
  };
}

// Create a blocked constraint scenario
export function createBlockedConstraintScenario(
  template: WorkflowTemplateV2
): ExecutionScenario {
  const instance = createWorkflowInstance(template, "in_progress");

  // Find the first constraint and make it violated
  const constraintInstance = Object.values(instance.nodeMap).find(
    (node) =>
      node.templateId.includes("constraint") ||
      node.templateId.includes("const_")
  ) as ConstraintInstance;

  if (constraintInstance) {
    constraintInstance.status = "FAILED";
    constraintInstance.satisfied = false;
    constraintInstance.violationCount = 1;
    constraintInstance.violationDetails =
      "Time limit exceeded - shift starts in 2 hours";
    constraintInstance.ctx = {
      lastViolation: new Date(),
      violationType: "time_limit_exceeded",
    };
  }

  // Block the parent goal
  const parentGoal = Object.values(instance.nodeMap).find(
    (node) => node.id === constraintInstance?.parentInstanceId
  ) as GoalInstance;

  if (parentGoal) {
    parentGoal.status = "BLOCKED";
    parentGoal.ctx = {
      blockedBy: constraintInstance.id,
      blockedReason: "Constraint violation",
    };
  }

  instance.metadata.scenario = "blocked_constraint";

  return {
    name: "blocked_constraint",
    description: "Workflow blocked by constraint violation",
    instance,
  };
}

// Create a failed task scenario
export function createFailedTaskScenario(
  template: WorkflowTemplateV2
): ExecutionScenario {
  const instance = createWorkflowInstance(template, "in_progress");

  // Find the first task and make it failed
  const taskInstance = Object.values(instance.nodeMap).find((node) =>
    node.templateId.includes("task")
  ) as TaskInstance;

  if (taskInstance) {
    taskInstance.status = "FAILED";
    taskInstance.assignedAt = new Date(Date.now() - 30 * 60000); // 30 minutes ago
    taskInstance.startedAt = new Date(Date.now() - 25 * 60000); // 25 minutes ago
    taskInstance.retryCount = 2;
    taskInstance.ctx = {
      error: "Failed to connect to external API",
      errorCode: "CONNECTION_TIMEOUT",
      lastError: new Date(),
    };
  }

  instance.metadata.scenario = "failed_task";

  return {
    name: "failed_task",
    description: "Task execution failure with retry attempts",
    instance,
  };
}

// Create a policy triggered scenario
export function createPolicyTriggeredScenario(
  template: WorkflowTemplateV2
): ExecutionScenario {
  const instance = createWorkflowInstance(template, "in_progress");

  // Find policies and make them active
  const policyInstances = Object.values(instance.nodeMap).filter(
    (node) =>
      node.templateId.includes("policy") || node.templateId.includes("pol_")
  ) as PolicyInstance[];

  policyInstances.forEach((policy, index) => {
    policy.status = "ACTIVE";
    policy.fireCount = index + 1;
    policy.lastTriggeredAt = new Date(Date.now() - index * 5 * 60000); // Staggered triggers
    policy.evaluationHistory = [
      {
        timestamp: new Date(Date.now() - index * 5 * 60000),
        conditionMet: true,
        actionTaken: "escalate_priority",
        result: { escalated: true, newPriority: "high" },
      },
    ];
    policy.ctx = {
      activelyMonitoring: true,
      nextEvaluation: new Date(Date.now() + 2 * 60000), // 2 minutes from now
    };
  });

  instance.metadata.scenario = "policy_triggered";

  return {
    name: "policy_triggered",
    description: "Multiple policies actively triggering and taking actions",
    instance,
  };
}

// Create a partial form filling scenario
export function createFormPartialScenario(
  template: WorkflowTemplateV2
): ExecutionScenario {
  const instance = createWorkflowInstance(template, "in_progress");

  // Find forms and make them partially filled
  const formInstances = Object.values(instance.nodeMap).filter((node) =>
    node.templateId.includes("form")
  ) as FormInstance[];

  formInstances.forEach((form, index) => {
    form.status = "ACTIVE";

    // Fill some fields
    const fieldKeys = Object.keys(form.fields);
    for (const fieldKey of fieldKeys.slice(
      0,
      Math.ceil(fieldKeys.length / 2)
    )) {
      const field = form.fields[fieldKey];
      field.value = `Sample value ${index + 1}`;
      field.dirty = true;
      field.touched = true;
      field.valid = true;
      field.updatedAt = new Date(Date.now() - index * 10 * 60000);
    }

    form.ctx = {
      lastInteraction: new Date(Date.now() - index * 10 * 60000),
      completionPercent: 50,
    };
  });

  instance.metadata.scenario = "form_partial";

  return {
    name: "form_partial",
    description: "Forms with partial data entry in progress",
    instance,
  };
}

// Create a timeout approaching scenario
export function createTimeoutScenario(
  template: WorkflowTemplateV2
): ExecutionScenario {
  const instance = createWorkflowInstance(template, "in_progress");

  // Find goals with timeouts and make them approaching deadline
  const goalInstances = Object.values(instance.nodeMap).filter((node) =>
    template.goals.some((g) => g.id === node.templateId && g.timeout_minutes)
  ) as GoalInstance[];

  for (const goal of goalInstances) {
    goal.status = "ACTIVE";
    goal.progressPercent = 75; // Close to completion but running out of time
    goal.activatedAt = new Date(Date.now() - 25 * 60000); // Started 25 minutes ago
    goal.timeoutAt = new Date(Date.now() + 5 * 60000); // 5 minutes left
    goal.ctx = {
      warningIssued: true,
      urgencyLevel: "high",
      estimatedCompletion: new Date(Date.now() + 8 * 60000), // Estimated to finish late
    };
  }

  instance.metadata.scenario = "timeout_scenario";

  return {
    name: "timeout_scenario",
    description: "Goals approaching timeout deadlines",
    instance,
  };
}

// Main function to get all available scenarios for a template
export function getAllScenarios(
  template: WorkflowTemplateV2
): ExecutionScenario[] {
  return [
    createFreshStartScenario(template),
    createInProgressScenario(template),
    createHappyPathScenario(template),
    createBlockedConstraintScenario(template),
    createFailedTaskScenario(template),
    createPolicyTriggeredScenario(template),
    createFormPartialScenario(template),
    createTimeoutScenario(template),
  ];
}

// Initialize scenarios for the workflow store
export function initializeScenarios(template: WorkflowTemplateV2): void {
  const scenarios = getAllScenarios(template);

  // Set scenarios in the store (this would be called from App.tsx)
  import("./workflowStore").then(({ useWorkflowStore }) => {
    useWorkflowStore.getState().setScenarios(scenarios);
  });
}
