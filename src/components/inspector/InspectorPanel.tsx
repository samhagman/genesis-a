import React from "react";
import { VersionSelector } from "@/components/workflow/VersionSelector";
import type {
  Constraint,
  Form,
  Goal,
  Policy,
  Task,
  WorkflowTemplateV2,
} from "@/types/workflow-v2";

export interface InspectorPanelProps {
  workflow: WorkflowTemplateV2 | null;
  selectedItemId: string | null;
  selectedItemType: "goal" | "constraint" | "policy" | "task" | "form" | null;
  currentVersion?: number;
  onVersionChange?: (version: number, workflow: WorkflowTemplateV2) => void;
}

// Helper functions to find elements by ID and type
function findElementInWorkflow(
  workflow: WorkflowTemplateV2,
  id: string,
  type: string
): Goal | Constraint | Policy | Task | Form | null {
  for (const goal of workflow.goals) {
    if (type === "goal" && goal.id === id) {
      return goal;
    }

    if (type === "constraint") {
      const constraint = goal.constraints.find((c) => c.id === id);
      if (constraint) return constraint;
    }

    if (type === "policy") {
      const policy = goal.policies.find((p) => p.id === id);
      if (policy) return policy;
    }

    if (type === "task") {
      const task = goal.tasks.find((t) => t.id === id);
      if (task) return task;
    }

    if (type === "form") {
      const form = goal.forms.find((f) => f.id === id);
      if (form) return form;
    }
  }

  return null;
}

// Component for displaying constraint details
function ConstraintDetailView({ constraint }: { constraint: Constraint }) {
  const getEnforcementColor = (enforcement: string) => {
    switch (enforcement) {
      case "hard_stop":
        return "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900";
      case "block_progression":
        return "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900";
      case "require_approval":
        return "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900";
      case "warn":
        return "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900";
      default:
        return "text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-900";
    }
  };

  const getTypeIcon = (type: string) => {
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
      default:
        return "🚨";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{getTypeIcon(constraint.type)}</span>
        <div>
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
            {constraint.type.replace("_", " ").toUpperCase()} Constraint
          </h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ID: {constraint.id}
          </p>
        </div>
      </div>

      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <h5 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
          Description
        </h5>
        <p className="text-neutral-700 dark:text-neutral-300">
          {constraint.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg">
          <h5 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
            Enforcement Level
          </h5>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getEnforcementColor(constraint.enforcement)}`}
          >
            {constraint.enforcement.replace("_", " ").toUpperCase()}
          </span>
        </div>

        <div className="p-3 rounded-lg">
          <h5 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
            Type
          </h5>
          <span className="text-neutral-700 dark:text-neutral-300">
            {constraint.type.replace("_", " ")}
          </span>
        </div>
      </div>

      {constraint.value !== undefined && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <h5 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
            Value/Limit
          </h5>
          <pre className="text-sm text-blue-800 dark:text-blue-200">
            {typeof constraint.value === "object"
              ? JSON.stringify(constraint.value, null, 2)
              : String(constraint.value)}
          </pre>
        </div>
      )}

      {constraint.condition && (
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <h5 className="font-medium mb-2 text-green-900 dark:text-green-100">
            Condition
          </h5>
          <code className="text-sm text-green-800 dark:text-green-200">
            {constraint.condition}
          </code>
        </div>
      )}
    </div>
  );
}

// Component for displaying policy details
function PolicyDetailView({ policy }: { policy: Policy }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <div>
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
            {policy.name}
          </h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ID: {policy.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* IF Condition */}
        <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
          <h5 className="font-medium mb-3 text-orange-900 dark:text-orange-100 flex items-center gap-2">
            <span>🔍</span> IF Condition
          </h5>
          <div className="space-y-2 text-sm">
            {policy.if.condition && (
              <div>
                <span className="font-medium text-orange-800 dark:text-orange-200">
                  Condition:
                </span>
                <code className="ml-2 text-orange-700 dark:text-orange-300">
                  {policy.if.condition}
                </code>
              </div>
            )}
            {policy.if.field && (
              <div>
                <span className="font-medium text-orange-800 dark:text-orange-200">
                  Field:
                </span>
                <span className="ml-2 text-orange-700 dark:text-orange-300">
                  {policy.if.field}
                </span>
              </div>
            )}
            {policy.if.operator && (
              <div>
                <span className="font-medium text-orange-800 dark:text-orange-200">
                  Operator:
                </span>
                <span className="ml-2 text-orange-700 dark:text-orange-300">
                  {policy.if.operator}
                </span>
              </div>
            )}
            {policy.if.value !== undefined && (
              <div>
                <span className="font-medium text-orange-800 dark:text-orange-200">
                  Value:
                </span>
                <span className="ml-2 text-orange-700 dark:text-orange-300">
                  {typeof policy.if.value === "object"
                    ? JSON.stringify(policy.if.value)
                    : String(policy.if.value)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* THEN Action */}
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <h5 className="font-medium mb-3 text-green-900 dark:text-green-100 flex items-center gap-2">
            <span>⚡</span> THEN Action
          </h5>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-green-800 dark:text-green-200">
                Action:
              </span>
              <span className="ml-2 text-green-700 dark:text-green-300">
                {policy.then.action}
              </span>
            </div>
            {Object.keys(policy.then.params).length > 0 && (
              <div>
                <span className="font-medium text-green-800 dark:text-green-200">
                  Parameters:
                </span>
                <pre className="mt-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 p-2 rounded">
                  {JSON.stringify(policy.then.params, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for displaying task details
function TaskDetailView({ task }: { task: Task }) {
  const getAssigneeIcon = (type: string) => {
    return type === "ai_agent" ? "🤖" : "👤";
  };

  const getAssigneeColor = (type: string) => {
    return type === "ai_agent"
      ? "text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900"
      : "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📋</span>
        <div>
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Task
          </h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ID: {task.id}
          </p>
        </div>
      </div>

      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <h5 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
          Description
        </h5>
        <p className="text-neutral-700 dark:text-neutral-300">
          {task.description}
        </p>
      </div>

      {/* Assignee Information */}
      <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
        <h5 className="font-medium mb-3 text-purple-900 dark:text-purple-100 flex items-center gap-2">
          <span>{getAssigneeIcon(task.assignee.type)}</span> Assignee
        </h5>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getAssigneeColor(task.assignee.type)}`}
            >
              {task.assignee.type.replace("_", " ").toUpperCase()}
            </span>
          </div>

          {task.assignee.model && (
            <div className="text-sm">
              <span className="font-medium text-purple-800 dark:text-purple-200">
                Model:
              </span>
              <span className="ml-2 text-purple-700 dark:text-purple-300">
                {task.assignee.model}
              </span>
            </div>
          )}

          {task.assignee.role && (
            <div className="text-sm">
              <span className="font-medium text-purple-800 dark:text-purple-200">
                Role:
              </span>
              <span className="ml-2 text-purple-700 dark:text-purple-300">
                {task.assignee.role}
              </span>
            </div>
          )}

          {task.assignee.capabilities &&
            task.assignee.capabilities.length > 0 && (
              <div className="text-sm">
                <span className="font-medium text-purple-800 dark:text-purple-200">
                  Capabilities:
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {task.assignee.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Inputs and Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {task.inputs && task.inputs.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <h5 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
              📥 Inputs
            </h5>
            <ul className="space-y-1">
              {task.inputs.map((input, index) => (
                <li
                  key={`input-${index}-${input}`}
                  className="text-sm text-blue-800 dark:text-blue-200"
                >
                  • {input}
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.outputs && task.outputs.length > 0 && (
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <h5 className="font-medium mb-2 text-green-900 dark:text-green-100">
              📤 Outputs
            </h5>
            <ul className="space-y-1">
              {task.outputs.map((output, index) => (
                <li
                  key={`output-${index}-${output}`}
                  className="text-sm text-green-800 dark:text-green-200"
                >
                  • {output}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {task.timeout_minutes && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h5 className="font-medium mb-1 text-yellow-900 dark:text-yellow-100">
              ⏱️ Timeout
            </h5>
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              {task.timeout_minutes} minutes
            </span>
          </div>
        )}

        {task.depends_on && task.depends_on.length > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
            <h5 className="font-medium mb-1 text-orange-900 dark:text-orange-100">
              🔗 Dependencies
            </h5>
            <div className="text-sm text-orange-800 dark:text-orange-200">
              {task.depends_on.length} dependencies
            </div>
          </div>
        )}
      </div>

      {task.trigger_condition && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border">
          <h5 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
            🎯 Trigger Condition
          </h5>
          <code className="text-sm text-neutral-700 dark:text-neutral-300">
            {task.trigger_condition}
          </code>
        </div>
      )}
    </div>
  );
}

// Component for displaying form details
function FormDetailView({ form }: { form: Form }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "structured":
        return "📋";
      case "conversational":
        return "💬";
      case "automated":
        return "⚙️";
      default:
        return "📝";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "structured":
        return "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900";
      case "conversational":
        return "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900";
      case "automated":
        return "text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900";
      default:
        return "text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-900";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{getTypeIcon(form.type)}</span>
        <div>
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
            {form.name}
          </h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ID: {form.id}
          </p>
        </div>
      </div>

      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <h5 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
          Description
        </h5>
        <p className="text-neutral-700 dark:text-neutral-300">
          {form.description}
        </p>
      </div>

      <div className="p-3 rounded-lg">
        <h5 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
          Form Type
        </h5>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(form.type)}`}
        >
          {form.type.replace("_", " ").toUpperCase()}
        </span>
      </div>

      {form.schema?.sections && (
        <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
          <h5 className="font-medium mb-3 text-orange-900 dark:text-orange-100">
            📊 Form Schema
          </h5>
          <div className="space-y-2">
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <span className="font-medium">Sections:</span>{" "}
              {form.schema.sections.length}
            </div>
            {form.schema.sections.map((section, index) => (
              <div
                key={`section-${index}-${section.name}`}
                className="pl-4 border-l-2 border-orange-200 dark:border-orange-800"
              >
                <div className="font-medium text-orange-900 dark:text-orange-100">
                  {section.name}
                </div>
                {section.fields && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {section.fields.length} fields
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {form.agent && (
        <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
          <h5 className="font-medium mb-2 text-purple-900 dark:text-purple-100">
            🤖 Agent
          </h5>
          <span className="text-sm text-purple-800 dark:text-purple-200">
            {form.agent}
          </span>
        </div>
      )}

      {form.template && (
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <h5 className="font-medium mb-2 text-green-900 dark:text-green-100">
            📄 Template
          </h5>
          <span className="text-sm text-green-800 dark:text-green-200">
            {form.template}
          </span>
        </div>
      )}
    </div>
  );
}

// Component for displaying goal details
function GoalDetailView({ goal }: { goal: Goal }) {
  const [copySuccess, setCopySuccess] = React.useState(false);
  
  const handleCopyId = () => {
    navigator.clipboard.writeText(goal.id);
    setCopySuccess(true);
    // Announce to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.textContent = 'Goal ID copied to clipboard';
    document.body.appendChild(announcement);
    setTimeout(() => {
      setCopySuccess(false);
      document.body.removeChild(announcement);
    }, 2000);
  };
  
  return (
    <div className="relative h-full inspector-bg">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-200/10 to-transparent pointer-events-none" />
      
      <div className="relative space-y-0">
        {/* Header */}
        <div className="pb-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl animate-fade-in">🎯</span>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight animate-fade-in">
                  Goal {goal.order}: {goal.name}
                </h1>
                {goal.timeout_minutes && (
                  <div className="flex items-center gap-1.5 bg-blue-100/50 text-blue-700/80 text-xs font-medium px-2.5 py-1 rounded-full animate-fade-in">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>{goal.timeout_minutes}m timeout</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 animate-fade-in animation-delay-100">
                <p className="text-xs text-neutral-500 font-mono">
                  ID: {goal.id}
                </p>
                <button 
                  onClick={handleCopyId}
                  className="interactive-element text-neutral-600 hover:text-neutral-800 transition-all p-1 rounded hover:bg-neutral-200/50"
                  title="Copy ID to clipboard"
                  aria-label={copySuccess ? "Goal ID copied to clipboard" : "Copy goal ID to clipboard"}
                  aria-pressed={copySuccess}
                >
                  {copySuccess ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="copy-success text-green-600" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4 animate-fade-in animation-delay-200">
            <p className="text-sm text-neutral-700 leading-relaxed">
              {goal.description}
            </p>
          </div>
        </div>
        
        {/* Section Divider */}
        <hr className="section-divider" />

        {/* Goal Statistics */}
        <div className="animate-fade-in animation-delay-150">
          <div className="grid grid-cols-2 gap-4">
            {/* Constraints Card */}
            <div 
              className="stat-card interactive-element group relative overflow-hidden rounded-xl border border-neutral-900/20 bg-white/60 backdrop-blur-sm p-5 transition-all duration-200 ease-out hover:bg-white/70 hover:-translate-y-px shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_8px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_4px_rgba(0,0,0,0.06),_0_10px_20px_rgba(0,0,0,0.06)] cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${goal.constraints.length} constraints defined for this goal`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />
              <div className="text-center">
                <div className="text-3xl font-bold text-neutral-900 mb-1">
                  {goal.constraints.length}
                </div>
                <div className="text-xs text-neutral-600 uppercase tracking-wider">
                  Constraints
                </div>
              </div>
            </div>

            {/* Policies Card */}
            <div 
              className="stat-card interactive-element group relative overflow-hidden rounded-xl border border-neutral-900/20 bg-white/60 backdrop-blur-sm p-5 transition-all duration-200 ease-out hover:bg-white/70 hover:-translate-y-px shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_8px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_4px_rgba(0,0,0,0.06),_0_10px_20px_rgba(0,0,0,0.06)] cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${goal.policies.length} policies defined for this goal`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 to-green-600" />
              <div className="text-center">
                <div className="text-3xl font-bold text-neutral-900 mb-1">
                  {goal.policies.length}
                </div>
                <div className="text-xs text-neutral-600 uppercase tracking-wider">
                  Policies
                </div>
              </div>
            </div>

            {/* Tasks Card */}
            <div 
              className="stat-card interactive-element group relative overflow-hidden rounded-xl border border-neutral-900/20 bg-white/60 backdrop-blur-sm p-5 transition-all duration-200 ease-out hover:bg-white/70 hover:-translate-y-px shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_8px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_4px_rgba(0,0,0,0.06),_0_10px_20px_rgba(0,0,0,0.06)] cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${goal.tasks.length} tasks defined for this goal`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
              <div className="text-center">
                <div className="text-3xl font-bold text-neutral-900 mb-1">
                  {goal.tasks.length}
                </div>
                <div className="text-xs text-neutral-600 uppercase tracking-wider">
                  Tasks
                </div>
              </div>
            </div>

            {/* Forms Card */}
            <div 
              className="stat-card interactive-element group relative overflow-hidden rounded-xl border border-neutral-900/20 bg-white/60 backdrop-blur-sm p-5 transition-all duration-200 ease-out hover:bg-white/70 hover:-translate-y-px shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_8px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_4px_rgba(0,0,0,0.06),_0_10px_20px_rgba(0,0,0,0.06)] cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${goal.forms.length} forms defined for this goal`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="text-center">
                <div className="text-3xl font-bold text-neutral-900 mb-1">
                  {goal.forms.length}
                </div>
                <div className="text-xs text-neutral-600 uppercase tracking-wider">
                  Forms
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Divider */}
        <hr className="section-divider" />
        
        {/* Additional Goal Properties */}
        <div className="space-y-4 animate-fade-in animation-delay-400">
          {goal.timeout_minutes && (
            <div className="rounded-xl bg-black/[0.02] border border-black/5 p-5 hover:bg-black/[0.03] transition-all duration-200 group">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 group-hover:bg-yellow-500/15 transition-colors">
                  <span className="text-lg">⏱️</span>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Timeout
                  </h5>
                  <p className="text-lg text-neutral-900 font-semibold mt-0.5">
                    {goal.timeout_minutes} minutes
                  </p>
                </div>
              </div>
            </div>
          )}

          {goal.continuous && (
            <div className="rounded-xl bg-black/[0.02] border border-black/5 p-5 hover:bg-black/[0.03] transition-all duration-200 group">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/15 transition-colors">
                  <span className="text-lg">🔄</span>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Execution Mode
                  </h5>
                  <p className="text-lg text-neutral-900 font-semibold mt-0.5">
                    Continuous
                  </p>
                </div>
              </div>
            </div>
          )}

          {goal.activation_condition && (
            <div className="rounded-xl bg-black/[0.02] border border-black/5 p-5 hover:bg-black/[0.03] transition-all duration-200 group">
              <h5 className="text-xs font-medium text-neutral-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-green-500/10 border border-green-500/20 group-hover:bg-green-500/15 transition-colors">
                  <span className="text-xs">🎯</span>
                </div>
                Activation Condition
              </h5>
              <code className="text-sm text-neutral-700 font-mono bg-neutral-200/50 px-3 py-2 rounded-lg block border border-neutral-300">
                {goal.activation_condition}
              </code>
            </div>
          )}

          {goal.success_criteria && (
            <div className="rounded-xl bg-gradient-to-br from-blue-400/10 to-blue-500/5 border border-blue-400/20 p-5 shadow-[0_2px_8px_rgba(59,130,246,0.08)]">
              <h5 className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-400/20 border border-blue-400/30">
                  <span className="text-xs">✅</span>
                </div>
                Success Criteria
              </h5>
              {goal.success_criteria.outputs_required && (
                <div>
                  <p className="text-xs text-neutral-600 uppercase tracking-wider mb-3">
                    Required Outputs
                  </p>
                  <ul className="space-y-2">
                    {goal.success_criteria.outputs_required.map((output, index) => (
                      <li
                        key={`output-${index}-${output}`}
                        className="flex items-start gap-2 text-sm text-neutral-800 hover:text-neutral-900 transition-colors group"
                      >
                        <span className="text-blue-600 mt-0.5 group-hover:text-blue-700">▸</span>
                        <span className="font-mono text-xs bg-white/80 px-2 py-0.5 rounded border border-neutral-200">{output}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export function InspectorPanel({
  workflow,
  selectedItemId,
  selectedItemType,
  currentVersion,
  onVersionChange,
}: InspectorPanelProps) {
  // Add Inter font and global styles
  React.useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    // Add CSS for animations and styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes check-icon {
        0% { transform: scale(1) rotate(0deg); }
        30% { transform: scale(1.15) rotate(8deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      .animate-fade-in {
        animation: fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        opacity: 0;
      }
      
      .animation-delay-50 { animation-delay: 50ms; }
      .animation-delay-100 { animation-delay: 100ms; }
      .animation-delay-150 { animation-delay: 150ms; }
      .animation-delay-200 { animation-delay: 200ms; }
      
      .stat-card {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .stat-card:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.06);
      }
      
      .stat-card:active {
        transform: scale(0.98) translateY(-2px);
      }
      
      .stat-card:hover {
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      
      .stat-card > * {
        position: relative;
        z-index: 1;
      }
      
      .copy-success {
        animation: check-icon 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      /* Accessibility */
      .interactive-element:focus-visible {
        outline: 2px solid #4A90E2;
        outline-offset: 2px;
        border-radius: inherit;
      }
      
      /* Skeleton Loading */
      .skeleton {
        background-color: rgba(0, 0, 0, 0.05);
        position: relative;
        overflow: hidden;
        border-radius: 12px;
      }
      
      .skeleton::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transform: translateX(-100%);
        background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.08), transparent);
        animation: shimmer 1.5s infinite;
      }
      
      .section-divider {
        border: none;
        border-top: 1px solid #E5E7EB;
        margin: 2rem 0;
      }
      
      .inspector-bg {
        background-color: #F3F4F6;
      }
      
      .inspector-bg-goal {
        background-color: #F3F4F6;
        background-image: 
          linear-gradient(to bottom right, rgba(96, 165, 250, 0.03), rgba(59, 130, 246, 0));
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, []);
  
  // Show loading state if workflow is not loaded
  if (!workflow) {
    return (
      <div className="h-full inspector-bg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-0">
            {/* Header Skeleton */}
            <div className="pb-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 skeleton rounded-full"></div>
                <div className="flex-1">
                  <div className="h-8 skeleton w-3/4 mb-2"></div>
                  <div className="h-4 skeleton w-1/2"></div>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-4 skeleton w-full mb-2"></div>
                <div className="h-4 skeleton w-2/3"></div>
              </div>
            </div>
            
            {/* Section Divider */}
            <hr className="section-divider" />
            
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-24 relative">
                  <div className="absolute inset-x-0 top-0 h-1 bg-neutral-400/50"></div>
                </div>
              ))}
            </div>
            
            {/* Section Divider */}
            <hr className="section-divider" />
            
            {/* Info Panels Skeleton */}
            <div className="space-y-4">
              <div className="skeleton h-20"></div>
              <div className="skeleton h-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show specific inspector based on selection
  if (selectedItemId && selectedItemType) {
    const element = findElementInWorkflow(
      workflow,
      selectedItemId,
      selectedItemType
    );

    if (!element) {
      return (
        <div className="h-full p-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Element Not Found
              </h3>
              <p className="text-neutral-600 dark:text-neutral-300">
                Could not find {selectedItemType} with ID: {selectedItemId}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Render the appropriate detail view based on element type
    const renderDetailView = () => {
      switch (selectedItemType) {
        case "goal":
          return <GoalDetailView goal={element as Goal} />;
        case "constraint":
          return <ConstraintDetailView constraint={element as Constraint} />;
        case "policy":
          return <PolicyDetailView policy={element as Policy} />;
        case "task":
          return <TaskDetailView task={element as Task} />;
        case "form":
          return <FormDetailView form={element as Form} />;
        default:
          return (
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-300 text-sm">
                Unknown element type: {selectedItemType}
              </p>
            </div>
          );
      }
    };

    return (
      <div className={`h-full overflow-y-auto ${selectedItemType === 'goal' ? 'inspector-bg-goal' : 'inspector-bg'}`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">{renderDetailView()}</div>
        </div>
      </div>
    );
  }

  // Show workflow overview when nothing is selected
  return (
    <div className="h-full overflow-y-auto inspector-bg" data-testid="inspector-panel" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="p-6">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-neutral-900">
              {workflow.name}
            </h3>
            <p className="text-neutral-600">
              {workflow.objective}
            </p>
          </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/60 rounded-lg border border-neutral-200 shadow-sm">
            <h4 className="font-medium text-neutral-900 mb-2">
              Goals
            </h4>
            <p className="text-2xl font-bold text-blue-600">
              {workflow.goals.length}
            </p>
          </div>

          <div className="p-4 bg-white/60 rounded-lg border border-neutral-200 shadow-sm">
            <h4 className="font-medium text-neutral-900 mb-2">
              Version
            </h4>
            <p className="text-sm text-neutral-600">
              {workflow.version}
            </p>
          </div>
        </div>

        {/* Version Selector */}
        <VersionSelector
          workflow={workflow}
          currentVersion={currentVersion}
          onVersionChange={onVersionChange}
        />

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-sm">
            💡 Click on any goal, constraint, policy, task, or form in the
            workflow to see detailed information.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
