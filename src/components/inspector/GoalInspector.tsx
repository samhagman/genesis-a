import type { Goal } from "@/types/workflow";
import { getStatusConfig } from "@/utils/status";

export interface GoalInspectorProps {
  goal: Goal;
}

export function GoalInspector({ goal }: GoalInspectorProps) {
  const totalSubtasks = goal.subtasks.length;
  const requiredSubtasks = goal.subtasks.filter(
    (subtask) => subtask.required
  ).length;

  // Calculate status-based metrics
  const completedSubtasks = goal.subtasks.filter(
    (subtask) => subtask.status === "COMPLETED"
  ).length;
  const inProgressSubtasks = goal.subtasks.filter(
    (subtask) => subtask.status === "IN_PROGRESS"
  ).length;
  const pendingSubtasks = goal.subtasks.filter(
    (subtask) => subtask.status === "PENDING"
  ).length;

  const goalStatusConfig = getStatusConfig(goal.status);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{goal.icon}</span>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {goal.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xl"
              aria-label={`Status: ${goalStatusConfig.label}`}
            >
              {goalStatusConfig.icon}
            </span>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${goalStatusConfig.bgColor} ${goalStatusConfig.textColor}`}
            >
              {goalStatusConfig.label}
            </span>
          </div>
        </div>
        <p className="text-neutral-600 dark:text-neutral-300">
          {goal.description}
        </p>
      </div>

      {/* Goal Metadata */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Goal Details
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Owner
            </div>
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
              {goal.owner}
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Estimated Duration
            </div>
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
              {goal.estimatedDuration}
            </div>
          </div>
        </div>
      </div>

      {/* Subtask Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Subtask Summary
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedSubtasks}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              Completed
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {inProgressSubtasks}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              In Progress
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
              {pendingSubtasks}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Pending
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {requiredSubtasks}
            </div>
            <div className="text-sm text-amber-600 dark:text-amber-400">
              Required
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">
              Progress
            </span>
            <span className="text-neutral-600 dark:text-neutral-400">
              {completedSubtasks} of {totalSubtasks} completed
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Subtask List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Subtasks
        </h3>

        <div className="space-y-3">
          {goal.subtasks.map((subtask) => {
            const subtaskStatusConfig = getStatusConfig(subtask.status);

            return (
              <div
                key={subtask.subtaskId}
                className={`border rounded-lg p-4 ${subtaskStatusConfig.borderColor} ${subtaskStatusConfig.bgColor}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm"
                      aria-label={`Status: ${subtaskStatusConfig.label}`}
                    >
                      {subtaskStatusConfig.icon}
                    </span>
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                      {subtask.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${subtaskStatusConfig.bgColor} ${subtaskStatusConfig.textColor}`}
                    >
                      {subtaskStatusConfig.label}
                    </span>
                    {subtask.required && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
                        Required
                      </span>
                    )}
                    <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-full">
                      {subtask.estimatedDuration}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {subtask.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
