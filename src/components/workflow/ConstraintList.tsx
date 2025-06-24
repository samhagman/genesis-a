import type { Constraint } from "@/types/workflow-v2";

export interface ConstraintListProps {
  constraints: Constraint[];
  selectedConstraintId: string | null;
  onConstraintSelect: (constraintId: string) => void;
}

export function ConstraintList({
  constraints,
  selectedConstraintId,
  onConstraintSelect,
}: ConstraintListProps) {
  const getConstraintTypeIcon = (type: Constraint["type"]) => {
    switch (type) {
      case "time_limit":
        return "⏰";
      case "data_validation":
        return "✅";
      case "business_rule":
        return "📋";
      case "rate_limit":
        return "🚦";
      case "access_control":
        return "🔒";
      case "timing":
        return "⏱️";
      case "change_management":
        return "🔄";
      case "data_protection":
        return "🛡️";
      case "privacy":
        return "🔐";
      case "content_validation":
        return "📝";
      default:
        return "⚪";
    }
  };

  const getConstraintTypeColor = (type: Constraint["type"]) => {
    switch (type) {
      case "time_limit":
      case "timing":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800";
      case "data_validation":
      case "data_protection":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
      case "business_rule":
        return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800";
      case "rate_limit":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
      case "access_control":
      case "privacy":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
      case "change_management":
        return "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800";
      case "content_validation":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800";
      default:
        return "text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800";
    }
  };

  const getEnforcementIcon = (enforcement: Constraint["enforcement"]) => {
    switch (enforcement) {
      case "hard_stop":
        return "🛑";
      case "block_progression":
        return "⛔";
      case "require_approval":
        return "✋";
      case "warn":
        return "⚠️";
      case "skip_workflow":
        return "⏭️";
      case "delay_until_allowed":
        return "⏳";
      case "filter_recipients":
        return "🔍";
      case "content_review":
        return "👀";
      case "block_until_met":
        return "🚧";
      case "block_duplicate":
        return "🚫";
      default:
        return "❓";
    }
  };

  const getEnforcementColor = (enforcement: Constraint["enforcement"]) => {
    switch (enforcement) {
      case "hard_stop":
      case "block_progression":
      case "block_until_met":
      case "block_duplicate":
        return "text-red-600 dark:text-red-400";
      case "require_approval":
      case "content_review":
        return "text-yellow-600 dark:text-yellow-400";
      case "warn":
        return "text-orange-600 dark:text-orange-400";
      case "skip_workflow":
      case "delay_until_allowed":
        return "text-blue-600 dark:text-blue-400";
      case "filter_recipients":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "text-neutral-600 dark:text-neutral-400";
    }
  };

  return (
    <div className="space-y-2">
      {constraints.map((constraint) => {
        const isSelected = selectedConstraintId === constraint.id;
        const typeColor = getConstraintTypeColor(constraint.type);
        const enforcementColor = getEnforcementColor(constraint.enforcement);

        return (
          <div
            key={constraint.id}
            className={`
              p-3 rounded-md border cursor-pointer transition-all duration-200
              ${
                isSelected
                  ? "border-red-400 bg-red-100 dark:bg-red-900 shadow-md"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-red-300 dark:hover:border-red-600 hover:bg-red-25 dark:hover:bg-red-950"
              }
            `}
            onClick={() => onConstraintSelect(constraint.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-sm" title={`Type: ${constraint.type}`}>
                    {getConstraintTypeIcon(constraint.type)}
                  </span>
                  <span
                    className={`text-xs ${enforcementColor}`}
                    title={`Enforcement: ${constraint.enforcement}`}
                  >
                    {getEnforcementIcon(constraint.enforcement)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                    {constraint.description}
                  </p>

                  {/* Constraint details */}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${typeColor}`}
                    >
                      {constraint.type.replace("_", " ")}
                    </span>

                    {(constraint.value !== undefined || 
                      (constraint as any).limit !== undefined ||
                      (constraint as any).max_value !== undefined) && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        Value:{" "}
                        {constraint.value !== undefined 
                          ? (typeof constraint.value === "object"
                              ? JSON.stringify(constraint.value)
                              : constraint.value)
                          : (constraint as any).limit !== undefined
                            ? (constraint as any).limit
                            : (constraint as any).max_value}
                        {constraint.unit && ` ${constraint.unit}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1 flex-shrink-0" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
