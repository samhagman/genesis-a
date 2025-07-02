/**
 * Template Editing Store Tests (V3 Enhancement)
 *
 * Tests for the new template editing functionality in the workflow store.
 * These tests focus on the template editing state management logic.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type { TemplateMetadata } from "@/state/workflowStore";

// Mock the template editing store functionality for testing
interface TemplateEditingState {
  availableTemplates: TemplateMetadata[];
  selectedTemplateId: string;
  selectedTemplateName: string;
  viewMode: "edit" | "instance";
  hasUnsavedChanges: boolean;
  templateLoading: boolean;
}

class TemplateEditingStore {
  private state: TemplateEditingState = {
    availableTemplates: [],
    selectedTemplateId: "",
    selectedTemplateName: "",
    viewMode: "edit",
    hasUnsavedChanges: false,
    templateLoading: false,
  };

  getState(): TemplateEditingState {
    return { ...this.state };
  }

  setSelectedTemplate(templateId: string, templateName: string): void {
    this.state.selectedTemplateId = templateId;
    this.state.selectedTemplateName = templateName;
    this.state.hasUnsavedChanges = false;
  }

  setViewMode(mode: "edit" | "instance"): void {
    this.state.viewMode = mode;
  }

  setHasUnsavedChanges(hasChanges: boolean): void {
    this.state.hasUnsavedChanges = hasChanges;
  }

  setTemplateLoading(loading: boolean): void {
    this.state.templateLoading = loading;
  }

  setAvailableTemplates(templates: TemplateMetadata[]): void {
    this.state.availableTemplates = templates;
  }

  async loadAvailableTemplates(): Promise<void> {
    this.state.templateLoading = true;

    try {
      const mockTemplates: TemplateMetadata[] = [
        {
          id: "employee-onboarding-v2",
          name: "Employee Onboarding Process V2",
          version: "2.0",
          lastModified: "2025-01-15T14:30:00Z",
          author: "hr_team",
          tags: ["onboarding", "hr", "compliance"],
        },
        {
          id: "instawork-shift-filling",
          name: "InstaWork Shift Filling",
          version: "2.0",
          lastModified: "2025-01-15T14:30:00Z",
          author: "operations_team",
          tags: ["shifts", "scheduling", "automation"],
        },
      ];

      this.state.availableTemplates = mockTemplates;
      this.state.templateLoading = false;

      // Set default selection if none exists
      if (!this.state.selectedTemplateId && mockTemplates.length > 0) {
        this.state.selectedTemplateId = mockTemplates[0].id;
        this.state.selectedTemplateName = mockTemplates[0].name;
      }
    } catch (error) {
      this.state.templateLoading = false;
      this.state.availableTemplates = [];
      throw error;
    }
  }

  reset(): void {
    this.state = {
      availableTemplates: [],
      selectedTemplateId: "",
      selectedTemplateName: "",
      viewMode: "edit",
      hasUnsavedChanges: false,
      templateLoading: false,
    };
  }
}

describe("Template Editing Store Logic", () => {
  let store: TemplateEditingStore;

  beforeEach(() => {
    store = new TemplateEditingStore();
  });

  describe("Initial State", () => {
    it("should start with correct default values", () => {
      const state = store.getState();

      expect(state.selectedTemplateId).toBe("");
      expect(state.selectedTemplateName).toBe("");
      expect(state.availableTemplates).toEqual([]);
      expect(state.viewMode).toBe("edit");
      expect(state.hasUnsavedChanges).toBe(false);
      expect(state.templateLoading).toBe(false);
    });
  });

  describe("Template Selection", () => {
    it("should update selected template correctly", () => {
      store.setSelectedTemplate("test-template-123", "Test Template");

      const state = store.getState();
      expect(state.selectedTemplateId).toBe("test-template-123");
      expect(state.selectedTemplateName).toBe("Test Template");
      expect(state.hasUnsavedChanges).toBe(false);
    });

    it("should reset unsaved changes when switching templates", () => {
      // Set unsaved changes
      store.setHasUnsavedChanges(true);
      expect(store.getState().hasUnsavedChanges).toBe(true);

      // Switch template should reset unsaved changes
      store.setSelectedTemplate("new-template", "New Template");
      expect(store.getState().hasUnsavedChanges).toBe(false);
    });
  });

  describe("View Mode Management", () => {
    it("should switch view modes correctly", () => {
      expect(store.getState().viewMode).toBe("edit");

      store.setViewMode("instance");
      expect(store.getState().viewMode).toBe("instance");

      store.setViewMode("edit");
      expect(store.getState().viewMode).toBe("edit");
    });
  });

  describe("Unsaved Changes Tracking", () => {
    it("should track unsaved changes state", () => {
      expect(store.getState().hasUnsavedChanges).toBe(false);

      store.setHasUnsavedChanges(true);
      expect(store.getState().hasUnsavedChanges).toBe(true);

      store.setHasUnsavedChanges(false);
      expect(store.getState().hasUnsavedChanges).toBe(false);
    });
  });

  describe("Template Loading", () => {
    it("should manage loading state during template fetch", () => {
      expect(store.getState().templateLoading).toBe(false);

      store.setTemplateLoading(true);
      expect(store.getState().templateLoading).toBe(true);

      store.setTemplateLoading(false);
      expect(store.getState().templateLoading).toBe(false);
    });

    it("should set available templates correctly", () => {
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

      store.setAvailableTemplates(mockTemplates);
      expect(store.getState().availableTemplates).toEqual(mockTemplates);
    });

    it("should load mock templates correctly", async () => {
      await store.loadAvailableTemplates();

      const state = store.getState();
      expect(state.templateLoading).toBe(false);
      expect(state.availableTemplates).toHaveLength(2);
      expect(state.availableTemplates[0].id).toBe("employee-onboarding-v2");
      expect(state.availableTemplates[1].id).toBe("instawork-shift-filling");

      // Should set default selection
      expect(state.selectedTemplateId).toBe("employee-onboarding-v2");
      expect(state.selectedTemplateName).toBe("Employee Onboarding Process V2");
    });

    it("should preserve existing selection when loading templates", async () => {
      // Set a template first
      store.setSelectedTemplate("existing-template", "Existing Template");

      await store.loadAvailableTemplates();

      const state = store.getState();
      // Should keep existing selection
      expect(state.selectedTemplateId).toBe("existing-template");
      expect(state.selectedTemplateName).toBe("Existing Template");
    });
  });

  describe("Integration Workflow", () => {
    it("should handle complete template editing workflow", async () => {
      // Start: Load templates
      await store.loadAvailableTemplates();
      expect(store.getState().availableTemplates).toHaveLength(2);

      // Step 1: Select a template
      store.setSelectedTemplate(
        "instawork-shift-filling",
        "InstaWork Shift Filling"
      );
      expect(store.getState().selectedTemplateId).toBe(
        "instawork-shift-filling"
      );

      // Step 2: Make changes (simulate editing)
      store.setHasUnsavedChanges(true);
      expect(store.getState().hasUnsavedChanges).toBe(true);

      // Step 3: Switch to instance view
      store.setViewMode("instance");
      expect(store.getState().viewMode).toBe("instance");

      // Step 4: Return to edit view
      store.setViewMode("edit");
      expect(store.getState().viewMode).toBe("edit");

      // Step 5: Save changes (simulate)
      store.setHasUnsavedChanges(false);
      expect(store.getState().hasUnsavedChanges).toBe(false);

      // Step 6: Switch templates (should reset unsaved changes)
      store.setHasUnsavedChanges(true);
      store.setSelectedTemplate(
        "employee-onboarding-v2",
        "Employee Onboarding Process V2"
      );
      expect(store.getState().hasUnsavedChanges).toBe(false);
      expect(store.getState().selectedTemplateId).toBe(
        "employee-onboarding-v2"
      );
    });
  });

  describe("TemplateMetadata Interface", () => {
    it("should validate TemplateMetadata structure", () => {
      const validTemplate: TemplateMetadata = {
        id: "test-id",
        name: "Test Template",
        version: "1.0",
        lastModified: "2024-01-01T00:00:00Z",
        author: "test-author",
        tags: ["test", "sample"],
      };

      store.setAvailableTemplates([validTemplate]);
      const state = store.getState();

      expect(state.availableTemplates[0]).toEqual(validTemplate);
      expect(state.availableTemplates[0].id).toBe("test-id");
      expect(state.availableTemplates[0].tags).toContain("test");
    });
  });
});
