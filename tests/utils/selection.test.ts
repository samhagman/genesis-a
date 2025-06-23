import { describe, it, expect } from "vitest";
import { findSelectedItem, getItemBreadcrumb } from "@/utils/selection";
import type { WorkflowTemplate } from "@/types/workflow";

describe("Selection Utils", () => {
  const mockWorkflow: WorkflowTemplate = {
    templateId: "employee-onboarding",
    name: "Employee Onboarding",
    description: "Standard onboarding process for new employees",
    version: "1.0",
    goals: [
      {
        goalId: "goal-1",
        name: "Setup Development Environment",
        description: "Install necessary tools",
        icon: "🛠️",
        owner: "Tech Lead",
        estimatedDuration: "2 hours",
        subtasks: [
          {
            subtaskId: "subtask-1",
            name: "Install IDE",
            description: "Install development IDE",
            estimatedDuration: "30 minutes",
            required: true,
          },
          {
            subtaskId: "subtask-2",
            name: "Configure Git",
            description: "Setup Git configuration",
            estimatedDuration: "20 minutes",
            required: false,
          },
        ],
      },
      {
        goalId: "goal-2",
        name: "Account Setup",
        description: "Create necessary accounts",
        icon: "👤",
        owner: "IT Admin",
        estimatedDuration: "1 hour",
        subtasks: [
          {
            subtaskId: "subtask-3",
            name: "Create Email Account",
            description: "Setup company email",
            estimatedDuration: "15 minutes",
            required: true,
          },
        ],
      },
    ],
  };

  describe("findSelectedItem", () => {
    it("finds goal by id", () => {
      const result = findSelectedItem(mockWorkflow, "goal-1", "goal");

      expect(result).toEqual({
        type: "goal",
        id: "goal-1",
        data: mockWorkflow.goals[0],
      });
    });

    it("finds subtask by id", () => {
      const result = findSelectedItem(mockWorkflow, "subtask-2", "subtask");

      expect(result).toEqual({
        type: "subtask",
        id: "subtask-2",
        data: mockWorkflow.goals[0].subtasks[1],
      });
    });

    it("finds subtask in different goal", () => {
      const result = findSelectedItem(mockWorkflow, "subtask-3", "subtask");

      expect(result).toEqual({
        type: "subtask",
        id: "subtask-3",
        data: mockWorkflow.goals[1].subtasks[0],
      });
    });

    it("returns null for non-existent goal", () => {
      const result = findSelectedItem(
        mockWorkflow,
        "non-existent-goal",
        "goal"
      );
      expect(result).toBeNull();
    });

    it("returns null for non-existent subtask", () => {
      const result = findSelectedItem(
        mockWorkflow,
        "non-existent-subtask",
        "subtask"
      );
      expect(result).toBeNull();
    });

    it("returns null for wrong type search", () => {
      const result = findSelectedItem(mockWorkflow, "goal-1", "subtask");
      expect(result).toBeNull();
    });
  });

  describe("getItemBreadcrumb", () => {
    it("returns goal name for goal type", () => {
      const result = getItemBreadcrumb(mockWorkflow, "goal-1", "goal");
      expect(result).toEqual(["Setup Development Environment"]);
    });

    it("returns goal and subtask names for subtask type", () => {
      const result = getItemBreadcrumb(mockWorkflow, "subtask-2", "subtask");
      expect(result).toEqual([
        "Setup Development Environment",
        "Configure Git",
      ]);
    });

    it("returns subtask from different goal", () => {
      const result = getItemBreadcrumb(mockWorkflow, "subtask-3", "subtask");
      expect(result).toEqual(["Account Setup", "Create Email Account"]);
    });

    it("returns empty array for non-existent goal", () => {
      const result = getItemBreadcrumb(
        mockWorkflow,
        "non-existent-goal",
        "goal"
      );
      expect(result).toEqual([]);
    });

    it("returns empty array for non-existent subtask", () => {
      const result = getItemBreadcrumb(
        mockWorkflow,
        "non-existent-subtask",
        "subtask"
      );
      expect(result).toEqual([]);
    });

    it("handles empty workflow", () => {
      const emptyWorkflow: WorkflowTemplate = {
        templateId: "empty",
        name: "Empty",
        description: "Empty workflow",
        version: "1.0",
        goals: [],
      };

      const goalResult = getItemBreadcrumb(emptyWorkflow, "any-goal", "goal");
      const subtaskResult = getItemBreadcrumb(
        emptyWorkflow,
        "any-subtask",
        "subtask"
      );

      expect(goalResult).toEqual([]);
      expect(subtaskResult).toEqual([]);
    });
  });
});
