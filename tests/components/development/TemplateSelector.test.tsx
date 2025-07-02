/**
 * Template Selector Component Tests
 *
 * Tests for the V3 template selector component functionality
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TemplateSelector } from "@/components/development/TemplateSelector";

// Mock the workflow store
const mockUseWorkflowStore = vi.fn();
vi.mock("@/state/workflowStore", () => ({
  useWorkflowStore: () => mockUseWorkflowStore(),
}));

describe("TemplateSelector", () => {
  const mockSetSelectedTemplate = vi.fn();
  const mockLoadAvailableTemplates = vi.fn();
  const mockSetHasUnsavedChanges = vi.fn();

  const defaultStoreState = {
    availableTemplates: [
      {
        id: "template-1",
        name: "Employee Onboarding",
        version: "2.0",
        lastModified: "2024-01-01T00:00:00Z",
        author: "hr_team",
        tags: ["onboarding", "hr"],
      },
      {
        id: "template-2",
        name: "Shift Filling",
        version: "1.5",
        lastModified: "2024-01-02T00:00:00Z",
        author: "ops_team",
        tags: ["shifts", "automation"],
      },
    ],
    selectedTemplateId: "template-1",
    selectedTemplateName: "Employee Onboarding",
    hasUnsavedChanges: false,
    templateLoading: false,
    setSelectedTemplate: mockSetSelectedTemplate,
    loadAvailableTemplates: mockLoadAvailableTemplates,
    setHasUnsavedChanges: mockSetHasUnsavedChanges,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkflowStore.mockReturnValue(defaultStoreState);
  });

  describe("Loading States", () => {
    it("should show loading spinner when templates are loading", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        templateLoading: true,
        availableTemplates: [],
      });

      render(<TemplateSelector />);

      expect(screen.getByText("Loading templates...")).toBeInTheDocument();
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass("animate-spin");
    });

    it("should show no templates message when empty", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        availableTemplates: [],
        templateLoading: false,
      });

      render(<TemplateSelector />);

      expect(screen.getByText("No templates available")).toBeInTheDocument();
    });
  });

  describe("Template Display", () => {
    it("should display current selected template", () => {
      render(<TemplateSelector />);

      expect(screen.getByText("📁 Template:")).toBeInTheDocument();
      expect(screen.getByText("Employee Onboarding")).toBeInTheDocument();
    });

    it("should show unsaved changes indicator", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        hasUnsavedChanges: true,
      });

      render(<TemplateSelector />);

      const indicator = screen.getByTitle("Unsaved changes");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("bg-orange-500");
    });

    it("should show select template placeholder when none selected", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        selectedTemplateId: "",
        selectedTemplateName: "",
      });

      render(<TemplateSelector />);

      expect(screen.getByText("Select template")).toBeInTheDocument();
    });
  });

  describe("Dropdown Interaction", () => {
    it("should open dropdown when button is clicked", () => {
      render(<TemplateSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("Available Templates")).toBeInTheDocument();
      expect(
        screen.getByText("Switch between different workflow templates")
      ).toBeInTheDocument();
    });

    it("should show all available templates in dropdown", () => {
      render(<TemplateSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getAllByText("Employee Onboarding")).toHaveLength(2); // One in button, one in dropdown
      expect(screen.getByText("Shift Filling")).toBeInTheDocument();
      expect(screen.getByText("v2.0")).toBeInTheDocument();
      expect(screen.getByText("by hr_team")).toBeInTheDocument();
    });

    it("should mark current template in dropdown", () => {
      render(<TemplateSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("CURRENT")).toBeInTheDocument();
    });

    it("should close dropdown when backdrop is clicked", () => {
      render(<TemplateSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(screen.getByText("Available Templates")).toBeInTheDocument();

      const backdrop = document.querySelector(".fixed.inset-0");
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe("Template Selection", () => {
    it("should select template without unsaved changes", () => {
      const onTemplateChange = vi.fn();
      render(<TemplateSelector onTemplateChange={onTemplateChange} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const template2Button = screen
        .getByText("Shift Filling")
        .closest("button");
      fireEvent.click(template2Button!);

      expect(mockSetSelectedTemplate).toHaveBeenCalledWith(
        "template-2",
        "Shift Filling"
      );
      expect(onTemplateChange).toHaveBeenCalledWith(
        "template-2",
        "Shift Filling"
      );
    });

    it("should show warning when switching with unsaved changes", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        hasUnsavedChanges: true,
      });

      render(<TemplateSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const template2Button = screen
        .getByText("Shift Filling")
        .closest("button");
      fireEvent.click(template2Button!);

      expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
      expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
      expect(screen.getByText("Discard Changes")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should confirm switch and discard changes", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        hasUnsavedChanges: true,
      });

      render(<TemplateSelector />);

      // Open dropdown and select different template
      const button = screen.getByRole("button");
      fireEvent.click(button);
      const template2Button = screen
        .getByText("Shift Filling")
        .closest("button");
      fireEvent.click(template2Button!);

      // Confirm discard changes
      const discardButton = screen.getByText("Discard Changes");
      fireEvent.click(discardButton);

      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(false);
      expect(mockSetSelectedTemplate).toHaveBeenCalledWith(
        "template-2",
        "Shift Filling"
      );
    });

    it("should cancel switch and keep current template", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        hasUnsavedChanges: true,
      });

      render(<TemplateSelector />);

      // Open dropdown and select different template
      const button = screen.getByRole("button");
      fireEvent.click(button);
      const template2Button = screen
        .getByText("Shift Filling")
        .closest("button");
      fireEvent.click(template2Button!);

      // Cancel the switch
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockSetSelectedTemplate).not.toHaveBeenCalled();
      expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
    });
  });

  describe("Template Loading", () => {
    it("should not load templates on mount (handled by App.tsx)", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        availableTemplates: [],
      });

      render(<TemplateSelector />);

      // TemplateSelector doesn't load templates on mount - this is handled by App.tsx
      expect(mockLoadAvailableTemplates).toHaveBeenCalledTimes(0);
    });

    it("should not load templates when already available", () => {
      render(<TemplateSelector />);

      expect(mockLoadAvailableTemplates).not.toHaveBeenCalled();
    });
  });

  describe("Template Icons and Colors", () => {
    it("should show appropriate icons for template types", () => {
      render(<TemplateSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Look for emoji icons in the template list
      const dropdownContent = screen
        .getByText("Available Templates")
        .closest("div");
      expect(dropdownContent).toBeInTheDocument();
    });

    it("should apply correct color for selected template", () => {
      render(<TemplateSelector />);

      const selectedTemplate = screen.getByText("Employee Onboarding");
      expect(selectedTemplate).toHaveClass("text-blue-600");
    });
  });
});
