import type { SelectedItemV2, WorkflowTemplateV2 } from "@/types/workflow-v2";
import { GoalCardV2 } from "./GoalCardV2";
import { ProgressConnector } from "./ProgressConnector";

export interface WorkflowPanelProps {
  workflow: WorkflowTemplateV2 | null;
  workflowLoading: boolean;
  workflowError: string | null;
  selectedItemId: string | null;
  selectedItemType: "goal" | "constraint" | "policy" | "task" | "form" | null;
  onItemSelect: (
    type: "goal" | "constraint" | "policy" | "task" | "form",
    id: string,
    parentGoalId?: string
  ) => void;
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

  const handleSubitemSelect = (
    type: SelectedItemV2["type"],
    id: string,
    parentGoalId?: string
  ) => {
    onItemSelect(type, id, parentGoalId);
  };

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="workflow-panel">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Workflow Header */}
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {workflow.name}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-300">
            {workflow.objective}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
              V2 Workflow
            </span>
            <span>•</span>
            <span>{workflow.version}</span>
          </div>
        </div>

        {/* Goals */}
        {workflow.goals.map((goal, index) => {
          return (
            <div key={goal.id}>
              <GoalCardV2
                goal={goal}
                isSelected={
                  selectedItemType === "goal" && selectedItemId === goal.id
                }
                selectedSubitemId={selectedItemId}
                selectedSubitemType={
                  selectedItemType === "goal" ? null : selectedItemType
                }
                onGoalSelect={handleGoalSelect}
                onSubitemSelect={handleSubitemSelect}
              />

              {/* Progress connector between goals */}
              {index < workflow.goals.length - 1 && (
                <ProgressConnector
                  fromStatus={"PENDING"}
                  toStatus={"PENDING"}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
