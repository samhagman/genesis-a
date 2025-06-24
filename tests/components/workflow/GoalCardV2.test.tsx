import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GoalCardV2 } from "@/components/workflow/GoalCardV2";
import type { Goal } from "@/types/workflow-v2";

const mockGoal: Goal = {
  id: "test-goal",
  name: "Test Goal",
  description: "A test goal for collapsible sections",
  order: 1,
  constraints: [
    {
      id: "test-constraint",
      description: "Test constraint",
      type: "business_rule",
      enforcement: "block_progression",
    },
  ],
  policies: [
    {
      id: "test-policy",
      name: "Test Policy",
      if: { field: "test", operator: "==", value: "test" },
      then: { action: "test_action", params: {} },
    },
  ],
  tasks: [
    {
      id: "test-task",
      description: "Test task",
      assignee: { type: "human", role: "test_role" },
    },
  ],
  forms: [
    {
      id: "test-form",
      name: "Test Form",
      description: "Test form description",
      type: "structured",
    },
  ],
};

describe("GoalCardV2", () => {
  const mockOnGoalSelect = vi.fn();
  const mockOnSubitemSelect = vi.fn();

  it("renders goal with collapsible sections initially collapsed", () => {
    render(
      <GoalCardV2
        goal={mockGoal}
        isSelected={false}
        selectedSubitemId={null}
        selectedSubitemType={null}
        onGoalSelect={mockOnGoalSelect}
        onSubitemSelect={mockOnSubitemSelect}
      />
    );

    // Check that section headers are visible
    expect(screen.getByText("Constraints (1)")).toBeInTheDocument();
    expect(screen.getByText("Policies (1)")).toBeInTheDocument();
    expect(screen.getByText("Tasks (1)")).toBeInTheDocument();
    expect(screen.getByText("Forms (1)")).toBeInTheDocument();

    // Check that section content is initially hidden (collapsed)
    expect(screen.queryByText("Test constraint")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Policy")).not.toBeInTheDocument();
    expect(screen.queryByText("Test task")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Form")).not.toBeInTheDocument();
  });

  it("expands constraints section when clicked", () => {
    render(
      <GoalCardV2
        goal={mockGoal}
        isSelected={false}
        selectedSubitemId={null}
        selectedSubitemType={null}
        onGoalSelect={mockOnGoalSelect}
        onSubitemSelect={mockOnSubitemSelect}
      />
    );

    // Click the constraints section header
    const constraintsButton = screen
      .getByText("Constraints (1)")
      .closest("button");
    expect(constraintsButton).toBeInTheDocument();
    fireEvent.click(constraintsButton!);

    // Check that constraints content is now visible
    expect(screen.getByText("Test constraint")).toBeInTheDocument();
  });

  it("expands policies section when clicked", () => {
    render(
      <GoalCardV2
        goal={mockGoal}
        isSelected={false}
        selectedSubitemId={null}
        selectedSubitemType={null}
        onGoalSelect={mockOnGoalSelect}
        onSubitemSelect={mockOnSubitemSelect}
      />
    );

    // Click the policies section header
    const policiesButton = screen.getByText("Policies (1)").closest("button");
    expect(policiesButton).toBeInTheDocument();
    fireEvent.click(policiesButton!);

    // Check that policies content is now visible
    expect(screen.getByText("Test Policy")).toBeInTheDocument();
  });

  it("collapses section when clicked again", () => {
    render(
      <GoalCardV2
        goal={mockGoal}
        isSelected={false}
        selectedSubitemId={null}
        selectedSubitemType={null}
        onGoalSelect={mockOnGoalSelect}
        onSubitemSelect={mockOnSubitemSelect}
      />
    );

    // Click to expand constraints
    const constraintsButton = screen
      .getByText("Constraints (1)")
      .closest("button");
    fireEvent.click(constraintsButton!);
    expect(screen.getByText("Test constraint")).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(constraintsButton!);
    expect(screen.queryByText("Test constraint")).not.toBeInTheDocument();
  });

  it("shows count summaries correctly", () => {
    render(
      <GoalCardV2
        goal={mockGoal}
        isSelected={false}
        selectedSubitemId={null}
        selectedSubitemType={null}
        onGoalSelect={mockOnGoalSelect}
        onSubitemSelect={mockOnSubitemSelect}
      />
    );

    // Check the count summary boxes by looking for all "1" elements
    const countElements = screen.getAllByText("1");
    expect(countElements).toHaveLength(4); // One for each section: constraints, policies, tasks, forms

    // Check the labels are present
    expect(screen.getByText("Constraints")).toBeInTheDocument();
    expect(screen.getByText("Policies")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Forms")).toBeInTheDocument();
  });
});
