import type { Subtask, Goal, WorkflowTemplate } from "@/types/workflow";
import { getStatusConfig } from "@/utils/status";

export interface SubtaskInspectorProps {
  subtask: Subtask;
  parentGoal: Goal;
  workflow: WorkflowTemplate;
}

export function SubtaskInspector({
  subtask,
  parentGoal,
  workflow,
}: SubtaskInspectorProps) {
  const subtaskStatusConfig = getStatusConfig(subtask.status);
  const parentGoalStatusConfig = getStatusConfig(parentGoal.status);
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{parentGoal.icon}</span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {parentGoal.name}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {subtask.name}
          </h2>
          <div className="flex items-center gap-2">
            <span
              className="text-lg"
              aria-label={`Status: ${subtaskStatusConfig.label}`}
            >
              {subtaskStatusConfig.icon}
            </span>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${subtaskStatusConfig.bgColor} ${subtaskStatusConfig.textColor}`}
            >
              {subtaskStatusConfig.label}
            </span>
          </div>
        </div>
        <p className="text-neutral-600 dark:text-neutral-300">
          {subtask.description}
        </p>
      </div>

      {/* Subtask Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Status
        </h3>

        <div
          className={`rounded-lg p-4 ${subtaskStatusConfig.bgColor} ${subtaskStatusConfig.borderColor} border`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-lg"
              aria-label={`Status: ${subtaskStatusConfig.label}`}
            >
              {subtaskStatusConfig.icon}
            </span>
            <span className={`font-medium ${subtaskStatusConfig.textColor}`}>
              {subtaskStatusConfig.label}
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {subtask.status === "COMPLETED" &&
              "This subtask has been completed successfully."}
            {subtask.status === "IN_PROGRESS" &&
              "This subtask is currently being worked on."}
            {subtask.status === "PENDING" &&
              "This subtask is waiting to be started."}
          </p>
        </div>
      </div>

      {/* Subtask Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Details
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Estimated Duration
            </div>
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
              {subtask.estimatedDuration}
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Priority
            </div>
            <div className="flex items-center gap-2">
              {subtask.required ? (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Required
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-medium text-green-600 dark:text-green-400">
                    Optional
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Parent Goal Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Parent Goal
        </h3>

        <div
          className={`border rounded-lg p-4 ${parentGoalStatusConfig.borderColor} ${parentGoalStatusConfig.bgColor}`}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <span className="text-xl">{parentGoal.icon}</span>
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                {parentGoal.name}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-sm"
                aria-label={`Status: ${parentGoalStatusConfig.label}`}
              >
                {parentGoalStatusConfig.icon}
              </span>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${parentGoalStatusConfig.bgColor} ${parentGoalStatusConfig.textColor}`}
              >
                {parentGoalStatusConfig.label}
              </span>
            </div>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
            {parentGoal.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <span>Owner: {parentGoal.owner}</span>
            <span>Duration: {parentGoal.estimatedDuration}</span>
            <span>{parentGoal.subtasks.length} subtasks</span>
          </div>
        </div>
      </div>

      {/* Workflow Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Workflow Context
        </h3>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            {workflow.name}
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            {workflow.description}
          </p>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            Version {workflow.version} • {workflow.goals.length} goals
          </div>
        </div>
      </div>
    </div>
  );
}
