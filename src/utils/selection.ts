import type { WorkflowTemplate } from "@/types/workflow";
import type { SelectedItem } from "@/types/components";

export function findSelectedItem(
  workflow: WorkflowTemplate,
  itemId: string,
  type: "goal" | "subtask"
): SelectedItem | null {
  if (type === "goal") {
    const goal = workflow.goals.find((g) => g.goalId === itemId);
    if (goal) {
      return {
        type: "goal",
        id: itemId,
        data: goal,
      };
    }
  } else if (type === "subtask") {
    for (const goal of workflow.goals) {
      const subtask = goal.subtasks.find((s) => s.subtaskId === itemId);
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
    const goal = workflow.goals.find((g) => g.goalId === itemId);
    return goal ? [goal.name] : [];
  }

  if (type === "subtask") {
    for (const goal of workflow.goals) {
      const subtask = goal.subtasks.find((s) => s.subtaskId === itemId);
      if (subtask) {
        return [goal.name, subtask.name];
      }
    }
  }

  return [];
}
