import type { WorkflowTemplate, Goal, Subtask } from "@/types/workflow";
import { findSelectedItem } from "@/utils/selection";
import { GoalInspector } from "./GoalInspector";
import { SubtaskInspector } from "./SubtaskInspector";
import { WorkflowInspector } from "./WorkflowInspector";

export interface InspectorPanelProps {
  workflow: WorkflowTemplate | null;
  selectedItemId: string | null;
  selectedItemType: "goal" | "subtask" | null;
}

export function InspectorPanel({
  workflow,
  selectedItemId,
  selectedItemType,
}: InspectorPanelProps) {
  // Show loading state if workflow is not loaded
  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl">⏳</div>
          <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
            Loading...
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Loading workflow data
          </p>
        </div>
      </div>
    );
  }

  // Show specific inspector based on selection
  if (selectedItemId && selectedItemType) {
    const selectedItem = findSelectedItem(
      workflow,
      selectedItemId,
      selectedItemType
    );

    if (selectedItem) {
      if (selectedItem.type === "goal") {
        return <GoalInspector goal={selectedItem.data as Goal} />;
      }
      if (selectedItem.type === "subtask") {
        // Find the parent goal for the subtask
        const parentGoal = workflow.goals.find((goal) =>
          goal.subtasks.some((subtask) => subtask.subtaskId === selectedItemId)
        );

        if (parentGoal) {
          return (
            <SubtaskInspector
              subtask={selectedItem.data as Subtask}
              parentGoal={parentGoal}
              workflow={workflow}
            />
          );
        }
      }
    }
  }

  // Show workflow overview when nothing is selected
  return <WorkflowInspector workflow={workflow} />;
}
