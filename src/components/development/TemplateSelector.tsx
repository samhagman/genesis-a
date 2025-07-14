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
    // Directly switch templates without checking for unsaved changes
    setSelectedTemplate(template.id, template.name);
    setIsOpen(false);

    // Clear unsaved changes flag when switching templates
    setHasUnsavedChanges(false);

    // Notify parent component
    onTemplateChange?.(template.id, template.name);
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
    </>
  );
}
