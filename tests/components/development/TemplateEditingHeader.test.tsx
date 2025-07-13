/**
 * Template Editing Header Component Tests
 *
 * Tests for the template editing header component that combines
 * template selector, breadcrumb navigation, and save functionality.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateEditingHeader } from "@/components/development/TemplateEditingHeader";
import { useWorkflowStore } from "@/state/workflowStore";

// Mock the workflow store
vi.mock("@/state/workflowStore");

// Mock child components to focus on the header logic
vi.mock("@/components/development/TemplateSelector", () => ({
  TemplateSelector: ({
    onTemplateChange,
  }: {
    onTemplateChange?: (templateId: string, templateName: string) => void;
  }) => (
    <div data-testid="template-selector">
      Template Selector Mock
      <button onClick={() => onTemplateChange?.("test-id", "Test Template")}>
        Mock Change
      </button>
    </div>
  ),
}));

vi.mock("@/components/development/Breadcrumb", () => ({
  Breadcrumb: ({
    onViewModeChange,
  }: {
    onViewModeChange?: (mode: "edit" | "instance") => void;
  }) => (
    <div data-testid="breadcrumb">
      Breadcrumb Mock
      <button onClick={() => onViewModeChange?.("instance")}>
        Mock View Change
      </button>
    </div>
  ),
}));

vi.mock("@/components/development/SaveTemplateButton", () => ({
  SaveTemplateButton: ({ onSave }: { onSave?: () => void | Promise<void> }) => (
    <div data-testid="save-button">
      Save Button Mock
      <button onClick={onSave}>Mock Save</button>
    </div>
  ),
}));

const mockUseWorkflowStore = vi.mocked(useWorkflowStore);

describe("TemplateEditingHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUseWorkflowStore.mockReturnValue({
      viewMode: "edit",
      // Add other required store properties as needed
      availableTemplates: [],
      selectedTemplateId: "instawork-shift-filling",
      selectedTemplateName: "InstaWork Shift Filling",
      hasUnsavedChanges: false,
      templateLoading: false,
      setSelectedTemplate: vi.fn(),
      setViewMode: vi.fn(),
      setHasUnsavedChanges: vi.fn(),
      setTemplateLoading: vi.fn(),
      loadAvailableTemplates: vi.fn(),
      setAvailableTemplates: vi.fn(),
      activeInstance: null,
      scenarios: [],
      currentScenario: null,
      setActiveInstance: vi.fn(),
      clearActiveInstance: vi.fn(),
      updateNode: vi.fn(),
      updateNodeStatus: vi.fn(),
      updateNodeContext: vi.fn(),
      loadScenario: vi.fn(),
      setScenarios: vi.fn(),
    });
  });

  describe("Render Logic", () => {
    it("should render when viewMode is properly initialized", () => {
      render(<TemplateEditingHeader />);

      expect(screen.getByTestId("template-selector")).toBeInTheDocument();
      expect(screen.getByTestId("breadcrumb")).toBeInTheDocument();
    });

    it("should not render when viewMode is undefined", () => {
      mockUseWorkflowStore.mockReturnValue({
        viewMode: undefined as unknown as "edit" | "instance",
        // Add other required store properties
        availableTemplates: [],
        selectedTemplateId: "instawork-shift-filling",
        selectedTemplateName: "InstaWork Shift Filling",
        hasUnsavedChanges: false,
        templateLoading: false,
        setSelectedTemplate: vi.fn(),
        setViewMode: vi.fn(),
        setHasUnsavedChanges: vi.fn(),
        setTemplateLoading: vi.fn(),
        loadAvailableTemplates: vi.fn(),
        setAvailableTemplates: vi.fn(),
        activeInstance: null,
        scenarios: [],
        currentScenario: null,
        setActiveInstance: vi.fn(),
        clearActiveInstance: vi.fn(),
        updateNode: vi.fn(),
        updateNodeStatus: vi.fn(),
        updateNodeContext: vi.fn(),
        loadScenario: vi.fn(),
        setScenarios: vi.fn(),
      });

      const { container } = render(<TemplateEditingHeader />);
      expect(container.firstChild).toBeNull();
    });

    it("should show save button only in edit mode", () => {
      render(<TemplateEditingHeader />);
      expect(screen.getByTestId("save-button")).toBeInTheDocument();
    });

    it("should not show save button in instance mode", () => {
      mockUseWorkflowStore.mockReturnValue({
        viewMode: "instance",
        // Add other required store properties
        availableTemplates: [],
        selectedTemplateId: "instawork-shift-filling",
        selectedTemplateName: "InstaWork Shift Filling",
        hasUnsavedChanges: false,
        templateLoading: false,
        setSelectedTemplate: vi.fn(),
        setViewMode: vi.fn(),
        setHasUnsavedChanges: vi.fn(),
        setTemplateLoading: vi.fn(),
        loadAvailableTemplates: vi.fn(),
        setAvailableTemplates: vi.fn(),
        activeInstance: null,
        scenarios: [],
        currentScenario: null,
        setActiveInstance: vi.fn(),
        clearActiveInstance: vi.fn(),
        updateNode: vi.fn(),
        updateNodeStatus: vi.fn(),
        updateNodeContext: vi.fn(),
        loadScenario: vi.fn(),
        setScenarios: vi.fn(),
      });

      render(<TemplateEditingHeader />);
      expect(screen.queryByTestId("save-button")).not.toBeInTheDocument();
    });
  });

  describe("State Consistency", () => {
    it("should render with consistent initial state", () => {
      // This test validates that the component can render with the fixed initial state
      // where selectedTemplateId matches the default workflow loaded in App.tsx
      mockUseWorkflowStore.mockReturnValue({
        viewMode: "edit",
        availableTemplates: [],
        selectedTemplateId: "instawork-shift-filling", // Fixed to match App.tsx default
        selectedTemplateName: "InstaWork Shift Filling", // Fixed to match App.tsx default
        hasUnsavedChanges: false,
        templateLoading: false,
        setSelectedTemplate: vi.fn(),
        setViewMode: vi.fn(),
        setHasUnsavedChanges: vi.fn(),
        setTemplateLoading: vi.fn(),
        loadAvailableTemplates: vi.fn(),
        setAvailableTemplates: vi.fn(),
        activeInstance: null,
        scenarios: [],
        currentScenario: null,
        setActiveInstance: vi.fn(),
        clearActiveInstance: vi.fn(),
        updateNode: vi.fn(),
        updateNodeStatus: vi.fn(),
        updateNodeContext: vi.fn(),
        loadScenario: vi.fn(),
        setScenarios: vi.fn(),
      });

      expect(() => render(<TemplateEditingHeader />)).not.toThrow();
      expect(screen.getByTestId("template-selector")).toBeInTheDocument();
      expect(screen.getByTestId("breadcrumb")).toBeInTheDocument();
    });
  });
});
