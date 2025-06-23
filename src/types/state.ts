import type { WorkflowTemplate } from "./workflow";

export interface AppState {
  workflow: WorkflowTemplate | null;
  selectedItemId: string | null;
  selectedItemType: "goal" | "subtask" | null;
}

export interface SelectionHandlers {
  selectGoal: (goalId: string) => void;
  selectSubtask: (subtaskId: string) => void;
  clearSelection: () => void;
}
