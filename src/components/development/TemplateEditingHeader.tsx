/**
 * Template Editing Header Component
 *
 * V3 enhancement that combines the template selector, breadcrumb navigation,
 * and save button into a cohesive header for template editing.
 */

import { useWorkflowStore } from "@/state/workflowStore";
import { Breadcrumb } from "./Breadcrumb";
import { SaveTemplateButton } from "./SaveTemplateButton";
import { TemplateSelector } from "./TemplateSelector";

interface TemplateEditingHeaderProps {
  className?: string;
  onTemplateChange?: (templateId: string, templateName: string) => void;
  onViewModeChange?: (mode: "edit" | "instance") => void;
  onSave?: () => void | Promise<void>;
}

export function TemplateEditingHeader({
  className = "",
  onTemplateChange,
  onViewModeChange,
  onSave,
}: TemplateEditingHeaderProps) {
  const { viewMode } = useWorkflowStore();

  return (
    <div
      className={`flex flex-col gap-3 p-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 ${className}`}
    >
      {/* Template Selector Row - Always visible */}
      <div className="flex items-center justify-between">
        <TemplateSelector onTemplateChange={onTemplateChange} />

        {/* Save button - only in edit mode */}
        {viewMode === "edit" && <SaveTemplateButton onSave={onSave} />}
      </div>

      {/* Breadcrumb Navigation Row */}
      <div className="flex items-center">
        <Breadcrumb onViewModeChange={onViewModeChange} />
      </div>
    </div>
  );
}
