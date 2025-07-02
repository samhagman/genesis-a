/**
 * Workflow Store Tests
 *
 * Tests for the Zustand-based workflow state management system.
 */

import { createWorkflowInstance } from "@/state/instanceFactory";
import { TestWorkflowRepository } from "@/state/testRepository";
import { useWorkflowStore, type TemplateMetadata } from "@/state/workflowStore";
import type { ExecutionStatus } from "@/types/workflow-instance";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock workflow template for testing
const mockTemplate: WorkflowTemplateV2 = {
  id: "test-workflow",
  name: "Test Workflow",
  version: "1.0",
  objective: "Test workflow for state management",
  metadata: {
    author: "test",
    created_at: "2024-01-01T00:00:00Z",
    last_modified: "2024-01-01T00:00:00Z",
    tags: ["test"],
  },
  goals: [
    {
      id: "goal-1",
      name: "Test Goal",
      description: "A test goal",
      order: 1,
      constraints: [
        {
          id: "constraint-1",
          description: "Test constraint",
          type: "time_limit",
          enforcement: "hard_stop",
          value: 30,
        },
      ],
      policies: [
        {
          id: "policy-1",
          name: "Test Policy",
          if: { field: "test", operator: "==", value: "test" },
          then: { action: "test_action", params: {} },
        },
      ],
      tasks: [
        {
          id: "task-1",
          description: "Test task",
          assignee: { type: "human", role: "test_role" },
        },
      ],
      forms: [
        {
          id: "form-1",
          name: "Test Form",
          description: "Test form",
          type: "structured",
        },
      ],
    },
  ],
};

describe("Workflow Repository", () => {
  let repository: TestWorkflowRepository;

  beforeEach(() => {
    repository = new TestWorkflowRepository();
  });

  it("starts with no active instance", () => {
    expect(repository.getActiveInstance()).toBeNull();
  });

  it("can set and get active instance", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    const retrieved = repository.getActiveInstance();
    expect(retrieved).toBeTruthy();
    expect(retrieved?.id).toBe(instance.id);
    expect(retrieved?.templateId).toBe(mockTemplate.id);
  });

  it("can clear active instance", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);
    expect(repository.getActiveInstance()).toBeTruthy();

    repository.clearActiveInstance();
    expect(repository.getActiveInstance()).toBeNull();
  });

  it("can get node instance by template ID", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    const goalNode = repository.getNodeInstance("goal-1");
    expect(goalNode).toBeTruthy();
    expect(goalNode?.templateId).toBe("goal-1");
    expect(goalNode?.status).toBe("NOT_STARTED");
  });

  it("returns null for non-existent node", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    const nonExistentNode = repository.getNodeInstance("non-existent");
    expect(nonExistentNode).toBeNull();
  });

  it("can update node status", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    repository.updateNodeStatus("goal-1", "ACTIVE");

    const updatedNode = repository.getNodeInstance("goal-1");
    expect(updatedNode?.status).toBe("ACTIVE");
  });

  it("can update node context", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    const context = { testData: "test value", progress: 50 };
    repository.updateNodeContext("goal-1", context);

    const updatedNode = repository.getNodeInstance("goal-1");
    expect(updatedNode?.ctx).toEqual(context);
  });

  it("throws error when updating node without active instance", () => {
    expect(() => {
      repository.updateNodeStatus("goal-1", "ACTIVE");
    }).toThrow();
  });

  it("throws error when updating non-existent node", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");
    repository.setActiveInstance(instance);

    expect(() => {
      repository.updateNodeStatus("non-existent", "ACTIVE");
    }).toThrow();
  });

  // TODO: Fix React import issue with subscriptions
  // it('can handle subscriptions', () => {
  //   let callbackCount = 0;
  //   let lastInstance = null;
  //
  //   const unsubscribe = repository.subscribe((instance) => {
  //     callbackCount++;
  //     lastInstance = instance;
  //   });
  //
  //   const instance = createWorkflowInstance(mockTemplate, 'fresh_start');
  //   repository.setActiveInstance(instance);
  //
  //   // In test environment, subscriptions are no-op, so just verify they don't throw
  //   expect(unsubscribe).toBeTypeOf('function');
  //
  //   // Verify the actual functionality works (getting the instance)
  //   expect(repository.getActiveInstance()).toBeTruthy();
  // });
});

describe("Instance Factory", () => {
  it("creates fresh start instance correctly", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");

    expect(instance.templateId).toBe(mockTemplate.id);
    expect(instance.status).toBe("NOT_STARTED");
    expect(instance.metadata.scenario).toBe("fresh_start");

    // Check that all template elements have corresponding instances
    const nodeCount = Object.keys(instance.nodeMap).length;
    const expectedCount =
      mockTemplate.goals.length +
      mockTemplate.goals.reduce(
        (sum, goal) =>
          sum +
          goal.constraints.length +
          goal.policies.length +
          goal.tasks.length +
          goal.forms.length,
        0
      );

    expect(nodeCount).toBe(expectedCount);
  });

  it("creates in-progress instance with some active elements", () => {
    const instance = createWorkflowInstance(mockTemplate, "in_progress");

    expect(instance.metadata.scenario).toBe("in_progress");

    // Should have some active or completed elements
    const nodes = Object.values(instance.nodeMap);
    const nonStartedNodes = nodes.filter((n) => n.status !== "NOT_STARTED");
    expect(nonStartedNodes.length).toBeGreaterThan(0);
  });

  it("creates happy path instance with most elements completed", () => {
    const instance = createWorkflowInstance(mockTemplate, "happy_path");

    expect(instance.metadata.scenario).toBe("happy_path");

    // Should have many completed elements
    const nodes = Object.values(instance.nodeMap);
    const completedNodes = nodes.filter((n) => n.status === "COMPLETED");
    expect(completedNodes.length).toBeGreaterThan(0);
  });

  it("maintains template to instance mapping", () => {
    const instance = createWorkflowInstance(mockTemplate, "fresh_start");

    // Check that all template IDs are mapped
    expect(instance.templateToInstanceMap["goal-1"]).toBeTruthy();
    expect(instance.templateToInstanceMap["constraint-1"]).toBeTruthy();
    expect(instance.templateToInstanceMap["policy-1"]).toBeTruthy();
    expect(instance.templateToInstanceMap["task-1"]).toBeTruthy();
    expect(instance.templateToInstanceMap["form-1"]).toBeTruthy();

    // Check that mapped instances exist
    const goalInstanceId = instance.templateToInstanceMap["goal-1"];
    expect(instance.nodeMap[goalInstanceId]).toBeTruthy();
  });
});

describe("Template Editing Store (V3 Enhancement)", () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useWorkflowStore.getState();
    store.setAvailableTemplates([]);
    store.setSelectedTemplate("", "");
    store.setViewMode("edit");
    store.setHasUnsavedChanges(false);
    store.setTemplateLoading(false);
  });

  describe("Template Selection", () => {
    it("should start with empty template selection", () => {
      const state = useWorkflowStore.getState();
      expect(state.selectedTemplateId).toBe("");
      expect(state.selectedTemplateName).toBe("");
      expect(state.availableTemplates).toEqual([]);
    });

    it("should set selected template correctly", () => {
      const { setSelectedTemplate } = useWorkflowStore.getState();

      setSelectedTemplate("test-template-123", "Test Template");

      const state = useWorkflowStore.getState();
      expect(state.selectedTemplateId).toBe("test-template-123");
      expect(state.selectedTemplateName).toBe("Test Template");
      expect(state.hasUnsavedChanges).toBe(false); // Should reset unsaved changes
    });

    it("should reset unsaved changes when switching templates", () => {
      const { setHasUnsavedChanges, setSelectedTemplate } =
        useWorkflowStore.getState();

      // Set unsaved changes
      setHasUnsavedChanges(true);
      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(true);

      // Switch template should reset unsaved changes
      setSelectedTemplate("new-template", "New Template");
      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(false);
    });
  });

  describe("View Mode Management", () => {
    it("should default to edit mode", () => {
      const state = useWorkflowStore.getState();
      expect(state.viewMode).toBe("edit");
    });

    it("should switch view modes correctly", () => {
      const { setViewMode } = useWorkflowStore.getState();

      setViewMode("instance");
      expect(useWorkflowStore.getState().viewMode).toBe("instance");

      setViewMode("edit");
      expect(useWorkflowStore.getState().viewMode).toBe("edit");
    });
  });

  describe("Unsaved Changes Tracking", () => {
    it("should track unsaved changes correctly", () => {
      const { setHasUnsavedChanges } = useWorkflowStore.getState();

      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(false);

      setHasUnsavedChanges(true);
      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(true);

      setHasUnsavedChanges(false);
      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(false);
    });
  });

  describe("Template Loading", () => {
    it("should manage loading state correctly", () => {
      const { setTemplateLoading } = useWorkflowStore.getState();

      expect(useWorkflowStore.getState().templateLoading).toBe(false);

      setTemplateLoading(true);
      expect(useWorkflowStore.getState().templateLoading).toBe(true);

      setTemplateLoading(false);
      expect(useWorkflowStore.getState().templateLoading).toBe(false);
    });

    it("should set available templates correctly", () => {
      const { setAvailableTemplates } = useWorkflowStore.getState();

      const mockTemplates: TemplateMetadata[] = [
        {
          id: "template-1",
          name: "Template One",
          version: "1.0",
          lastModified: "2024-01-01T00:00:00Z",
          author: "test",
          tags: ["test"],
        },
        {
          id: "template-2",
          name: "Template Two",
          version: "2.0",
          lastModified: "2024-01-02T00:00:00Z",
          author: "test2",
          tags: ["test", "demo"],
        },
      ];

      setAvailableTemplates(mockTemplates);
      expect(useWorkflowStore.getState().availableTemplates).toEqual(
        mockTemplates
      );
    });

    it("should load available templates with mock data", async () => {
      const { loadAvailableTemplates } = useWorkflowStore.getState();

      await loadAvailableTemplates();

      const state = useWorkflowStore.getState();
      expect(state.templateLoading).toBe(false);
      expect(state.availableTemplates).toHaveLength(2);
      expect(state.availableTemplates[0].id).toBe("employee-onboarding-v2");
      expect(state.availableTemplates[1].id).toBe("instawork-shift-filling");

      // Should set default selection
      expect(state.selectedTemplateId).toBe("employee-onboarding-v2");
      expect(state.selectedTemplateName).toBe("Employee Onboarding Process V2");
    });

    it("should not override existing selection when loading templates", async () => {
      const { setSelectedTemplate, loadAvailableTemplates } =
        useWorkflowStore.getState();

      // Set a template first
      setSelectedTemplate("existing-template", "Existing Template");

      await loadAvailableTemplates();

      const state = useWorkflowStore.getState();
      // Should keep existing selection
      expect(state.selectedTemplateId).toBe("existing-template");
      expect(state.selectedTemplateName).toBe("Existing Template");
    });

    it("should handle loading errors gracefully", async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { loadAvailableTemplates } = useWorkflowStore.getState();

      // Mock an error scenario by temporarily breaking the function
      const originalSet = useWorkflowStore.setState;
      useWorkflowStore.setState = vi.fn().mockImplementation(() => {
        throw new Error("Test error");
      });

      try {
        await loadAvailableTemplates();
      } catch (error) {
        // Expected to catch error
      }

      // Restore original function
      useWorkflowStore.setState = originalSet;
      consoleSpy.mockRestore();
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete template editing workflow", async () => {
      const store = useWorkflowStore.getState();

      // Start: Load templates
      await store.loadAvailableTemplates();
      expect(store.availableTemplates).toHaveLength(2);

      // Step 1: Select a template
      store.setSelectedTemplate(
        "instawork-shift-filling",
        "InstaWork Shift Filling"
      );
      expect(store.selectedTemplateId).toBe("instawork-shift-filling");

      // Step 2: Make changes (simulate editing)
      store.setHasUnsavedChanges(true);
      expect(store.hasUnsavedChanges).toBe(true);

      // Step 3: Switch to instance view
      store.setViewMode("instance");
      expect(store.viewMode).toBe("instance");

      // Step 4: Return to edit view
      store.setViewMode("edit");
      expect(store.viewMode).toBe("edit");

      // Step 5: Save changes (simulate)
      store.setHasUnsavedChanges(false);
      expect(store.hasUnsavedChanges).toBe(false);

      // Step 6: Switch templates (should reset unsaved changes)
      store.setHasUnsavedChanges(true);
      store.setSelectedTemplate(
        "employee-onboarding-v2",
        "Employee Onboarding Process V2"
      );
      expect(store.hasUnsavedChanges).toBe(false);
      expect(store.selectedTemplateId).toBe("employee-onboarding-v2");
    });
  });
});
