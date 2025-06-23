import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoalCard } from "@/components/workflow/GoalCard";
import type { Goal } from "@/types/workflow";

describe("GoalCard", () => {
  const mockGoal: Goal = {
    goalId: "goal-1",
    name: "Setup Development Environment",
    description: "Install necessary tools and configure workspace",
    icon: "🛠️",
    owner: "Tech Lead",
    estimatedDuration: "2 hours",
    subtasks: [
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
        description: "Setup Git configuration and SSH keys",
        estimatedDuration: "20 minutes",
        required: false,
      },
    ],
  };

  const mockProps = {
    goal: mockGoal,
    isSelected: false,
    selectedSubtaskId: null,
    onGoalSelect: vi.fn(),
    onSubtaskSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders goal information correctly", () => {
    render(<GoalCard {...mockProps} />);

    expect(
      screen.getByText("Setup Development Environment")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Install necessary tools and configure workspace")
    ).toBeInTheDocument();
    expect(screen.getByText("🛠️")).toBeInTheDocument();
    expect(screen.getByText("Owner: Tech Lead")).toBeInTheDocument();
    expect(screen.getByText("Duration: 2 hours")).toBeInTheDocument();
    expect(screen.getByText("2 subtasks")).toBeInTheDocument();
  });

  it("renders all subtasks", () => {
    render(<GoalCard {...mockProps} />);

    expect(screen.getByText("Install IDE")).toBeInTheDocument();
    expect(screen.getByText("Configure Git")).toBeInTheDocument();
  });

  it("shows required indicator for required subtasks", () => {
    render(<GoalCard {...mockProps} />);

    const requiredElements = screen.getAllByText("Required");
    expect(requiredElements).toHaveLength(1);
  });

  it("calls onGoalSelect when goal card is clicked", () => {
    render(<GoalCard {...mockProps} />);

    fireEvent.click(screen.getByText("Setup Development Environment"));
    expect(mockProps.onGoalSelect).toHaveBeenCalledWith("goal-1");
  });

  it("calls onSubtaskSelect when subtask is clicked", () => {
    render(<GoalCard {...mockProps} />);

    fireEvent.click(screen.getByText("Install IDE"));
    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-1");
  });

  it("applies selected styling when goal is selected", () => {
    render(<GoalCard {...mockProps} isSelected={true} />);

    const card = screen
      .getByText("Setup Development Environment")
      .closest(".border-2");
    expect(card).toHaveClass("border-blue-500", "bg-blue-50");
  });

  it("applies selected styling when subtask is selected", () => {
    render(<GoalCard {...mockProps} selectedSubtaskId="subtask-1" />);

    const subtask = screen.getByText("Install IDE").closest(".bg-blue-100");
    expect(subtask).toHaveClass("bg-blue-100");
  });

  it("supports keyboard navigation for subtasks", () => {
    render(<GoalCard {...mockProps} />);

    const subtaskElement = screen.getByText("Install IDE").closest("button");
    expect(subtaskElement).toBeTruthy();
    expect(subtaskElement?.tagName).toBe("BUTTON");

    fireEvent.keyDown(subtaskElement!, { key: "Enter" });
    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-1");

    fireEvent.keyDown(subtaskElement!, { key: " " });
    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-1");
  });

  it("stops event propagation when subtask is clicked", () => {
    render(<GoalCard {...mockProps} />);

    const subtaskElement = screen.getByText("Install IDE");
    const stopPropagationSpy = vi.fn();

    fireEvent.click(subtaskElement, {
      stopPropagation: stopPropagationSpy,
    });

    expect(mockProps.onSubtaskSelect).toHaveBeenCalledWith("subtask-1");
  });
});
