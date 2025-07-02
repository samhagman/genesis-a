/**
 * Breadcrumb Navigation Component
 *
 * V3 enhancement for template editing navigation. Shows the current editing context
 * and provides navigation between edit and instance view modes.
 */

import { useWorkflowStore } from "@/state/workflowStore";

interface BreadcrumbProps {
  className?: string;
  onViewModeChange?: (mode: "edit" | "instance") => void;
}

export function Breadcrumb({
  className = "",
  onViewModeChange,
}: BreadcrumbProps) {
  const { selectedTemplateName, viewMode, hasUnsavedChanges, setViewMode } =
    useWorkflowStore();

  const handleViewModeSwitch = (mode: "edit" | "instance") => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  if (!selectedTemplateName) {
    return (
      <div
        className={`flex items-center gap-2 text-neutral-500 dark:text-neutral-500 ${className}`}
      >
        <span className="text-sm">No template selected</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Template Name */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {selectedTemplateName}
        </span>
        {hasUnsavedChanges && (
          <span
            className="w-2 h-2 bg-orange-500 rounded-full"
            title="Unsaved changes"
          />
        )}
      </div>

      {/* Separator */}
      <span className="text-neutral-400 dark:text-neutral-600">|</span>

      {/* View Mode Navigation */}
      {viewMode === "edit" ? (
        <button
          type="button"
          onClick={() => handleViewModeSwitch("instance")}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors underline text-sm font-medium"
        >
          view instance
        </button>
      ) : (
        <button
          type="button"
          onClick={() => handleViewModeSwitch("edit")}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors underline text-sm font-medium"
        >
          back to edit
        </button>
      )}

      {/* View Mode Indicator */}
      <div className="flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs">
        {viewMode === "edit" ? (
          <>
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-neutral-600 dark:text-neutral-400">
              Edit Mode
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-neutral-600 dark:text-neutral-400">
              Instance Preview
            </span>
          </>
        )}
      </div>
    </div>
  );
}
