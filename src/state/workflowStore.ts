/**
 * Workflow Store Implementation
 *
 * Zustand + Immer based state management for workflow instances.
 * Provides normalized state storage for optimal React performance.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  WorkflowInstance,
  RuntimeEnvelope,
  ExecutionStatus,
  ExecutionScenario,
} from "@/types/workflow-instance";

// Store state interface
interface WorkflowStoreState {
  // Current active workflow instance
  activeInstance: WorkflowInstance | null;

  // Available development scenarios
  scenarios: ExecutionScenario[];
  currentScenario: string | null;

  // Actions
  setActiveInstance: (instance: WorkflowInstance) => void;
  clearActiveInstance: () => void;
  updateNode: (templateId: string, partial: Partial<RuntimeEnvelope>) => void;
  updateNodeStatus: (templateId: string, status: ExecutionStatus) => void;
  updateNodeContext: (templateId: string, context: Record<string, any>) => void;
  loadScenario: (scenario: ExecutionScenario) => void;
  setScenarios: (scenarios: ExecutionScenario[]) => void;
}

// Create the React Zustand store with Immer middleware for immutable updates
export const useWorkflowStore = create<WorkflowStoreState>()(
  immer((set, get) => ({
    activeInstance: null,
    scenarios: [],
    currentScenario: null,

    setActiveInstance: (instance: WorkflowInstance) => {
      set((state) => {
        state.activeInstance = {
          ...instance,
          updatedAt: new Date(),
        };
      });
    },

    clearActiveInstance: () => {
      set((state) => {
        state.activeInstance = null;
        state.currentScenario = null;
      });
    },

    updateNode: (templateId: string, partial: Partial<RuntimeEnvelope>) => {
      set((state) => {
        if (!state.activeInstance) {
          throw new Error("No active workflow instance");
        }

        const instanceId =
          state.activeInstance.templateToInstanceMap[templateId];
        if (!instanceId) {
          throw new Error(`Node with template ID '${templateId}' not found`);
        }

        const existingNode = state.activeInstance.nodeMap[instanceId];
        if (!existingNode) {
          throw new Error(`Instance with ID '${instanceId}' not found`);
        }

        // Update the node with partial data
        state.activeInstance.nodeMap[instanceId] = {
          ...existingNode,
          ...partial,
          updatedAt: new Date(),
        };

        // Update the workflow instance timestamp
        state.activeInstance.updatedAt = new Date();
      });
    },

    updateNodeStatus: (templateId: string, status: ExecutionStatus) => {
      get().updateNode(templateId, { status });
    },

    updateNodeContext: (templateId: string, context: Record<string, any>) => {
      get().updateNode(templateId, { ctx: context });
    },

    loadScenario: (scenario: ExecutionScenario) => {
      set((state) => {
        state.activeInstance = scenario.instance;
        state.currentScenario = scenario.name;
      });
    },

    setScenarios: (scenarios: ExecutionScenario[]) => {
      set((state) => {
        state.scenarios = scenarios;
      });
    },
  }))
);

// Convenience selectors for common use cases
export const getActiveInstance = () =>
  useWorkflowStore.getState().activeInstance;
export const getScenarios = () => useWorkflowStore.getState().scenarios;
export const getCurrentScenario = () =>
  useWorkflowStore.getState().currentScenario;
