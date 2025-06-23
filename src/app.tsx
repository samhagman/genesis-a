import { useEffect, useState, use } from "react";

// Component imports
import { ThreePanelLayout } from "@/components/layout/ThreePanelLayout";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { WorkflowPanel } from "@/components/workflow/WorkflowPanel";
import { InspectorPanel } from "@/components/inspector/InspectorPanel";

// Types and utilities
import type { WorkflowTemplate } from "@/types/workflow";
import { loadWorkflowTemplate } from "@/workflows";

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    // Check localStorage first, default to dark if not found
    const savedTheme = localStorage.getItem("theme");
    return (savedTheme as "dark" | "light") || "dark";
  });

  // Workflow selection state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<
    "goal" | "subtask" | null
  >(null);

  // Workflow data state
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

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
        const workflowData = await loadWorkflowTemplate("employee-onboarding");
        setWorkflow(workflowData);
      } catch (err) {
        setWorkflowError(
          err instanceof Error ? err.message : "Failed to load workflow"
        );
      } finally {
        setWorkflowLoading(false);
      }
    }

    loadWorkflow();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const handleItemSelect = (type: "goal" | "subtask", id: string) => {
    setSelectedItemType(type);
    setSelectedItemId(id);
  };

  return (
    <div className="h-screen w-full bg-white dark:bg-neutral-950 overflow-hidden">
      <HasOpenAIKey />
      <ThreePanelLayout
        leftPanel={<ChatPanel theme={theme} onThemeToggle={toggleTheme} />}
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
    </div>
  );
}

const hasOpenAiKeyPromise = fetch("/check-open-ai-key").then((res) =>
  res.json<{ success: boolean }>()
);

function HasOpenAIKey() {
  const hasOpenAiKey = use(hasOpenAiKeyPromise);

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
