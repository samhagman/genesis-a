import type { Goal, Subtask, WorkflowTemplate } from "./workflow";

export interface SelectedItem {
  type: "goal" | "subtask";
  id: string;
  data: Goal | Subtask;
}

export interface WorkflowPanelProps {
  workflow: WorkflowTemplate;
  selectedItemId: string | null;
  onItemSelect: (type: "goal" | "subtask", id: string) => void;
}

export interface InspectorPanelProps {
  selectedItem: SelectedItem | null;
  workflow: WorkflowTemplate;
}

export interface GoalCardProps {
  goal: Goal;
  isSelected: boolean;
  selectedSubtaskId: string | null;
  onGoalSelect: (goalId: string) => void;
  onSubtaskSelect: (subtaskId: string) => void;
}
