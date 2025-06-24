import type { Form } from "@/types/workflow-v2";

export interface FormListProps {
  forms: Form[];
  selectedFormId: string | null;
  onFormSelect: (formId: string) => void;
}

export function FormList({
  forms,
  selectedFormId,
  onFormSelect,
}: FormListProps) {
  const getFormTypeIcon = (
    type: "structured" | "conversational" | "automated"
  ) => {
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

  const getFormTypeColor = (
    type: "structured" | "conversational" | "automated"
  ) => {
    switch (type) {
      case "structured":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800";
      case "conversational":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
      case "automated":
        return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800";
      default:
        return "text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800";
    }
  };

  const getFormStatusIcon = () => {
    // Mock form status for now - in real implementation this would come from workflow instance
    return "📝"; // EMPTY
  };

  const getFormStatusColor = () => {
    // Mock form status styling
    return "text-neutral-500 dark:text-neutral-400";
  };

  const getFieldCount = (form: Form): number => {
    if (form.fields) {
      return form.fields.length;
    }

    if (form.schema?.sections) {
      return form.schema.sections.reduce(
        (total, section) => total + section.fields.length,
        0
      );
    }

    if (form.sections) {
      return form.sections.reduce(
        (total, section) => total + section.fields.length,
        0
      );
    }

    return 0;
  };

  const getSectionCount = (form: Form): number => {
    if (form.schema?.sections) {
      return form.schema.sections.length;
    }

    if (form.sections) {
      return form.sections.length;
    }

    return 0;
  };

  const getFormComplexityBadge = (form: Form) => {
    const fieldCount = getFieldCount(form);
    const sectionCount = getSectionCount(form);

    if (fieldCount === 0) return null;

    let complexity = "Simple";
    let color =
      "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";

    if (fieldCount > 10 || sectionCount > 3) {
      complexity = "Complex";
      color =
        "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
    } else if (fieldCount > 5 || sectionCount > 1) {
      complexity = "Medium";
      color =
        "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
    }

    return { complexity, color, fieldCount, sectionCount };
  };

  return (
    <div className="space-y-2">
      {forms.map((form) => {
        const isSelected = selectedFormId === form.id;
        const typeColor = getFormTypeColor(form.type);
        const complexityInfo = getFormComplexityBadge(form);

        return (
          <div
            key={form.id}
            className={`
              p-3 rounded-md border cursor-pointer transition-all duration-200
              ${
                isSelected
                  ? "border-orange-400 bg-orange-100 dark:bg-orange-900 shadow-md"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-25 dark:hover:bg-orange-950"
              }
            `}
            onClick={() => onFormSelect(form.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* Form header */}
                <div className="flex items-start gap-2 mb-2">
                  <span
                    className={`text-sm ${getFormStatusColor()}`}
                    title="Form Status"
                  >
                    {getFormStatusIcon()}
                  </span>

                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                      {form.name}
                    </h5>

                    {form.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {form.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form type and complexity */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm" title={`Form Type: ${form.type}`}>
                      {getFormTypeIcon(form.type)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${typeColor}`}
                    >
                      {form.type}
                    </span>
                  </div>

                  {complexityInfo && (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${complexityInfo.color}`}
                    >
                      {complexityInfo.complexity}
                    </span>
                  )}
                </div>

                {/* Form attributes */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {form.agent && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded border border-blue-200 dark:border-blue-800">
                      🤖 {form.agent}
                    </span>
                  )}

                  {form.template && (
                    <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-1 rounded border border-green-200 dark:border-green-800">
                      📄 Template
                    </span>
                  )}

                  {form.pre_filled && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-1 rounded border border-purple-200 dark:border-purple-800">
                      📝 Pre-filled
                    </span>
                  )}

                  {form.generation && (
                    <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 px-2 py-1 rounded border border-orange-200 dark:border-orange-800">
                      ⚙️ {form.generation}
                    </span>
                  )}
                </div>

                {/* Form structure details */}
                {complexityInfo && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {complexityInfo.fieldCount} field
                    {complexityInfo.fieldCount !== 1 ? "s" : ""}
                    {complexityInfo.sectionCount > 0 && (
                      <span>
                        {" "}
                        • {complexityInfo.sectionCount} section
                        {complexityInfo.sectionCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* Conversational form details */}
                {form.type === "conversational" && form.initial_prompt && (
                  <div className="mt-2 p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 italic">
                      "{form.initial_prompt.substring(0, 80)}
                      {form.initial_prompt.length > 80 ? "..." : ""}"
                    </p>
                  </div>
                )}

                {/* Context provided */}
                {form.context_provided && form.context_provided.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      Context provided:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {form.context_provided.slice(0, 3).map((context) => (
                        <span
                          key={context}
                          className="text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded"
                        >
                          {context.replace("_", " ")}
                        </span>
                      ))}
                      {form.context_provided.length > 3 && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          +{form.context_provided.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Distribution */}
                {form.distribution && form.distribution.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Distributed to: {form.distribution.join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1 flex-shrink-0" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
