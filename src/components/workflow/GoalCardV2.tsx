import { useGoalInstance } from "@/state/hooks";
import type { ExecutionStatus } from "@/types/workflow-instance";
import type { GoalCardV2Props, SelectedItemV2 } from "@/types/workflow-v2";
import { useState } from "react";
import { ConstraintList } from "./ConstraintList";
import { FormList } from "./FormList";
import { PolicyList } from "./PolicyList";
import { TaskList } from "./TaskList";

export function GoalCardV2({
  goal,
  isSelected,
  selectedSubitemId,
  selectedSubitemType,
  onGoalSelect,
  onSubitemSelect,
}: GoalCardV2Props) {
  // Collapsible state for each section
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    constraints: true,
    policies: true,
    tasks: true,
    forms: true,
  });

  const handleGoalClick = () => {
    onGoalSelect(goal.id);
  };

  const handleSubitemSelect = (type: SelectedItemV2["type"], id: string) => {
    onSubitemSelect(type, id);
  };

  const toggleSection = (section: keyof typeof sectionsCollapsed) => {
    setSectionsCollapsed((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get dynamic instance state
  const goalInstance = useGoalInstance(goal.id);

  // Calculate counts for each element type
  const constraintCount = goal.constraints.length;
  const policyCount = goal.policies.length;
  const taskCount = goal.tasks.length;
  const formCount = goal.forms.length;

  // Determine goal status from instance state
  const goalStatus = goalInstance?.status || "NOT_STARTED";
  const progressPercent = goalInstance?.progressPercent || 0;
  const getGoalStatusStyling = (status: ExecutionStatus, selected: boolean) => {
    if (selected) {
      return "border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg";
    }

    switch (status) {
      case "COMPLETED":
        return "border-green-200 bg-green-50 dark:bg-green-950 hover:border-green-300";
      case "ACTIVE":
        return "border-blue-200 bg-blue-50 dark:bg-blue-950 hover:border-blue-300";
      case "BLOCKED":
        return "border-red-200 bg-red-50 dark:bg-red-950 hover:border-red-300";
      case "FAILED":
        return "border-red-200 bg-red-50 dark:bg-red-950 hover:border-red-300";
      case "CANCELLED":
        return "border-orange-200 bg-orange-50 dark:bg-orange-950 hover:border-orange-300";
      case "SKIPPED":
        return "border-yellow-200 bg-yellow-50 dark:bg-yellow-950 hover:border-yellow-300";
      default: // NOT_STARTED
        return "border-neutral-200 bg-neutral-50 dark:bg-neutral-950 hover:border-neutral-300";
    }
  };

  const getGoalStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case "COMPLETED":
        return "✅";
      case "ACTIVE":
        return "🔄";
      case "BLOCKED":
        return "🚫";
      case "FAILED":
        return "❌";
      case "CANCELLED":
        return "🚫";
      case "SKIPPED":
        return "⏭️";
      default:
        return "⏳";
    }
  };

  return (
    <div
      className={`
        relative rounded-lg border-2 transition-all duration-200 cursor-pointer
        ${getGoalStatusStyling(goalStatus, isSelected)}
      `}
      onClick={handleGoalClick}
    >
      {/* Goal Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl" title={`Goal Status: ${goalStatus}`}>
              {getGoalStatusIcon(goalStatus)}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Goal {goal.order}: {goal.name}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">
                {goal.description}
              </p>

              {/* Progress Bar */}
              {goalInstance && goalStatus !== "NOT_STARTED" && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Progress
                    </span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        goalStatus === "COMPLETED"
                          ? "bg-green-500"
                          : goalStatus === "ACTIVE"
                            ? "bg-blue-500"
                            : goalStatus === "BLOCKED" ||
                                goalStatus === "FAILED"
                              ? "bg-red-500"
                              : "bg-neutral-400"
                      }`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Goal Metadata */}
          <div className="flex flex-col items-end gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            {goal.timeout_minutes && (
              <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                ⏱️ {goal.timeout_minutes}m timeout
              </span>
            )}
            {goal.continuous && (
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                🔄 Continuous
              </span>
            )}
          </div>
        </div>

        {/* Element Count Summary */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900">
            <div className="text-lg font-semibold text-red-700 dark:text-red-300">
              {constraintCount}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 font-medium">
              Constraints
            </div>
          </div>

          <div className="text-center p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900">
            <div className="text-lg font-semibold text-green-700 dark:text-green-300">
              {policyCount}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
              Policies
            </div>
          </div>

          <div className="text-center p-3 rounded-md bg-purple-50 dark:bg-purple-950 border border-purple-100 dark:border-purple-900">
            <div className="text-lg font-semibold text-purple-700 dark:text-purple-300">
              {taskCount}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              Tasks
            </div>
          </div>

          <div className="text-center p-3 rounded-md bg-orange-50 dark:bg-orange-950 border border-orange-100 dark:border-orange-900">
            <div className="text-lg font-semibold text-orange-700 dark:text-orange-300">
              {formCount}
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              Forms
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Elements */}
      <div
        className="border-t border-neutral-200 dark:border-neutral-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Constraints Section */}
        {constraintCount > 0 && (
          <div className="border-b border-neutral-100 dark:border-neutral-800">
            <div className="p-4">
              <button
                className="flex items-center justify-between w-full text-left hover:bg-red-25 dark:hover:bg-red-975 rounded-md p-2 -m-2 transition-colors"
                onClick={() => toggleSection("constraints")}
              >
                <div className="flex items-center gap-2">
                  <span className="text-red-500" title="Constraints">
                    🚨
                  </span>
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-300">
                    Constraints ({constraintCount})
                  </h4>
                </div>
                <span
                  className="text-red-500 text-sm transform transition-transform duration-200"
                  style={{
                    transform: sectionsCollapsed.constraints
                      ? "rotate(0deg)"
                      : "rotate(90deg)",
                  }}
                >
                  ▶
                </span>
              </button>
              {!sectionsCollapsed.constraints && (
                <div className="mt-3">
                  <ConstraintList
                    constraints={goal.constraints}
                    selectedConstraintId={
                      selectedSubitemType === "constraint"
                        ? selectedSubitemId
                        : null
                    }
                    onConstraintSelect={(id) =>
                      handleSubitemSelect("constraint", id)
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Policies Section */}
        {policyCount > 0 && (
          <div className="border-b border-neutral-100 dark:border-neutral-800">
            <div className="p-4">
              <button
                className="flex items-center justify-between w-full text-left hover:bg-green-25 dark:hover:bg-green-975 rounded-md p-2 -m-2 transition-colors"
                onClick={() => toggleSection("policies")}
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-500" title="Policies">
                    ⚡
                  </span>
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-300">
                    Policies ({policyCount})
                  </h4>
                </div>
                <span
                  className="text-green-500 text-sm transform transition-transform duration-200"
                  style={{
                    transform: sectionsCollapsed.policies
                      ? "rotate(0deg)"
                      : "rotate(90deg)",
                  }}
                >
                  ▶
                </span>
              </button>
              {!sectionsCollapsed.policies && (
                <div className="mt-3">
                  <PolicyList
                    policies={goal.policies}
                    selectedPolicyId={
                      selectedSubitemType === "policy"
                        ? selectedSubitemId
                        : null
                    }
                    onPolicySelect={(id) => handleSubitemSelect("policy", id)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {taskCount > 0 && (
          <div className="border-b border-neutral-100 dark:border-neutral-800">
            <div className="p-4">
              <button
                className="flex items-center justify-between w-full text-left hover:bg-purple-25 dark:hover:bg-purple-975 rounded-md p-2 -m-2 transition-colors"
                onClick={() => toggleSection("tasks")}
              >
                <div className="flex items-center gap-2">
                  <span className="text-purple-500" title="Tasks">
                    📋
                  </span>
                  <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Tasks ({taskCount})
                  </h4>
                </div>
                <span
                  className="text-purple-500 text-sm transform transition-transform duration-200"
                  style={{
                    transform: sectionsCollapsed.tasks
                      ? "rotate(0deg)"
                      : "rotate(90deg)",
                  }}
                >
                  ▶
                </span>
              </button>
              {!sectionsCollapsed.tasks && (
                <div className="mt-3">
                  <TaskList
                    tasks={goal.tasks}
                    selectedTaskId={
                      selectedSubitemType === "task" ? selectedSubitemId : null
                    }
                    onTaskSelect={(id) => handleSubitemSelect("task", id)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Forms Section */}
        {formCount > 0 && (
          <div>
            <div className="p-4">
              <button
                className="flex items-center justify-between w-full text-left hover:bg-orange-25 dark:hover:bg-orange-975 rounded-md p-2 -m-2 transition-colors"
                onClick={() => toggleSection("forms")}
              >
                <div className="flex items-center gap-2">
                  <span className="text-orange-500" title="Forms">
                    📝
                  </span>
                  <h4 className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Forms ({formCount})
                  </h4>
                </div>
                <span
                  className="text-orange-500 text-sm transform transition-transform duration-200"
                  style={{
                    transform: sectionsCollapsed.forms
                      ? "rotate(0deg)"
                      : "rotate(90deg)",
                  }}
                >
                  ▶
                </span>
              </button>
              {!sectionsCollapsed.forms && (
                <div className="mt-3">
                  <FormList
                    forms={goal.forms}
                    selectedFormId={
                      selectedSubitemType === "form" ? selectedSubitemId : null
                    }
                    onFormSelect={(id) => handleSubitemSelect("form", id)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Goal Selection Indicator */}
      {isSelected && (
        <div className="absolute -left-1 top-4 bottom-4 w-1 bg-blue-500 rounded-r-md" />
      )}
    </div>
  );
}
