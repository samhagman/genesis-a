/**
 * Save Template Button Component
 *
 * V3 enhancement for template editing. Provides save functionality with
 * visual feedback for unsaved changes state.
 */

import { useWorkflowStore } from "@/state/workflowStore";
import { useState } from "react";

interface SaveTemplateButtonProps {
  className?: string;
  onSave?: () => void | Promise<void>;
}

export function SaveTemplateButton({
  className = "",
  onSave,
}: SaveTemplateButtonProps) {
  const {
    selectedTemplateId,
    selectedTemplateName,
    hasUnsavedChanges,
    viewMode,
    setHasUnsavedChanges,
  } = useWorkflowStore();

  const [isSaving, setIsSaving] = useState(false);

  // Only show save button in edit mode
  if (viewMode !== "edit") {
    return null;
  }

  // Don't show if no template is selected
  if (!selectedTemplateId || !selectedTemplateName) {
    return null;
  }

  const handleSave = async () => {
    if (!hasUnsavedChanges || isSaving) return;

    setIsSaving(true);

    try {
      // Call parent save handler if provided
      await onSave?.();

      // Mark changes as saved
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save template:", error);
      // Keep unsaved changes state on error
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled = !hasUnsavedChanges || isSaving;

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={isDisabled}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-all
        ${
          isDisabled
            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow"
        }
        ${className}
      `}
    >
      {isSaving ? (
        <>
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          <span className="text-sm font-medium">Saving...</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-sm font-medium">
            {hasUnsavedChanges ? "Save template" : "Saved"}
          </span>
        </>
      )}
    </button>
  );
}
