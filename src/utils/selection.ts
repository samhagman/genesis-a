import type { SelectedItem } from "@/types/components";
import type { WorkflowTemplate } from "@/types/workflow";

export function findSelectedItem(
  workflow: WorkflowTemplate,
  itemId: string,
  type: "goal" | "subtask"
): SelectedItem | null {
  if (type === "goal") {
    // Support both V2 (id) and V1 (goalId)
    const goal = workflow.goals.find(
      (g) =>
        (typeof g === "object" && "id" in g && g.id === itemId) ||
        (typeof g === "object" && "goalId" in g && g.goalId === itemId)
    );
    if (goal) {
      return {
        type: "goal",
        id: itemId,
        data: goal,
      };
    }
  } else if (type === "subtask") {
    for (const goal of workflow.goals) {
      // Support both V2 (id) and V1 (subtaskId)
      const subtask = goal.subtasks.find(
        (s) =>
          (typeof s === "object" && "id" in s && s.id === itemId) ||
          (typeof s === "object" && "subtaskId" in s && s.subtaskId === itemId)
      );
      if (subtask) {
        return {
          type: "subtask",
          id: itemId,
          data: subtask,
        };
      }
    }
  }

  return null;
}

export function getItemBreadcrumb(
  workflow: WorkflowTemplate,
  itemId: string,
  type: "goal" | "subtask"
): string[] {
  if (type === "goal") {
    const goal = workflow.goals.find(
      (g) =>
        (typeof g === "object" && "id" in g && g.id === itemId) ||
        (typeof g === "object" && "goalId" in g && g.goalId === itemId)
    );
    return goal ? [goal.name] : [];
  }

  if (type === "subtask") {
    for (const goal of workflow.goals) {
      const subtask = goal.subtasks.find(
        (s) =>
          (typeof s === "object" && "id" in s && s.id === itemId) ||
          (typeof s === "object" && "subtaskId" in s && s.subtaskId === itemId)
      );
      if (subtask) {
        return [goal.name, subtask.name];
      }
    }
  }

  return [];
}
