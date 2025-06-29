/**
 * Workflow Store Tests
 *
 * Tests for the Zustand-based workflow state management system.
 */

import { createWorkflowInstance } from "@/state/instanceFactory";
import { TestWorkflowRepository } from "@/state/testRepository";
import type { ExecutionStatus } from "@/types/workflow-instance";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import { beforeEach, describe, expect, it } from "vitest";

// Mock workflow template for testing
const mockTemplate: WorkflowTemplateV2 = {
  id: "test-workflow",
  name: "Test Workflow",
  version: "1.0",
  objective: "Test workflow for state management",
  metadata: {
    author: "test",
    created_at: "2024-01-01T00:00:00Z",
    last_modified: "2024-01-01T00:00:00Z",
    tags: ["test"],
  },
  goals: [
    {
      id: "goal-1",
      name: "Test Goal",
      description: "A test goal",
      order: 1,
      constraints: [
        {
          id: "constraint-1",
          description: "Test constraint",
          type: "time_limit",
          enforcement: "hard_stop",
          value: 30,
        },
      ],
      policies: [
        {
          id: "policy-1",
          name: "Test Policy",
          if: { field: "test", operator: "==", value: "test" },
          then: { action: "test_action", params: {} },
        },
      ],
      tasks: [
        {
          id: "task-1",
          description: "Test task",
          assignee: { type: "human", role: "test_role" },
        },
      ],
      forms: [
        {
          id: "form-1",
          name: "Test Form",
          description: "Test form",
          type: "structured",
        },
      ],
    },
  ],
};

describe("Workflow Repository", () => {
  let repository: TestWorkflowRepository;

  beforeEach(() => {
    repository = new TestWorkflowRepository();
  });

  it("starts with no active instance", () => {
    expect(repository.getActiveInstance()).toBeNull();
  });

  it("can set and get active instance", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    const retrieved = repository.getActiveInstance();
    expect(retrieved).toBeTruthy();
    expect(retrieved?.id).toBe(instance.id);
    expect(retrieved?.templateId).toBe(mockTemplate.id);
  });

  it("can clear active instance", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);
    expect(repository.getActiveInstance()).toBeTruthy();

    repository.clearActiveInstance();
    expect(repository.getActiveInstance()).toBeNull();
  });

  it("can get node instance by template ID", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    const goalNode = repository.getNodeInstance("goal-1");
    expect(goalNode).toBeTruthy();
    expect(goalNode?.templateId).toBe("goal-1");
    expect(goalNode?.status).toBe("NOT_STARTED");
  });

  it("returns null for non-existent node", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    const nonExistentNode = repository.getNodeInstance("non-existent");
    expect(nonExistentNode).toBeNull();
  });

  it("can update node status", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    repository.updateNodeStatus("goal-1", "ACTIVE");

    const updatedNode = repository.getNodeInstance("goal-1");
    expect(updatedNode?.status).toBe("ACTIVE");
  });

  it("can update node context", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    const context = { testData: "test value", progress: 50 };
    repository.updateNodeContext("goal-1", context);

    const updatedNode = repository.getNodeInstance("goal-1");
    expect(updatedNode?.ctx).toEqual(context);
  });

  it("throws error when updating node without active instance", () => {
    expect(() => {
      repository.updateNodeStatus("goal-1", "ACTIVE");
    }).toThrow();
  });

  it("throws error when updating non-existent node", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    expect(() => {
      repository.updateNodeStatus("non-existent", "ACTIVE");
    }).toThrow();
  });

  // TODO: Fix React import issue with subscriptions
  // it('can handle subscriptions', () => {
  //   let callbackCount = 0;
  //   let lastInstance = null;
  //
  //   const unsubscribe = repository.subscribe((instance) => {
  //     callbackCount++;
  //     lastInstance = instance;
  //   });
  //
  //   const instance = createWorkflowInstance(mockTemplate, 'fresh_start');
  //   repository.setActiveInstance(instance);
  //
  //   // In test environment, subscriptions are no-op, so just verify they don't throw
  //   expect(unsubscribe).toBeTypeOf('function');
  //
  //   // Verify the actual functionality works (getting the instance)
  //   expect(repository.getActiveInstance()).toBeTruthy();
  // });
});

describe("Instance Factory", () => {
  it("creates fresh start instance correctly", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");

    expect(instance.templateId).toBe(mockTemplate.id);
    expect(instance.status).toBe("NOT_STARTED");
    expect(instance.metadata.scenario).toBe("fresh_start");

    // Check that all template elements have corresponding instances
    const nodeCount = Object.keys(instance.nodeMap).length;
    const expectedCount =
      mockTemplate.goals.length +
      mockTemplate.goals.reduce(
        (sum, goal) =>
          sum +
          goal.constraints.length +
          goal.policies.length +
          goal.tasks.length +
          goal.forms.length,
        0
      );

    expect(nodeCount).toBe(expectedCount);
  });

  it("creates in-progress instance with some active elements", () => {
    const instance = createWorkflowInstance(mockTemplate, "in_progress");

    expect(instance.metadata.scenario).toBe("in_progress");

    // Should have some active or completed elements
    const nodes = Object.values(instance.nodeMap);
    const nonStartedNodes = nodes.filter((n) => n.status !== "NOT_STARTED");
    expect(nonStartedNodes.length).toBeGreaterThan(0);
  });

  it("creates happy path instance with most elements completed", () => {
    const instance = createWorkflowInstance(mockTemplate, "happy_path");

    expect(instance.metadata.scenario).toBe("happy_path");

    // Should have many completed elements
    const nodes = Object.values(instance.nodeMap);
    const completedNodes = nodes.filter((n) => n.status === "COMPLETED");
    expect(completedNodes.length).toBeGreaterThan(0);
  });

  it("maintains template to instance mapping", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");

    // Check that all template IDs are mapped
    expect(instance.templateToInstanceMap["goal-1"]).toBeTruthy();
    expect(instance.templateToInstanceMap["constraint-1"]).toBeTruthy();
    expect(instance.templateToInstanceMap["policy-1"]).toBeTruthy();
    expect(instance.templateToInstanceMap["task-1"]).toBeTruthy();
    expect(instance.templateToInstanceMap["form-1"]).toBeTruthy();

    // Check that mapped instances exist
    const goalInstanceId = instance.templateToInstanceMap["goal-1"];
    expect(instance.nodeMap[goalInstanceId]).toBeTruthy();
  });
});
