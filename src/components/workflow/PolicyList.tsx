import type { Policy, PolicyCondition } from "@/types/workflow-v2";

export interface PolicyListProps {
  policies: Policy[];
  selectedPolicyId: string | null;
  onPolicySelect: (policyId: string) => void;
}

export function PolicyList({
  policies,
  selectedPolicyId,
  onPolicySelect,
}: PolicyListProps) {
  const renderConditionSummary = (condition: PolicyCondition): string => {
    if (condition.condition) {
      return condition.condition;
    }

    if (
      condition.field &&
      condition.operator &&
      condition.value !== undefined
    ) {
      return `${condition.field} ${condition.operator} ${condition.value}`;
    }

    if (condition.all_of) {
      return `ALL of ${condition.all_of.length} conditions`;
    }

    if (condition.any_of) {
      return `ANY of ${condition.any_of.length} conditions`;
    }

    return "Complex condition";
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "set_categorization":
        return "🏷️";
      case "create_task":
        return "📋";
      case "activate_bonus":
        return "💰";
      case "initiate_recruitment":
        return "📢";
      case "exclude_from_outreach":
        return "🚫";
      case "trigger_deep_dive":
        return "🔍";
      case "flag_for_adoption":
        return "🚩";
      case "escalate_to_team":
        return "🆙";
      case "flag_for_review":
        return "👁️";
      default:
        return "⚡";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "set_categorization":
      case "flag_for_review":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800";
      case "create_task":
      case "escalate_to_team":
        return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800";
      case "activate_bonus":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
      case "initiate_recruitment":
      case "flag_for_adoption":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800";
      case "exclude_from_outreach":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
      case "trigger_deep_dive":
        return "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800";
      default:
        return "text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800";
    }
  };

  const getPolicyStatusIcon = () => {
    // Mock policy status for now - in real implementation this would come from workflow instance
    return "😴"; // DORMANT
  };

  const getPolicyStatusColor = () => {
    // Mock policy status styling
    return "text-neutral-500 dark:text-neutral-400";
  };

  return (
    <div className="space-y-2">
      {policies.map((policy) => {
        const isSelected = selectedPolicyId === policy.id;
        const actionColor = getActionColor(policy.then.action);
        const conditionSummary = renderConditionSummary(policy.if);

        return (
          <div
            key={policy.id}
            className={`
              p-3 rounded-md border cursor-pointer transition-all duration-200
              ${
                isSelected
                  ? "border-green-400 bg-green-100 dark:bg-green-900 shadow-md"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-25 dark:hover:bg-green-950"
              }
            `}
            onClick={() => onPolicySelect(policy.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* Policy name and status */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-sm ${getPolicyStatusColor()}`}
                    title="Policy Status"
                  >
                    {getPolicyStatusIcon()}
                  </span>
                  <h5 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {policy.name}
                  </h5>
                </div>

                {/* If-Then Logic */}
                <div className="space-y-2">
                  {/* Condition */}
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                      IF:
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {conditionSummary}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                      THEN:
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm"
                          title={`Action: ${policy.then.action}`}
                        >
                          {getActionIcon(policy.then.action)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${actionColor}`}
                        >
                          {policy.then.action.replace("_", " ")}
                        </span>
                      </div>

                      {/* Action parameters */}
                      {Object.keys(policy.then.params).length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {Object.entries(policy.then.params)
                              .slice(0, 2)
                              .map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}:{" "}
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </span>
                              ))}
                            {Object.keys(policy.then.params).length > 2 &&
                              "..."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1 flex-shrink-0" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
