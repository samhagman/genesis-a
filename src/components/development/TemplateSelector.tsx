/**
 * Template Selector Component
 *
 * V3 enhancement for template editing. Allows switching between different
 * workflow templates with unsaved changes warning and loading states.
 */

import { useWorkflowStore, type TemplateMetadata } from "@/state/workflowStore";
import { useState } from "react";

interface TemplateSelectorProps {
  className?: string;
  onTemplateChange?: (templateId: string, templateName: string) => void;
}

export function TemplateSelector({
  className = "",
  onTemplateChange,
}: TemplateSelectorProps) {
  const {
    availableTemplates,
    selectedTemplateId,
    selectedTemplateName,
    hasUnsavedChanges,
    templateLoading,
    setSelectedTemplate,
    setHasUnsavedChanges,
  } = useWorkflowStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Prevent render if store is not properly initialized
  if (selectedTemplateId === undefined || selectedTemplateName === undefined) {
    return null;
  }

  // Templates are loaded by App.tsx on mount - no need to load here

  const getTemplateIcon = (template: TemplateMetadata) => {
    if (template.tags.includes("onboarding")) return "👥";
    if (template.tags.includes("shifts")) return "📅";
    if (template.tags.includes("hr")) return "🏢";
    if (template.tags.includes("automation")) return "⚡";
    return "📋";
  };

  const getTemplateColor = (templateId: string) => {
    if (templateId === selectedTemplateId) {
      return "text-blue-600 dark:text-blue-400";
    }
    return "text-neutral-600 dark:text-neutral-400";
  };

  const handleTemplateSelect = (template: TemplateMetadata) => {
    if (hasUnsavedChanges && template.id !== selectedTemplateId) {
      // Show confirmation dialog for unsaved changes
      setPendingTemplate({ id: template.id, name: template.name });
      setShowUnsavedWarning(true);
      return;
    }

    // No unsaved changes, proceed with template switch
    performTemplateSwitch(template.id, template.name);
  };

  const performTemplateSwitch = (templateId: string, templateName: string) => {
    setSelectedTemplate(templateId, templateName);
    setIsOpen(false);
    setShowUnsavedWarning(false);
    setPendingTemplate(null);

    // Notify parent component
    onTemplateChange?.(templateId, templateName);
  };

  const handleConfirmSwitch = () => {
    if (pendingTemplate) {
      // User confirmed, discard unsaved changes and switch
      setHasUnsavedChanges(false);
      performTemplateSwitch(pendingTemplate.id, pendingTemplate.name);
    }
  };

  const handleCancelSwitch = () => {
    setShowUnsavedWarning(false);
    setPendingTemplate(null);
  };

  if (templateLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${className}`}>
        <div className="animate-spin w-4 h-4 border-2 border-neutral-300 border-t-blue-500 rounded-full" />
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          Loading templates...
        </span>
      </div>
    );
  }

  if (availableTemplates.length === 0) {
    return (
      <div className={`px-3 py-2 ${className}`}>
        <span className="text-sm text-neutral-500 dark:text-neutral-500">
          No templates available
        </span>
      </div>
    );
  }

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Current Template Display + Dropdown Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700"
        >
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            📁 Template:
          </span>
          <span
            className={`text-sm font-semibold ${getTemplateColor(selectedTemplateId)}`}
          >
            {selectedTemplateName || "Select template"}
          </span>
          {hasUnsavedChanges && (
            <span
              className="w-2 h-2 bg-orange-500 rounded-full"
              title="Unsaved changes"
            />
          )}
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-label="Toggle dropdown"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Template Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Available Templates
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Switch between different workflow templates
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {availableTemplates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 transition-colors ${
                    selectedTemplateId === template.id
                      ? "bg-blue-50 dark:bg-blue-950"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5">
                      {getTemplateIcon(template)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium ${getTemplateColor(template.id)}`}
                        >
                          {template.name}
                        </span>
                        {selectedTemplateId === template.id && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-neutral-500">
                          v{template.version}
                        </span>
                        <span className="text-xs text-neutral-500">
                          by {template.author}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                💡 <strong>Tip:</strong> Switching templates will reset the chat
                context to the selected template.
              </p>
            </div>
          </div>
        )}

        {/* Backdrop to close dropdown */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 p-6 max-w-md mx-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <svg
                  className="w-5 h-5 text-orange-600 dark:text-orange-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Unsaved Changes
                </h3>
                <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                  You have unsaved changes to "{selectedTemplateName}".
                  Switching to "{pendingTemplate?.name}" will discard these
                  changes.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmSwitch}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelSwitch}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
