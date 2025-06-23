import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WorkflowPanel } from "@/components/workflow/WorkflowPanel";

describe("WorkflowPanel", () => {
  const baseMockProps = {
    selectedItemId: null,
    selectedItemType: null as "goal" | "subtask" | null,
    onItemSelect: () => {},
  };

  it("renders loading state when workflowLoading is true", () => {
    const mockProps = {
      ...baseMockProps,
      workflow: null,
      workflowLoading: true,
      workflowError: null,
    };

    render(<WorkflowPanel {...mockProps} />);

    expect(screen.getByText("Loading workflow...")).toBeInTheDocument();
    expect(screen.getByText("⏳")).toBeInTheDocument();
  });

  it("renders error state when workflowError is present", () => {
    const mockProps = {
      ...baseMockProps,
      workflow: null,
      workflowLoading: false,
      workflowError: "Failed to load workflow",
    };

    render(<WorkflowPanel {...mockProps} />);

    expect(screen.getByText("Error Loading Workflow")).toBeInTheDocument();
    expect(screen.getByText("Failed to load workflow")).toBeInTheDocument();
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  it("renders no workflow found when workflow is null", () => {
    const mockProps = {
      ...baseMockProps,
      workflow: null,
      workflowLoading: false,
      workflowError: null,
    };

    render(<WorkflowPanel {...mockProps} />);

    expect(screen.getByText("No workflow found")).toBeInTheDocument();
    expect(screen.getByText("📋")).toBeInTheDocument();
  });

  it("applies correct styling for loading state", () => {
    const mockProps = {
      ...baseMockProps,
      workflow: null,
      workflowLoading: true,
      workflowError: null,
    };

    const { container } = render(<WorkflowPanel {...mockProps} />);

    const workflowContainer = container.firstChild as HTMLElement;
    expect(workflowContainer).toHaveClass(
      "h-full",
      "flex",
      "items-center",
      "justify-center",
      "p-8"
    );
  });
});
