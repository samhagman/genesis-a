/**
 * Comprehensive tests for WorkflowEditingTools
 * Validates that all semantic editing functions work correctly with V2 schema
 */

import { describe, it, expect, beforeEach } from "vitest";
import { workflowEditingTools } from "../../src/agents/workflowEditingTools";
import type {
  WorkflowTemplateV2,
  Goal,
  Task,
  Constraint,
  Policy,
  Form,
} from "../../src/types/workflow-v2";

describe("WorkflowEditingTools", () => {
  let testWorkflow: WorkflowTemplateV2;

  beforeEach(() => {
    // Create a minimal valid V2 workflow for testing
    testWorkflow = {
      id: "test-workflow",
      name: "Test Workflow",
      version: "2.0",
      objective: "Test workflow for validation",
      metadata: {
        author: "test-author",
        created_at: "2025-01-01T00:00:00Z",
        last_modified: "2025-01-01T00:00:00Z",
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

  describe("Goal Operations", () => {
    it("should add a new goal successfully", () => {
      const newGoal: Omit<Goal, "order"> = {
        id: "goal2",
        name: "Second Goal",
        description: "Another test goal",
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      };

      const result = workflowEditingTools.addGoal(testWorkflow, newGoal);

      expect(result.goals).toHaveLength(2);
      expect(result.goals[1].id).toBe("goal2");
      expect(result.goals[1].order).toBe(2);
      expect(result.metadata.last_modified).not.toBe(
        testWorkflow.metadata.last_modified
      );
    });

    it("should update a goal successfully", () => {
      const updates = {
        name: "Updated Goal Name",
        description: "Updated description",
      };

      const result = workflowEditingTools.updateGoal(
        testWorkflow,
        "goal1",
        updates
      );

      expect(result.goals[0].name).toBe("Updated Goal Name");
      expect(result.goals[0].description).toBe("Updated description");
      expect(result.goals[0].id).toBe("goal1"); // ID should not change
    });

    it("should delete a goal successfully", () => {
      // Add second goal first
      const withTwoGoals = workflowEditingTools.addGoal(testWorkflow, {
        id: "goal2",
        name: "Second Goal",
        description: "To be deleted",
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      });

      const result = workflowEditingTools.deleteGoal(withTwoGoals, "goal1");

      expect(result.goals).toHaveLength(1);
      expect(result.goals[0].id).toBe("goal2");
      expect(result.goals[0].order).toBe(1); // Should be reordered
    });

    it("should reorder goals successfully", () => {
      // Add second goal first
      const withTwoGoals = workflowEditingTools.addGoal(testWorkflow, {
        id: "goal2",
        name: "Second Goal",
        description: "Second goal",
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      });

      const result = workflowEditingTools.reorderGoals(withTwoGoals, [
        "goal2",
        "goal1",
      ]);

      expect(result.goals[0].id).toBe("goal2");
      expect(result.goals[0].order).toBe(1);
      expect(result.goals[1].id).toBe("goal1");
      expect(result.goals[1].order).toBe(2);
    });

    it("should throw error when updating non-existent goal", () => {
      expect(() => {
        workflowEditingTools.updateGoal(testWorkflow, "non-existent", {
          name: "Test",
        });
      }).toThrow('Goal with id "non-existent" not found');
    });
  });

  describe("Task Operations", () => {
    const testTask: Task = {
      id: "task1",
      description: "Test task",
      assignee: {
        type: "ai_agent",
        model: "test-model",
      },
    };

    it("should add a task to a goal successfully", () => {
      const result = workflowEditingTools.addTask(
        testWorkflow,
        "goal1",
        testTask
      );

      expect(result.goals[0].tasks).toHaveLength(1);
      expect(result.goals[0].tasks[0].id).toBe("task1");
      expect(result.goals[0].tasks[0].description).toBe("Test task");
    });

    it("should update a task successfully", () => {
      // First add a task
      const withTask = workflowEditingTools.addTask(
        testWorkflow,
        "goal1",
        testTask
      );

      // Then update it
      const result = workflowEditingTools.updateTask(withTask, "task1", {
        description: "Updated task description",
      });

      expect(result.goals[0].tasks[0].description).toBe(
        "Updated task description"
      );
      expect(result.goals[0].tasks[0].assignee.type).toBe("ai_agent"); // Should preserve other fields
    });

    it("should delete a task and clean up dependencies", () => {
      // Add two tasks with dependency
      const task1 = { ...testTask, id: "task1" };
      const task2: Task = {
        id: "task2",
        description: "Dependent task",
        assignee: { type: "human", role: "tester" },
        depends_on: ["task1"],
      };

      let result = workflowEditingTools.addTask(testWorkflow, "goal1", task1);
      result = workflowEditingTools.addTask(result, "goal1", task2);

      // Delete task1
      result = workflowEditingTools.deleteTask(result, "task1");

      expect(result.goals[0].tasks).toHaveLength(1);
      expect(result.goals[0].tasks[0].id).toBe("task2");
      expect(result.goals[0].tasks[0].depends_on).toEqual([]); // Dependency should be removed
    });

    it("should throw error when task validation fails", () => {
      const invalidTask = {
        id: "invalid-task",
        description: "Invalid task",
        // Missing required assignee field
      } as Task;

      expect(() => {
        workflowEditingTools.addTask(testWorkflow, "goal1", invalidTask);
      }).toThrow("Task validation failed");
    });
  });

  describe("Constraint Operations", () => {
    const testConstraint: Constraint = {
      id: "const1",
      description: "Test constraint",
      type: "time_limit",
      enforcement: "hard_stop",
      value: 60,
    };

    it("should add a constraint to a goal successfully", () => {
      const result = workflowEditingTools.addConstraint(
        testWorkflow,
        "goal1",
        testConstraint
      );

      expect(result.goals[0].constraints).toHaveLength(1);
      expect(result.goals[0].constraints[0].id).toBe("const1");
      expect(result.goals[0].constraints[0].type).toBe("time_limit");
    });

    it("should update a constraint successfully", () => {
      // First add a constraint
      const withConstraint = workflowEditingTools.addConstraint(
        testWorkflow,
        "goal1",
        testConstraint
      );

      // Then update it
      const result = workflowEditingTools.updateConstraint(
        withConstraint,
        "const1",
        {
          enforcement: "warn",
          value: 120,
        }
      );

      expect(result.goals[0].constraints[0].enforcement).toBe("warn");
      expect(result.goals[0].constraints[0].value).toBe(120);
    });

    it("should delete a constraint successfully", () => {
      // First add a constraint
      const withConstraint = workflowEditingTools.addConstraint(
        testWorkflow,
        "goal1",
        testConstraint
      );

      // Then delete it
      const result = workflowEditingTools.deleteConstraint(
        withConstraint,
        "const1"
      );

      expect(result.goals[0].constraints).toHaveLength(0);
    });
  });

  describe("Policy Operations", () => {
    const testPolicy: Policy = {
      id: "pol1",
      name: "Test Policy",
      if: {
        field: "test_field",
        operator: ">",
        value: 10,
      },
      then: {
        action: "test_action",
        params: { key: "value" },
      },
    };

    it("should add a policy to a goal successfully", () => {
      const result = workflowEditingTools.addPolicy(
        testWorkflow,
        "goal1",
        testPolicy
      );

      expect(result.goals[0].policies).toHaveLength(1);
      expect(result.goals[0].policies[0].id).toBe("pol1");
      expect(result.goals[0].policies[0].name).toBe("Test Policy");
    });

    it("should update a policy successfully", () => {
      // First add a policy
      const withPolicy = workflowEditingTools.addPolicy(
        testWorkflow,
        "goal1",
        testPolicy
      );

      // Then update it
      const result = workflowEditingTools.updatePolicy(withPolicy, "pol1", {
        name: "Updated Policy Name",
      });

      expect(result.goals[0].policies[0].name).toBe("Updated Policy Name");
    });

    it("should delete a policy successfully", () => {
      // First add a policy
      const withPolicy = workflowEditingTools.addPolicy(
        testWorkflow,
        "goal1",
        testPolicy
      );

      // Then delete it
      const result = workflowEditingTools.deletePolicy(withPolicy, "pol1");

      expect(result.goals[0].policies).toHaveLength(0);
    });
  });

  describe("Form Operations", () => {
    const testForm: Form = {
      id: "form1",
      name: "Test Form",
      type: "structured",
      fields: [
        {
          name: "test_field",
          type: "string",
          required: true,
        },
      ],
    };

    it("should add a form to a goal successfully", () => {
      const result = workflowEditingTools.addForm(
        testWorkflow,
        "goal1",
        testForm
      );

      expect(result.goals[0].forms).toHaveLength(1);
      expect(result.goals[0].forms[0].id).toBe("form1");
      expect(result.goals[0].forms[0].name).toBe("Test Form");
    });

    it("should update a form successfully", () => {
      // First add a form
      const withForm = workflowEditingTools.addForm(
        testWorkflow,
        "goal1",
        testForm
      );

      // Then update it
      const result = workflowEditingTools.updateForm(withForm, "form1", {
        name: "Updated Form Name",
        description: "Updated description",
      });

      expect(result.goals[0].forms[0].name).toBe("Updated Form Name");
      expect(result.goals[0].forms[0].description).toBe("Updated description");
    });

    it("should delete a form successfully", () => {
      // First add a form
      const withForm = workflowEditingTools.addForm(
        testWorkflow,
        "goal1",
        testForm
      );

      // Then delete it
      const result = workflowEditingTools.deleteForm(withForm, "form1");

      expect(result.goals[0].forms).toHaveLength(0);
    });
  });

  describe("Bulk Operations", () => {
    it("should duplicate a goal with new IDs", () => {
      // Add some elements to the goal first
      let enrichedWorkflow = workflowEditingTools.addTask(
        testWorkflow,
        "goal1",
        {
          id: "task1",
          description: "Original task",
          assignee: { type: "ai_agent", model: "test" },
        }
      );

      const result = workflowEditingTools.duplicateGoal(
        enrichedWorkflow,
        "goal1",
        "Duplicated Goal"
      );

      expect(result.goals).toHaveLength(2);
      expect(result.goals[1].name).toBe("Duplicated Goal");
      expect(result.goals[1].id).not.toBe("goal1"); // Should have new ID
      expect(result.goals[1].tasks[0].id).not.toBe("task1"); // Task should have new ID
      expect(result.goals[1].tasks[0].depends_on).toEqual([]); // Dependencies should be cleared
    });

    it("should move element between goals", () => {
      // Add second goal and a task to first goal
      let result = workflowEditingTools.addGoal(testWorkflow, {
        id: "goal2",
        name: "Second Goal",
        description: "Second goal",
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      });

      result = workflowEditingTools.addTask(result, "goal1", {
        id: "task1",
        description: "Movable task",
        assignee: { type: "ai_agent", model: "test" },
      });

      // Move task from goal1 to goal2
      result = workflowEditingTools.moveElementBetweenGoals(
        result,
        "task",
        "task1",
        "goal1",
        "goal2"
      );

      expect(result.goals[0].tasks).toHaveLength(0); // goal1 should have no tasks
      expect(result.goals[1].tasks).toHaveLength(1); // goal2 should have the task
      expect(result.goals[1].tasks[0].id).toBe("task1");
    });
  });

  describe("Metadata Operations", () => {
    it("should update workflow metadata", () => {
      const updates = {
        author: "new-author",
        tags: ["updated", "test"],
      };

      const result = workflowEditingTools.updateWorkflowMetadata(
        testWorkflow,
        updates
      );

      expect(result.metadata.author).toBe("new-author");
      expect(result.metadata.tags).toEqual(["updated", "test"]);
      expect(result.metadata.last_modified).not.toBe(
        testWorkflow.metadata.last_modified
      );
    });

    it("should update global settings", () => {
      const settings = {
        max_execution_time_hours: 48,
        data_retention_days: 30,
      };

      const result = workflowEditingTools.updateGlobalSettings(
        testWorkflow,
        settings
      );

      expect(result.global_settings?.max_execution_time_hours).toBe(48);
      expect(result.global_settings?.data_retention_days).toBe(30);
    });
  });

  describe("Error Handling", () => {
    it("should maintain workflow immutability", () => {
      const originalWorkflow = JSON.parse(JSON.stringify(testWorkflow));

      workflowEditingTools.addGoal(testWorkflow, {
        id: "new-goal",
        name: "New Goal",
        description: "Should not affect original",
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      });

      // Original workflow should be unchanged
      expect(testWorkflow).toEqual(originalWorkflow);
    });

    it("should throw error for invalid workflow after modification", () => {
      // This test ensures validation catches invalid modifications
      const invalidUpdate = {
        goals: "not-an-array", // This should cause validation to fail
      };

      expect(() => {
        // Direct assignment to test validation
        const newWorkflow = { ...testWorkflow, ...invalidUpdate };
        workflowEditingTools.updateWorkflowMetadata(newWorkflow as any, {
          author: "test",
        });
      }).toThrow();
    });
  });
});
