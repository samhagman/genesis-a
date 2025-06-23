import type { WorkflowTemplate } from "@/types/workflow";

export interface WorkflowInspectorProps {
  workflow: WorkflowTemplate;
}

export function WorkflowInspector({ workflow }: WorkflowInspectorProps) {
  const totalSubtasks = workflow.goals.reduce(
    (sum, goal) => sum + goal.subtasks.length,
    0
  );
  const requiredSubtasks = workflow.goals.reduce(
    (sum, goal) =>
      sum + goal.subtasks.filter((subtask) => subtask.required).length,
    0
  );
  const optionalSubtasks = totalSubtasks - requiredSubtasks;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          {workflow.name}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          {workflow.description}
        </p>
        <div className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          Version {workflow.version}
        </div>
      </div>

      {/* Workflow Statistics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Overview
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {workflow.goals.length}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Goals
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {totalSubtasks}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">
              Total Subtasks
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {requiredSubtasks}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              Required
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {optionalSubtasks}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              Optional
            </div>
          </div>
        </div>
      </div>

      {/* Goals Overview */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Goals Overview
        </h3>

        <div className="space-y-3">
          {workflow.goals.map((goal, index) => (
            <div
              key={goal.goalId}
              className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{goal.icon}</span>
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                      {goal.name}
                    </h4>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
                    {goal.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>Owner: {goal.owner}</span>
                    <span>Duration: {goal.estimatedDuration}</span>
                    <span>{goal.subtasks.length} subtasks</span>
                    <span>
                      {goal.subtasks.filter((s) => s.required).length} required
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Progress Summary
        </h3>

        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Overall Progress
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              0 / {workflow.goals.length} goals
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: "0%" }}
            />
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Ready to begin workflow execution
          </div>
        </div>
      </div>
    </div>
  );
}
