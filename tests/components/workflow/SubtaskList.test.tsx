import { SubtaskList } from "@/components/workflow/SubtaskList";
import type { Subtask } from "@/types/workflow";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("SubtaskList", () => {
  const mockSubtasks: Subtask[] = [
    {
      subtaskId: "subtask-1",
      name: "Install IDE",
      description: "Install and configure development IDE",
      estimatedDuration: "30 minutes",
      required: true,
    },
    {
      subtaskId: "subtask-2",
      name: "Configure Git",
      description: "Setup Git configuration",
      estimatedDuration: "20 minutes",
      required: false,
    },
    {
      subtaskId: "subtask-3",
      name: "Setup Database",
      description: "Install and configure database",
      estimatedDuration: "45 minutes",
      required: true,
    },
  ];

  const mockProps = {
    subtasks: mockSubtasks,
    selectedSubtaskId: null,
    onSubtaskSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all subtasks", () => {
    render(<SubtaskList {...mockProps} />);

    expect(screen.getByText("Install IDE")).toBeInTheDocument();
    expect(screen.getByText("Configure Git")).toBeInTheDocument();
    expect(screen.getByText("Setup Database")).toBeInTheDocument();
  });

  it("shows required indicators for required subtasks", () => {
    render(<SubtaskList {...mockProps} />);

    const requiredElements = screen.getAllByText("Required");
    expect(requiredElements).toHaveLength(2);
  });

  it("calls onSubtaskSelect when subtask is clicked", () => {
    render(<SubtaskList {...mockProps} />);

    fireEvent.click(screen.getByText("Install IDE"));
    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-1");

    fireEvent.click(screen.getByText("Configure Git"));
    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-2");
  });

  it("applies selected styling to selected subtask", () => {
    render(<SubtaskList {...mockProps} selectedSubtaskId="subtask-2" />);

    const selectedSubtask = screen
      .getByText("Configure Git")
      .closest(".bg-blue-100");
    expect(selectedSubtask).toHaveClass("bg-blue-100");

    const unselectedSubtask = screen.getByText("Install IDE").closest("button");
    expect(unselectedSubtask).not.toHaveClass("bg-blue-100");
  });

  it("supports keyboard navigation", () => {
    render(<SubtaskList {...mockProps} />);

    const subtaskElements = screen.getAllByRole("button");
    expect(subtaskElements).toHaveLength(3);

    // Button elements are focusable by default and don't need tabIndex or role attributes
    for (const element of subtaskElements) {
      expect(element.tagName).toBe("BUTTON");
    }

    fireEvent.keyDown(subtaskElements[0], { key: "Enter" });
    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-1");

    fireEvent.keyDown(subtaskElements[1], { key: " " });
    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-2");
  });

  it("sets correct aria-pressed attribute", () => {
    render(<SubtaskList {...mockProps} selectedSubtaskId="subtask-1" />);

    const selectedElement = screen.getByText("Install IDE").closest("button");
    const unselectedElement = screen
      .getByText("Configure Git")
      .closest("button");

    expect(selectedElement).toHaveAttribute("aria-pressed", "true");
    expect(unselectedElement).toHaveAttribute("aria-pressed", "false");
  });

  it("renders empty list when no subtasks provided", () => {
    const { container } = render(<SubtaskList {...mockProps} subtasks={[]} />);

    const listContainer = container.querySelector(".space-y-1");
    expect(listContainer).toBeEmptyDOMElement();
  });

  it("calls stopPropagation when preventBubbling is true", () => {
    const mockStopPropagation = vi.fn();
    render(<SubtaskList {...mockProps} preventBubbling={true} />);

    const subtaskElement = screen.getByText("Install IDE");

    fireEvent.click(subtaskElement, {
      stopPropagation: mockStopPropagation,
    });

    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-1");
  });

  it("does not call stopPropagation when preventBubbling is false", () => {
    render(<SubtaskList {...mockProps} preventBubbling={false} />);

    fireEvent.click(screen.getByText("Install IDE"));

    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-1");
  });
});
