import type { Subtask } from "@/types/workflow";
import { getStatusConfig, getSubtaskStyling } from "@/utils/status";

export interface SubtaskListProps {
  subtasks: Subtask[];
  selectedSubtaskId: string | null;
  onSubtaskSelect: (subtaskId: string) => void;
  preventBubbling?: boolean;
}

export function SubtaskList({
  subtasks,
  selectedSubtaskId,
  onSubtaskSelect,
  preventBubbling = false,
}: SubtaskListProps) {
  const handleKeyDown = (e: React.KeyboardEvent, subtaskId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (preventBubbling) {
        e.stopPropagation();
      }
      onSubtaskSelect(subtaskId);
    }
  };

  return (
    <div className="space-y-1">
      {subtasks.map((subtask) => {
        const statusConfig = getStatusConfig(subtask.status);
        const isSelected = selectedSubtaskId === subtask.subtaskId;

        return (
          <button
            type="button"
            key={subtask.subtaskId}
            className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-colors ${getSubtaskStyling(subtask.status, isSelected)}`}
            onClick={(e) => {
              if (preventBubbling) {
                e.stopPropagation();
              }
              onSubtaskSelect(subtask.subtaskId);
            }}
            onKeyDown={(e) => handleKeyDown(e, subtask.subtaskId)}
            aria-pressed={isSelected}
          >
            {/* Status icon */}
            <span
              className="text-sm flex-shrink-0"
              aria-label={`Status: ${statusConfig.label}`}
            >
              {statusConfig.icon}
            </span>

            <span className="flex-1 min-w-0 truncate">{subtask.name}</span>

            <div className="flex items-center gap-2 flex-shrink-0">
              {subtask.required && (
                <span className="text-xs text-red-500">Required</span>
              )}
              <span className={`text-xs font-medium ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
