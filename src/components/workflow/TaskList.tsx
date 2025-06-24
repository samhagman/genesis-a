import type { Task } from "@/types/workflow-v2";

export interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskSelect: (taskId: string) => void;
}

export function TaskList({
  tasks,
  selectedTaskId,
  onTaskSelect,
}: TaskListProps) {
  const getAssigneeIcon = (type: "ai_agent" | "human") => {
    return type === "ai_agent" ? "🤖" : "👤";
  };

  const getAssigneeColor = (type: "ai_agent" | "human") => {
    return type === "ai_agent"
      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
      : "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
  };

  const getTaskStatusIcon = () => {
    // Mock task status for now - in real implementation this would come from workflow instance
    return "📋"; // NOT_ASSIGNED
  };

  const getTaskStatusColor = () => {
    // Mock task status styling
    return "text-neutral-500 dark:text-neutral-400";
  };

  const getTaskTypeIcon = (task: Task) => {
    if (task.continuous) return "🔄";
    if (task.schedule) return "⏰";
    if (task.trigger_condition) return "⚡";
    return "📝";
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isSelected = selectedTaskId === task.id;
        const assigneeColor = getAssigneeColor(task.assignee.type);

        return (
          <div
            key={task.id}
            className={`
              p-3 rounded-md border cursor-pointer transition-all duration-200
              ${
                isSelected
                  ? "border-purple-400 bg-purple-100 dark:bg-purple-900 shadow-md"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-25 dark:hover:bg-purple-950"
              }
            `}
            onClick={() => onTaskSelect(task.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* Task header */}
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-sm ${getTaskStatusColor()}`}
                      title="Task Status"
                    >
                      {getTaskStatusIcon()}
                    </span>
                    <span className="text-sm" title="Task Type">
                      {getTaskTypeIcon(task)}
                    </span>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                </div>

                {/* Assignee and metadata */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span
                      className="text-sm"
                      title={`Assignee Type: ${task.assignee.type}`}
                    >
                      {getAssigneeIcon(task.assignee.type)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${assigneeColor}`}
                    >
                      {task.assignee.type === "ai_agent" ? "AI Agent" : "Human"}
                    </span>
                  </div>

                  {/* Model/Role info */}
                  {task.assignee.model && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                      {task.assignee.model}
                    </span>
                  )}

                  {task.assignee.role && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                      {task.assignee.role}
                    </span>
                  )}
                </div>

                {/* Task attributes */}
                <div className="flex items-center gap-2 flex-wrap">
                  {task.timeout_minutes && (
                    <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 px-2 py-1 rounded border border-orange-200 dark:border-orange-800">
                      ⏱️ {formatDuration(task.timeout_minutes)} timeout
                    </span>
                  )}

                  {task.sla_minutes && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded border border-blue-200 dark:border-blue-800">
                      📋 {formatDuration(task.sla_minutes)} SLA
                    </span>
                  )}

                  {task.continuous && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-1 rounded border border-purple-200 dark:border-purple-800">
                      🔄 Continuous
                    </span>
                  )}

                  {task.approval_required && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950 px-2 py-1 rounded border border-yellow-200 dark:border-yellow-800">
                      ✋ Approval Required
                    </span>
                  )}

                  {task.human_review && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-800">
                      👁️ Human Review
                    </span>
                  )}
                </div>

                {/* Capabilities/Skills */}
                {task.assignee.capabilities &&
                  task.assignee.capabilities.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                        Capabilities:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {task.assignee.capabilities
                          .slice(0, 3)
                          .map((capability) => (
                            <span
                              key={capability}
                              className="text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded"
                            >
                              {capability.replace("_", " ")}
                            </span>
                          ))}
                        {task.assignee.capabilities.length > 3 && (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            +{task.assignee.capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                {/* Dependencies */}
                {task.depends_on && task.depends_on.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Depends on: {task.depends_on.join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-1 flex-shrink-0" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
