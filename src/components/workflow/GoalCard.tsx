import { Card } from "@/components/card/Card";
import type { GoalCardProps } from "@/types/components";
import { getGoalBorderStyling, getStatusConfig } from "@/utils/status";
import { SubtaskList } from "./SubtaskList";

export function GoalCard({
  goal,
  isSelected,
  selectedSubtaskId,
  onGoalSelect,
  onSubtaskSelect,
}: GoalCardProps) {
  const statusConfig = getStatusConfig(goal.status);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onGoalSelect(goal.goalId);
    }
  };

  return (
    <div
      className="cursor-pointer"
      onClick={() => onGoalSelect(goal.goalId)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
    >
      <Card
        className={`p-4 border-2 transition-colors ${getGoalBorderStyling(goal.status, isSelected)}`}
      >
        <div className="flex items-start gap-3">
          {/* Goal Icon */}
          <div className="text-2xl flex-shrink-0">{goal.icon}</div>

          {/* Goal Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                  {goal.name}
                </h3>
                <div className="flex items-center gap-1">
                  <span
                    className="text-lg"
                    aria-label={`Status: ${statusConfig.label}`}
                  >
                    {statusConfig.icon}
                  </span>
                  <span
                    className={`text-xs font-medium ${statusConfig.textColor}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 text-sm text-neutral-500 dark:text-neutral-400">
                {goal.subtasks.length} subtasks
              </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
              {goal.description}
            </p>

            <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>Owner: {goal.owner}</span>
              <span>Duration: {goal.estimatedDuration}</span>
            </div>

            {/* Subtasks List */}
            <div className="mt-3">
              <SubtaskList
                subtasks={goal.subtasks}
                selectedSubtaskId={selectedSubtaskId}
                onSubtaskSelect={onSubtaskSelect}
                preventBubbling={true}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
