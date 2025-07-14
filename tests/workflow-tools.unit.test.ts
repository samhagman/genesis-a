/**
 * Workflow Tools Unit Tests
 *
 * Unit testing for workflow editing tools in isolation following official patterns
 * Tests the pure functional logic of workflow modification tools
 */

import { describe, expect, it } from "vitest";
import { workflowEditingTools } from "../src/agents/workflowEditingTools";
import type { WorkflowTemplateV2 } from "../src/types/workflow-v2";

describe("Workflow Editing Tools (Unit Tests)", () => {
  const mockWorkflow: WorkflowTemplateV2 = {
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

  describe("addGoal", () => {
    it("should add a new goal to the workflow", () => {
      const goalData = {
        id: "goal-2",
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
      expect(result.goals[1].id).toBe("goal-2");
    });

    it("should maintain workflow immutability", () => {
      const goalData = {
        id: "goal-immutable",
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

    it("should auto-assign order if not provided", () => {
      const goalDataWithoutOrder = {
        id: "goal-auto-order",
        name: "Auto Order Goal",
        description: "Goal without explicit order",
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      };

      const result = workflowEditingTools.addGoal(
        mockWorkflow,
        goalDataWithoutOrder
      );

      expect(result.goals[1].order).toBe(2); // Should be next in sequence
    });
  });

  describe("addTask", () => {
    it("should add a task to the specified goal", () => {
      const taskData = {
        id: "task-1",
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
      expect(result.goals[0].tasks[0].id).toBe("task-1");
    });

    it("should add a human task with role", () => {
      const taskData = {
        id: "task-human",
        description: "Human task",
        assignee: { type: "human" as const, role: "Manager" },
      };

      const result = workflowEditingTools.addTask(
        mockWorkflow,
        "goal-1",
        taskData
      );

      expect(result.goals[0].tasks).toHaveLength(1);
      expect(result.goals[0].tasks[0].assignee.type).toBe("human");
      expect(result.goals[0].tasks[0].assignee.role).toBe("Manager");
    });

    it("should throw error for non-existent goal", () => {
      const taskData = {
        id: "task-error",
        description: "Test task",
        assignee: { type: "human" as const, role: "Manager" },
      };

      expect(() => {
        workflowEditingTools.addTask(
          mockWorkflow,
          "non-existent-goal",
          taskData
        );
      }).toThrow('Goal with id "non-existent-goal" not found');
    });

    it("should handle task dependencies", () => {
      const taskData = {
        id: "task-dependent",
        description: "Dependent task",
        assignee: { type: "ai_agent" as const, model: "gpt-4" },
        depends_on: ["task-1"],
      };

      const result = workflowEditingTools.addTask(
        mockWorkflow,
        "goal-1",
        taskData
      );

      expect(result.goals[0].tasks[0].depends_on).toEqual(["task-1"]);
    });
  });

  describe("addConstraint", () => {
    it("should add a constraint to the specified goal", () => {
      const constraintData = {
        id: "constraint-1",
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
      expect(result.goals[0].constraints[0].id).toBe("constraint-1");
    });

    it("should add a business rule constraint", () => {
      const constraintData = {
        id: "constraint-business",
        description: "Business rule constraint",
        type: "business_rule" as const,
        enforcement: "require_approval" as const,
      };

      const result = workflowEditingTools.addConstraint(
        mockWorkflow,
        "goal-1",
        constraintData
      );

      expect(result.goals[0].constraints[0].type).toBe("business_rule");
      expect(result.goals[0].constraints[0].enforcement).toBe(
        "require_approval"
      );
    });

    it("should throw error for non-existent goal", () => {
      const constraintData = {
        id: "constraint-error",
        description: "Error constraint",
        type: "time_limit" as const,
        enforcement: "warn" as const,
      };

      expect(() => {
        workflowEditingTools.addConstraint(
          mockWorkflow,
          "non-existent-goal",
          constraintData
        );
      }).toThrow('Goal with id "non-existent-goal" not found');
    });
  });

  describe("deleteGoal", () => {
    it("should remove the specified goal from workflow", () => {
      // Add a second goal first
      const workflowWithTwoGoals = workflowEditingTools.addGoal(mockWorkflow, {
        id: "goal-to-delete",
        name: "Goal to Delete",
        description: "This goal will be deleted",
        order: 2,
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      });

      const result = workflowEditingTools.deleteGoal(
        workflowWithTwoGoals,
        "goal-to-delete"
      );

      expect(result.goals).toHaveLength(1);
      expect(result.goals[0].id).toBe("goal-1");
      expect(
        result.goals.find((g) => g.id === "goal-to-delete")
      ).toBeUndefined();
    });

    it("should throw error for non-existent goal", () => {
      expect(() => {
        workflowEditingTools.deleteGoal(mockWorkflow, "non-existent-goal");
      }).toThrow('Goal with id "non-existent-goal" not found');
    });

    it("should maintain workflow immutability during deletion", () => {
      const workflowWithTwoGoals = workflowEditingTools.addGoal(mockWorkflow, {
        id: "goal-to-delete-immutable",
        name: "Goal to Delete",
        description: "This goal will be deleted",
        order: 2,
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      });

      const result = workflowEditingTools.deleteGoal(
        workflowWithTwoGoals,
        "goal-to-delete-immutable"
      );

      // Original workflow should be unchanged
      expect(workflowWithTwoGoals.goals).toHaveLength(2);
      expect(result.goals).toHaveLength(1);
      expect(result).not.toBe(workflowWithTwoGoals);
    });
  });

  describe("deleteTask", () => {
    it("should remove the specified task from workflow", () => {
      // Add a task first
      const workflowWithTask = workflowEditingTools.addTask(
        mockWorkflow,
        "goal-1",
        {
          id: "task-to-delete",
          description: "Task to delete",
          assignee: { type: "human" as const, role: "Manager" },
        }
      );

      const result = workflowEditingTools.deleteTask(
        workflowWithTask,
        "task-to-delete"
      );

      expect(result.goals[0].tasks).toHaveLength(0);
    });

    it("should throw error for non-existent task", () => {
      expect(() => {
        workflowEditingTools.deleteTask(mockWorkflow, "non-existent-task");
      }).toThrow('task with id "non-existent-task" not found in any goal');
    });
  });

  describe("deleteConstraint", () => {
    it("should remove the specified constraint from workflow", () => {
      // Add a constraint first
      const workflowWithConstraint = workflowEditingTools.addConstraint(
        mockWorkflow,
        "goal-1",
        {
          id: "constraint-to-delete",
          description: "Constraint to delete",
          type: "time_limit" as const,
          enforcement: "hard_stop" as const,
          value: 120,
        }
      );

      const result = workflowEditingTools.deleteConstraint(
        workflowWithConstraint,
        "constraint-to-delete"
      );

      expect(result.goals[0].constraints).toHaveLength(0);
    });

    it("should throw error for non-existent constraint", () => {
      expect(() => {
        workflowEditingTools.deleteConstraint(mockWorkflow, "non-existent-constraint");
      }).toThrow('constraint with id "non-existent-constraint" not found in any goal');
    });

    it("should remove constraint from correct goal when multiple goals exist", () => {
      // Add a second goal
      let workflowWithTwoGoals = workflowEditingTools.addGoal(mockWorkflow, {
        id: "goal-2",
        name: "Second Goal",
        description: "Second goal",
        order: 2,
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      });

      // Add constraint to first goal
      workflowWithTwoGoals = workflowEditingTools.addConstraint(
        workflowWithTwoGoals,
        "goal-1",
        {
          id: "constraint-goal-1",
          description: "First goal constraint",
          type: "time_limit" as const,
          enforcement: "warn" as const,
        }
      );

      // Add constraint to second goal
      workflowWithTwoGoals = workflowEditingTools.addConstraint(
        workflowWithTwoGoals,
        "goal-2",
        {
          id: "constraint-goal-2",
          description: "Second goal constraint",
          type: "business_rule" as const,
          enforcement: "hard_stop" as const,
        }
      );

      // Delete constraint from second goal
      const result = workflowEditingTools.deleteConstraint(
        workflowWithTwoGoals,
        "constraint-goal-2"
      );

      // First goal constraint should remain
      expect(result.goals[0].constraints).toHaveLength(1);
      expect(result.goals[0].constraints[0].id).toBe("constraint-goal-1");
      
      // Second goal constraint should be deleted
      expect(result.goals[1].constraints).toHaveLength(0);
    });
  });

  describe("updateGoal", () => {
    it("should update goal properties", () => {
      const updates = {
        name: "Updated Goal Name",
        description: "Updated description",
      };

      const result = workflowEditingTools.updateGoal(
        mockWorkflow,
        "goal-1",
        updates
      );

      expect(result.goals[0].name).toBe("Updated Goal Name");
      expect(result.goals[0].description).toBe("Updated description");
      expect(result.goals[0].id).toBe("goal-1"); // ID should remain unchanged
    });

    it("should throw error for non-existent goal", () => {
      expect(() => {
        workflowEditingTools.updateGoal(mockWorkflow, "non-existent-goal", {
          name: "New Name",
        });
      }).toThrow('Goal with id "non-existent-goal" not found');
    });
  });

  describe("reorderGoals", () => {
    it("should reorder goals according to provided order", () => {
      // Add a second goal
      const workflowWithTwoGoals = workflowEditingTools.addGoal(mockWorkflow, {
        id: "goal-2",
        name: "Second Goal",
        description: "Second goal for reordering",
        order: 2,
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      });

      const result = workflowEditingTools.reorderGoals(workflowWithTwoGoals, [
        "goal-2",
        "goal-1",
      ]);

      expect(result.goals[0].id).toBe("goal-2");
      expect(result.goals[1].id).toBe("goal-1");
      expect(result.goals[0].order).toBe(1);
      expect(result.goals[1].order).toBe(2);
    });

    it("should throw error for incomplete goal order", () => {
      const workflowWithTwoGoals = workflowEditingTools.addGoal(mockWorkflow, {
        id: "goal-2",
        name: "Second Goal",
        description: "Second goal",
        order: 2,
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      });

      expect(() => {
        workflowEditingTools.reorderGoals(workflowWithTwoGoals, ["goal-1"]); // Missing goal-2
      }).toThrow("Goal order must include all existing goal IDs exactly once");
    });
  });
});
