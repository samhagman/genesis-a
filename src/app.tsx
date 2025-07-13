import { useEffect, useState } from "react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { ScenarioSwitcher } from "@/components/development/ScenarioSwitcher";
import { TemplateEditingHeader } from "@/components/development/TemplateEditingHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InspectorPanel } from "@/components/inspector/InspectorPanel";
// Component imports
import { ThreePanelLayout } from "@/components/layout/ThreePanelLayout";
import { WorkflowPanel } from "@/components/workflow/WorkflowPanel";

// Removed useWorkflowActions to prevent infinite loop
import { getAllScenarios } from "@/state/mockScenarios";
import { getApiUrl } from "@/config";
import { useWorkflowStore } from "@/state/workflowStore";
// Types and utilities
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import { loadWorkflowSafe } from "@/utils/workflowApi";

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    // Check localStorage first, default to dark if not found
    const savedTheme = localStorage.getItem("theme");
    return (savedTheme as "dark" | "light") || "dark";
  });

  // Workflow selection state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<
    "goal" | "constraint" | "policy" | "task" | "form" | null
  >(null);

  // Workflow data state
  const [workflow, setWorkflow] = useState<WorkflowTemplateV2 | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  // Direct access to store actions (no hook to prevent infinite loop)

  // Template editing state from store
  const {
    viewMode,
    selectedTemplateId,
    setSelectedTemplate,
    setViewMode,
    setHasUnsavedChanges,
    loadAvailableTemplates,
  } = useWorkflowStore();

  useEffect(() => {
    // Apply theme class on mount and when theme changes
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    // Save theme preference to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    // Load workflow data on mount
    async function loadWorkflow() {
      try {
        setWorkflowLoading(true);
        // Load InstaWork workflow (V2 schema) from API (R2) with local fallback
        const { workflow: workflowData, source } = await loadWorkflowSafe(
          "instawork-shift-filling"
        );
        console.log(`[App] Initial workflow loaded from ${source}:`, {
          name: workflowData.name,
          goalsCount: workflowData.goals?.length || 0,
        });
        setWorkflow(workflowData);

        // Initialize workflow scenarios and load default scenario
        const scenarios = getAllScenarios(workflowData);
        const { setScenarios, loadScenario } = useWorkflowStore.getState();
        setScenarios(scenarios);

        // Load the "in_progress" scenario by default for demonstration
        const defaultScenario =
          scenarios.find((s) => s.name === "in_progress") || scenarios[0];
        if (defaultScenario) {
          loadScenario(defaultScenario);
        }
      } catch (err) {
        setWorkflowError(
          err instanceof Error ? err.message : "Failed to load workflow"
        );
      } finally {
        setWorkflowLoading(false);
      }
    }

    loadWorkflow();
  }, []); // Empty dependency array - only run on mount

  // Initialize template editing capabilities
  useEffect(() => {
    // Load available templates on mount
    loadAvailableTemplates();
  }, [loadAvailableTemplates]); // Include loadAvailableTemplates in dependencies

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // Template switching logic - loads from API (R2) with local fallback
  const handleTemplateChange = async (
    templateId: string,
    templateName: string
  ) => {
    try {
      // Update frontend state first
      setSelectedTemplate(templateId, templateName);
      setHasUnsavedChanges(false);

      // Load template workflow data from API (R2) with local fallback
      const { workflow: templateWorkflow, source } =
        await loadWorkflowSafe(templateId);
      console.log(
        `[App] Template switched to ${templateName} from ${source}:`,
        {
          goalsCount: templateWorkflow.goals?.length || 0,
        }
      );
      setWorkflow(templateWorkflow);

      // Reinitialize scenarios for new template
      const scenarios = getAllScenarios(templateWorkflow);
      const { setScenarios, loadScenario } = useWorkflowStore.getState();
      setScenarios(scenarios);

      // Load default scenario
      const defaultScenario =
        scenarios.find((s) => s.name === "in_progress") || scenarios[0];
      if (defaultScenario) {
        loadScenario(defaultScenario);
      }

      console.log(`Successfully switched to template: ${templateName}`);
    } catch (error) {
      console.error("Failed to switch template:", error);
      // TODO: Add user notification for better UX
    }
  };

  // View mode switching handler
  const handleViewModeChange = (mode: "edit" | "instance") => {
    setViewMode(mode);
  };

  // Save template handler - saves to backend R2 storage
  const handleSaveTemplate = async () => {
    if (!selectedTemplateId || !workflow) return;

    try {
      console.log(`Saving template: ${selectedTemplateId}`, workflow);

      // Save to backend via API
      const response = await fetch(getApiUrl("/api/workflow/save"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflow,
          sessionId: selectedTemplateId, // Use template ID as session ID
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save workflow");
      }

      setHasUnsavedChanges(false);
      console.log(`Successfully saved template: ${selectedTemplateId}`, result);
    } catch (error) {
      console.error("Failed to save template:", error);
      throw error; // Re-throw so SaveTemplateButton can handle
    }
  };

  const handleItemSelect = (
    type: "goal" | "constraint" | "policy" | "task" | "form",
    id: string,
    parentGoalId?: string
  ) => {
    setSelectedItemType(type);
    setSelectedItemId(id);
    // Note: parentGoalId can be used in future for enhanced inspector context
  };

  // Handle workflow updates and mark as unsaved when in edit mode
  const handleWorkflowUpdate = (updatedWorkflow: WorkflowTemplateV2) => {
    setWorkflow(updatedWorkflow);

    // Mark as unsaved only in edit mode
    if (viewMode === "edit") {
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-neutral-950 overflow-hidden">
      <HasOpenAIKey />

      {/* Header - fixed at top, never hidden */}
      <header className="flex-shrink-0">
        <ErrorBoundary
          fallback={
            <div className="p-4 text-red-600">Template header error</div>
          }
        >
          <TemplateEditingHeader
            onTemplateChange={handleTemplateChange}
            onViewModeChange={handleViewModeChange}
            onSave={handleSaveTemplate}
          />
        </ErrorBoundary>
      </header>

      {/* Main content area - takes remaining space */}
      <main className="flex-1 relative overflow-y-auto">
        {/* Development Scenario Switcher - positioned relative to main content */}
        {viewMode === "instance" && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <ScenarioSwitcher />
          </div>
        )}

        {/* Three panel layout fills main content area */}
        <ThreePanelLayout
          leftPanel={
            <ChatPanel
              theme={theme}
              onThemeToggle={toggleTheme}
              workflow={workflow}
              selectedTemplateId={selectedTemplateId}
              onWorkflowUpdate={handleWorkflowUpdate}
              viewMode={viewMode}
            />
          }
          centerPanel={
            <WorkflowPanel
              workflow={workflow}
              workflowLoading={workflowLoading}
              workflowError={workflowError}
              selectedItemId={selectedItemId}
              selectedItemType={selectedItemType}
              onItemSelect={handleItemSelect}
            />
          }
          rightPanel={
            <InspectorPanel
              workflow={workflow}
              selectedItemId={selectedItemId}
              selectedItemType={selectedItemType}
            />
          }
        />
      </main>
    </div>
  );
}

function HasOpenAIKey() {
  const [hasOpenAiKey, setHasOpenAiKey] = useState<{ success: boolean } | null>(
    null
  );

  useEffect(() => {
    fetch("/check-open-ai-key")
      .then((res) => res.json())
      .then((data) => setHasOpenAiKey(data as { success: boolean }))
      .catch((error) => {
        console.error("Failed to check OpenAI key:", error);
        setHasOpenAiKey({ success: false });
      });
  }, []);

  if (!hasOpenAiKey) {
    return null;
  }

  if (!hasOpenAiKey.success) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500/10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-red-200 dark:border-red-900 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-labelledby="warningIcon"
                >
                  <title id="warningIcon">Warning Icon</title>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                  OpenAI API Key Not Configured
                </h3>
                <p className="text-neutral-600 dark:text-neutral-300 mb-1">
                  Requests to the API, including from the frontend UI, will not
                  work until an OpenAI API key is configured.
                </p>
                <p className="text-neutral-600 dark:text-neutral-300">
                  Please configure an OpenAI API key by setting a{" "}
                  <a
                    href="https://developers.cloudflare.com/workers/configuration/secrets/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 dark:text-red-400"
                  >
                    secret
                  </a>{" "}
                  named{" "}
                  <code className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-sm">
                    OPENAI_API_KEY
                  </code>
                  . <br />
                  You can also use a different model provider by following these{" "}
                  <a
                    href="https://github.com/cloudflare/agents-starter?tab=readme-ov-file#use-a-different-ai-model-provider"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 dark:text-red-400"
                  >
                    instructions.
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
