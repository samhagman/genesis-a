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
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎯</span>
        <div>
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Goal {goal.order}: {goal.name}
          </h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ID: {goal.id}
          </p>
        </div>
      </div>

      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <h5 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
          Description
        </h5>
        <p className="text-neutral-700 dark:text-neutral-300">
          {goal.description}
        </p>
      </div>

      {/* Goal Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900">
          <div className="text-lg font-semibold text-red-700 dark:text-red-300">
            {goal.constraints.length}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 font-medium">
            Constraints
          </div>
        </div>

        <div className="text-center p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900">
          <div className="text-lg font-semibold text-green-700 dark:text-green-300">
            {goal.policies.length}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
            Policies
          </div>
        </div>

        <div className="text-center p-3 rounded-md bg-purple-50 dark:bg-purple-950 border border-purple-100 dark:border-purple-900">
          <div className="text-lg font-semibold text-purple-700 dark:text-purple-300">
            {goal.tasks.length}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            Tasks
          </div>
        </div>

        <div className="text-center p-3 rounded-md bg-orange-50 dark:bg-orange-950 border border-orange-100 dark:border-orange-900">
          <div className="text-lg font-semibold text-orange-700 dark:text-orange-300">
            {goal.forms.length}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            Forms
          </div>
        </div>
      </div>

      {/* Additional Goal Properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goal.timeout_minutes && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h5 className="font-medium mb-1 text-yellow-900 dark:text-yellow-100">
              ⏱️ Timeout
            </h5>
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              {goal.timeout_minutes} minutes
            </span>
          </div>
        )}

        {goal.continuous && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <h5 className="font-medium mb-1 text-blue-900 dark:text-blue-100">
              🔄 Execution
            </h5>
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Continuous
            </span>
          </div>
        )}
      </div>

      {goal.activation_condition && (
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <h5 className="font-medium mb-2 text-green-900 dark:text-green-100">
            🎯 Activation Condition
          </h5>
          <code className="text-sm text-green-800 dark:text-green-200">
            {goal.activation_condition}
          </code>
        </div>
      )}

      {goal.success_criteria && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <h5 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
            ✅ Success Criteria
          </h5>
          {goal.success_criteria.outputs_required && (
            <div>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Required Outputs:
              </span>
              <ul className="mt-1 space-y-1">
                {goal.success_criteria.outputs_required.map((output, index) => (
                  <li
                    key={`output-${index}-${output}`}
                    className="text-sm text-blue-700 dark:text-blue-300"
                  >
                    • {output}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
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
  // Show loading state if workflow is not loaded
  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl">⏳</div>
          <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
            Loading...
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Loading workflow data
          </p>
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
      <div className="h-full p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">{renderDetailView()}</div>
      </div>
    );
  }

  // Show workflow overview when nothing is selected
  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {workflow.name}
          </h3>
          <p className="text-neutral-600 dark:text-neutral-300">
            {workflow.objective}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border">
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              Goals
            </h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {workflow.goals.length}
            </p>
          </div>

          <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border">
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              Version
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
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

        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            💡 Click on any goal, constraint, policy, task, or form in the
            workflow to see detailed information.
          </p>
        </div>
      </div>
    </div>
  );
}
