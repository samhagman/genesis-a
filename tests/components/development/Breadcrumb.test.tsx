/**
 * Breadcrumb Component Tests
 *
 * Tests for the V3 breadcrumb navigation component
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Breadcrumb } from "@/components/development/Breadcrumb";

// Mock the workflow store
const mockUseWorkflowStore = vi.fn();
vi.mock("@/state/workflowStore", () => ({
  useWorkflowStore: () => mockUseWorkflowStore(),
}));

describe("Breadcrumb", () => {
  const mockSetViewMode = vi.fn();

  const defaultStoreState = {
    selectedTemplateName: "Employee Onboarding Process",
    viewMode: "edit" as const,
    hasUnsavedChanges: false,
    setViewMode: mockSetViewMode,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkflowStore.mockReturnValue(defaultStoreState);
  });

  describe("No Template Selected", () => {
    it("should show no template selected message", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        selectedTemplateName: "",
      });

      render(<Breadcrumb />);

      expect(screen.getByText("No template selected")).toBeInTheDocument();
    });
  });

  describe("Template Name Display", () => {
    it("should display template name", () => {
      render(<Breadcrumb />);

      expect(
        screen.getByText("Employee Onboarding Process")
      ).toBeInTheDocument();
    });

    it("should show unsaved changes indicator", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        hasUnsavedChanges: true,
      });

      render(<Breadcrumb />);

      const indicator = screen.getByTitle("Unsaved changes");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("bg-orange-500");
    });

    it("should not show unsaved changes indicator when no changes", () => {
      render(<Breadcrumb />);

      expect(screen.queryByTitle("Unsaved changes")).not.toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    it("should show view instance link in edit mode", () => {
      render(<Breadcrumb />);

      expect(screen.getByText("view instance")).toBeInTheDocument();
      expect(screen.getByText("Edit Mode")).toBeInTheDocument();

      const viewModeIndicator =
        screen.getByText("Edit Mode").previousElementSibling;
      expect(viewModeIndicator).toHaveClass("bg-green-500");
    });

    it("should switch to instance mode when view instance clicked", () => {
      const onViewModeChange = vi.fn();
      render(<Breadcrumb onViewModeChange={onViewModeChange} />);

      const viewInstanceLink = screen.getByText("view instance");
      fireEvent.click(viewInstanceLink);

      expect(mockSetViewMode).toHaveBeenCalledWith("instance");
      expect(onViewModeChange).toHaveBeenCalledWith("instance");
    });
  });

  describe("Instance Mode", () => {
    it("should show back to edit link in instance mode", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        viewMode: "instance" as const,
      });

      render(<Breadcrumb />);

      expect(screen.getByText("back to edit")).toBeInTheDocument();
      expect(screen.getByText("Instance Preview")).toBeInTheDocument();

      const viewModeIndicator =
        screen.getByText("Instance Preview").previousElementSibling;
      expect(viewModeIndicator).toHaveClass("bg-blue-500");
    });

    it("should switch to edit mode when back to edit clicked", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        viewMode: "instance" as const,
      });

      const onViewModeChange = vi.fn();
      render(<Breadcrumb onViewModeChange={onViewModeChange} />);

      const backToEditLink = screen.getByText("back to edit");
      fireEvent.click(backToEditLink);

      expect(mockSetViewMode).toHaveBeenCalledWith("edit");
      expect(onViewModeChange).toHaveBeenCalledWith("edit");
    });
  });

  describe("Navigation Links", () => {
    it("should style navigation links correctly", () => {
      render(<Breadcrumb />);

      const viewInstanceLink = screen.getByText("view instance");
      expect(viewInstanceLink).toHaveClass("text-blue-600", "underline");
    });

    it("should have hover effects on navigation links", () => {
      render(<Breadcrumb />);

      const viewInstanceLink = screen.getByText("view instance");
      expect(viewInstanceLink).toHaveClass("hover:text-blue-700");
    });
  });

  describe("View Mode Indicator", () => {
    it("should show correct indicator for edit mode", () => {
      render(<Breadcrumb />);

      const indicator = screen.getByText("Edit Mode");
      expect(indicator).toBeInTheDocument();

      const dot = indicator.previousElementSibling;
      expect(dot).toHaveClass("bg-green-500", "rounded-full");
    });

    it("should show correct indicator for instance mode", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        viewMode: "instance" as const,
      });

      render(<Breadcrumb />);

      const indicator = screen.getByText("Instance Preview");
      expect(indicator).toBeInTheDocument();

      const dot = indicator.previousElementSibling;
      expect(dot).toHaveClass("bg-blue-500", "rounded-full");
    });
  });

  describe("Separator", () => {
    it("should display separator between template name and navigation", () => {
      render(<Breadcrumb />);

      expect(screen.getByText("|")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have clickable links with proper role", () => {
      render(<Breadcrumb />);

      const viewInstanceLink = screen.getByRole("button", {
        name: "view instance",
      });
      expect(viewInstanceLink).toBeInTheDocument();
    });

    it("should have accessible title attributes", () => {
      mockUseWorkflowStore.mockReturnValue({
        ...defaultStoreState,
        hasUnsavedChanges: true,
      });

      render(<Breadcrumb />);

      expect(screen.getByTitle("Unsaved changes")).toBeInTheDocument();
    });
  });
});
