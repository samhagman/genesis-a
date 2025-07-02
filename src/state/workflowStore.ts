/**
 * Workflow Store Implementation
 *
 * Zustand + Immer based state management for workflow instances.
 * Provides normalized state storage for optimal React performance.
 */

import type {
  ExecutionScenario,
  ExecutionStatus,
  RuntimeEnvelope,
  WorkflowInstance,
} from "@/types/workflow-instance";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// Template metadata for the template selector dropdown
export interface TemplateMetadata {
  id: string;
  name: string;
  version: string;
  lastModified: string;
  author: string;
  tags: string[];
}

// Store state interface
interface WorkflowStoreState {
  // Current active workflow instance
  activeInstance: WorkflowInstance | null;

  // Available development scenarios (for instance preview)
  scenarios: ExecutionScenario[];
  currentScenario: string | null;

  // New template editing state (V3 enhancement)
  availableTemplates: TemplateMetadata[];
  selectedTemplateId: string;
  selectedTemplateName: string;
  viewMode: "edit" | "instance";
  hasUnsavedChanges: boolean;
  templateLoading: boolean;

  // Existing actions
  setActiveInstance: (instance: WorkflowInstance) => void;
  clearActiveInstance: () => void;
  updateNode: (templateId: string, partial: Partial<RuntimeEnvelope>) => void;
  updateNodeStatus: (templateId: string, status: ExecutionStatus) => void;
  updateNodeContext: (
    templateId: string,
    context: Record<string, unknown>
  ) => void;
  loadScenario: (scenario: ExecutionScenario) => void;
  setScenarios: (scenarios: ExecutionScenario[]) => void;

  // New template editing actions (V3 enhancement)
  setSelectedTemplate: (templateId: string, templateName: string) => void;
  setViewMode: (mode: "edit" | "instance") => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setTemplateLoading: (loading: boolean) => void;
  loadAvailableTemplates: () => Promise<void>;
  setAvailableTemplates: (templates: TemplateMetadata[]) => void;
}

// Create the React Zustand store with Immer middleware for immutable updates
export const useWorkflowStore = create<WorkflowStoreState>()(
  immer((set, get) => ({
    // Existing state
    activeInstance: null,
    scenarios: [],
    currentScenario: null,

    // New template editing state (V3)
    availableTemplates: [],
    selectedTemplateId: "instawork-shift-filling",
    selectedTemplateName: "InstaWork Shift Filling",
    viewMode: "edit" as const,
    hasUnsavedChanges: false,
    templateLoading: false,

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

    updateNodeContext: (
      templateId: string,
      context: Record<string, unknown>
    ) => {
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

    // New template editing actions (V3 enhancement)
    setSelectedTemplate: (templateId: string, templateName: string) => {
      set((state) => {
        state.selectedTemplateId = templateId;
        state.selectedTemplateName = templateName;
        // Reset unsaved changes when switching templates
        state.hasUnsavedChanges = false;
      });
    },

    setViewMode: (mode: "edit" | "instance") => {
      set((state) => {
        state.viewMode = mode;
      });
    },

    setHasUnsavedChanges: (hasChanges: boolean) => {
      set((state) => {
        state.hasUnsavedChanges = hasChanges;
      });
    },

    setTemplateLoading: (loading: boolean) => {
      set((state) => {
        state.templateLoading = loading;
      });
    },

    setAvailableTemplates: (templates: TemplateMetadata[]) => {
      set((state) => {
        state.availableTemplates = templates;
      });
    },

    loadAvailableTemplates: async () => {
      set((state) => {
        state.templateLoading = true;
      });

      try {
        // For MVP, we'll use hardcoded templates based on existing workflow files
        // In production, this would fetch from an API endpoint
        const mockTemplates: TemplateMetadata[] = [
          {
            id: "instawork-shift-filling",
            name: "InstaWork Shift Filling",
            version: "2.0",
            lastModified: "2025-01-15T14:30:00Z",
            author: "operations_team",
            tags: ["shifts", "scheduling", "automation"],
          },
          {
            id: "employee-onboarding",
            name: "Employee Onboarding Process V2",
            version: "2.0",
            lastModified: "2025-01-15T14:30:00Z",
            author: "hr_team",
            tags: ["onboarding", "hr", "compliance"],
          },
        ];

        set((state) => {
          state.availableTemplates = mockTemplates;
          state.templateLoading = false;

          // Comment out automatic template selection to debug infinite loop
          // Set default selection if none exists
          // if (!state.selectedTemplateId && mockTemplates.length > 0) {
          //   state.selectedTemplateId = mockTemplates[0].id;
          //   state.selectedTemplateName = mockTemplates[0].name;
          // }
        });
      } catch (error) {
        console.error("Failed to load available templates:", error);
        set((state) => {
          state.templateLoading = false;
          state.availableTemplates = [];
        });
      }
    },
  }))
);

// Convenience selectors for common use cases
export const getActiveInstance = () =>
  useWorkflowStore.getState().activeInstance;
export const getScenarios = () => useWorkflowStore.getState().scenarios;
export const getCurrentScenario = () =>
  useWorkflowStore.getState().currentScenario;

// New template editing selectors (V3)
export const getAvailableTemplates = () =>
  useWorkflowStore.getState().availableTemplates;
export const getSelectedTemplateId = () =>
  useWorkflowStore.getState().selectedTemplateId;
export const getSelectedTemplateName = () =>
  useWorkflowStore.getState().selectedTemplateName;
export const getViewMode = () => useWorkflowStore.getState().viewMode;
export const getHasUnsavedChanges = () =>
  useWorkflowStore.getState().hasUnsavedChanges;
export const getTemplateLoading = () =>
  useWorkflowStore.getState().templateLoading;
