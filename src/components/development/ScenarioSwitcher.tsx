/**
 * Scenario Switcher Component
 *
 * Development tool for switching between different workflow execution scenarios.
 * Allows testing various execution states without implementing actual execution logic.
 */

import { useWorkflowScenarios, useWorkflowStats } from "@/state/hooks";
import { useState } from "react";

interface ScenarioSwitcherProps {
  className?: string;
}

export function ScenarioSwitcher({ className = "" }: ScenarioSwitcherProps) {
  const { scenarios, currentScenario, loadScenario } = useWorkflowScenarios();
  const [isOpen, setIsOpen] = useState(false);
  const stats = useWorkflowStats();

  const getScenarioIcon = (scenarioName: string) => {
    switch (scenarioName) {
      case "fresh_start":
        return "🆕";
      case "in_progress":
        return "⚡";
      case "happy_path":
        return "✅";
      case "blocked_constraint":
        return "🚫";
      case "failed_task":
        return "❌";
      case "policy_triggered":
        return "⚡";
      case "form_partial":
        return "📝";
      case "timeout_scenario":
        return "⏰";
      default:
        return "📋";
    }
  };

  const getScenarioColor = (scenarioName: string) => {
    switch (scenarioName) {
      case "fresh_start":
        return "text-neutral-600 dark:text-neutral-400";
      case "in_progress":
        return "text-blue-600 dark:text-blue-400";
      case "happy_path":
        return "text-green-600 dark:text-green-400";
      case "blocked_constraint":
        return "text-red-600 dark:text-red-400";
      case "failed_task":
        return "text-red-600 dark:text-red-400";
      case "policy_triggered":
        return "text-purple-600 dark:text-purple-400";
      case "form_partial":
        return "text-orange-600 dark:text-orange-400";
      case "timeout_scenario":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-neutral-600 dark:text-neutral-400";
    }
  };

  if (scenarios.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Scenario Display + Dropdown Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700"
      >
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          🎭 Scenario:
        </span>
        <span
          className={`text-sm font-semibold ${getScenarioColor(currentScenario || "")}`}
        >
          {getScenarioIcon(currentScenario || "")} {currentScenario || "None"}
        </span>
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

      {/* Workflow Stats */}
      <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
        Progress: {stats.progressPercent}% • Active: {stats.activeNodes} •
        Completed: {stats.completedNodes}
        {stats.failedNodes > 0 && (
          <span className="text-red-500"> • Failed: {stats.failedNodes}</span>
        )}
      </div>

      {/* Scenario Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Development Scenarios
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Switch between different workflow execution states
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {scenarios.map((scenario) => (
              <button
                type="button"
                key={scenario.name}
                onClick={() => {
                  loadScenario(scenario);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 transition-colors ${
                  currentScenario === scenario.name
                    ? "bg-blue-50 dark:bg-blue-950"
                    : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">
                    {getScenarioIcon(scenario.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${getScenarioColor(scenario.name)}`}
                      >
                        {scenario.name
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      {currentScenario === scenario.name && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {scenario.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              💡 <strong>Tip:</strong> Scenarios help test different execution
              states without implementing actual execution logic.
            </p>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
