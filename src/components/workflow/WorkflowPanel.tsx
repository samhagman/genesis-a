import type { WorkflowTemplate } from "@/types/workflow";
import { GoalCard } from "./GoalCard";
import { ProgressConnector } from "./ProgressConnector";

export interface WorkflowPanelProps {
  workflow: WorkflowTemplate | null;
  workflowLoading: boolean;
  workflowError: string | null;
  selectedItemId: string | null;
  selectedItemType: "goal" | "subtask" | null;
  onItemSelect: (type: "goal" | "subtask", id: string) => void;
}

export function WorkflowPanel({
  workflow,
  workflowLoading,
  workflowError,
  selectedItemId,
  selectedItemType,
  onItemSelect,
}: WorkflowPanelProps) {
  if (workflowLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-4xl">⏳</div>
          <p className="text-neutral-500 dark:text-neutral-400">
            Loading workflow...
          </p>
        </div>
      </div>
    );
  }

  if (workflowError) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">
            Error Loading Workflow
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            {workflowError}
          </p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-4xl">📋</div>
          <p className="text-neutral-500 dark:text-neutral-400">
            No workflow found
          </p>
        </div>
      </div>
    );
  }

  const handleGoalSelect = (goalId: string) => {
    onItemSelect("goal", goalId);
  };

  const handleSubtaskSelect = (subtaskId: string) => {
    onItemSelect("subtask", subtaskId);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Workflow Header */}
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {workflow.name}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-300">
            {workflow.description}
          </p>
        </div>

        {/* Goals */}
        {workflow.goals.map((goal, index) => (
          <div key={goal.goalId}>
            <GoalCard
              goal={goal}
              isSelected={
                selectedItemType === "goal" && selectedItemId === goal.goalId
              }
              selectedSubtaskId={
                selectedItemType === "subtask" ? selectedItemId : null
              }
              onGoalSelect={handleGoalSelect}
              onSubtaskSelect={handleSubtaskSelect}
            />

            {/* Progress connector between goals */}
            {index < workflow.goals.length - 1 && (
              <ProgressConnector
                fromStatus={goal.status}
                toStatus={workflow.goals[index + 1].status}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
