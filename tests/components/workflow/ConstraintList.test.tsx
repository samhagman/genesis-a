import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConstraintList } from "@/components/workflow/ConstraintList";
import type { Constraint } from "@/types/workflow-v2";

const mockConstraints: Constraint[] = [
  {
    id: "constraint-1",
    description: "Maximum 30 minutes per shift fill",
    type: "time_limit",
    enforcement: "hard_stop",
    value: 30,
    unit: "minutes",
  },
  {
    id: "constraint-2",
    description: "Must validate worker eligibility",
    type: "data_validation",
    enforcement: "block_progression",
    required_fields: ["worker_id", "certification"],
  },
  {
    id: "constraint-3",
    description: "No more than 5 notifications per worker per day",
    type: "rate_limit",
    enforcement: "warn",
    limit: 5,
  },
];

describe("ConstraintList", () => {
  const mockOnConstraintSelect = vi.fn();

  beforeEach(() => {
    mockOnConstraintSelect.mockClear();
  });

  it("renders all constraints with correct descriptions", () => {
    render(
      <ConstraintList
        constraints={mockConstraints}
        selectedConstraintId={null}
        onConstraintSelect={mockOnConstraintSelect}
      />
    );

    expect(
      screen.getByText("Maximum 30 minutes per shift fill")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Must validate worker eligibility")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No more than 5 notifications per worker per day")
    ).toBeInTheDocument();
  });

  it("displays correct type icons for different constraint types", () => {
    render(
      <ConstraintList
        constraints={mockConstraints}
        selectedConstraintId={null}
        onConstraintSelect={mockOnConstraintSelect}
      />
    );

    // Check that type badges are displayed
    expect(screen.getByText("time limit")).toBeInTheDocument();
    expect(screen.getByText("data validation")).toBeInTheDocument();
    expect(screen.getByText("rate limit")).toBeInTheDocument();
  });

  it("displays constraint values when present", () => {
    render(
      <ConstraintList
        constraints={mockConstraints}
        selectedConstraintId={null}
        onConstraintSelect={mockOnConstraintSelect}
      />
    );

    // Check that values are displayed
    expect(screen.getByText(/Value: 30 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/Value: 5/)).toBeInTheDocument();
  });

  it("calls onConstraintSelect when constraint is clicked", () => {
    render(
      <ConstraintList
        constraints={mockConstraints}
        selectedConstraintId={null}
        onConstraintSelect={mockOnConstraintSelect}
      />
    );

    const firstConstraint = screen.getByText(
      "Maximum 30 minutes per shift fill"
    );
    fireEvent.click(firstConstraint);

    expect(mockOnConstraintSelect).toHaveBeenCalledWith("constraint-1");
  });

  it("highlights selected constraint", () => {
    render(
      <ConstraintList
        constraints={mockConstraints}
        selectedConstraintId="constraint-2"
        onConstraintSelect={mockOnConstraintSelect}
      />
    );

    const selectedConstraint = screen
      .getByText("Must validate worker eligibility")
      .closest('[class*="border-red-400"]');
    expect(selectedConstraint).toHaveClass("border-red-400", "bg-red-100");
  });

  it("shows selection indicator for selected constraint", () => {
    render(
      <ConstraintList
        constraints={mockConstraints}
        selectedConstraintId="constraint-1"
        onConstraintSelect={mockOnConstraintSelect}
      />
    );

    // Find the selection indicator (red dot)
    const selectionIndicator = document.querySelector(
      ".bg-red-500.rounded-full"
    );
    expect(selectionIndicator).toBeInTheDocument();
  });

  it("handles empty constraints array", () => {
    render(
      <ConstraintList
        constraints={[]}
        selectedConstraintId={null}
        onConstraintSelect={mockOnConstraintSelect}
      />
    );

    // Should render without errors - no constraints to display
    expect(
      screen.queryByText("Maximum 30 minutes per shift fill")
    ).not.toBeInTheDocument();
  });

  it("handles complex constraint values", () => {
    const complexConstraint: Constraint = {
      id: "complex-constraint",
      description: "Complex business rule",
      type: "business_rule",
      enforcement: "require_approval",
      value: { nested: { rule: "complex" }, array: [1, 2, 3] },
    };

    render(
      <ConstraintList
        constraints={[complexConstraint]}
        selectedConstraintId={null}
        onConstraintSelect={mockOnConstraintSelect}
      />
    );

    expect(screen.getByText("Complex business rule")).toBeInTheDocument();
    expect(screen.getByText(/Value: \{.*\}/)).toBeInTheDocument(); // JSON stringified object with Value: prefix
  });

  it("displays correct enforcement indicators", () => {
    render(
      <ConstraintList
        constraints={mockConstraints}
        selectedConstraintId={null}
        onConstraintSelect={mockOnConstraintSelect}
      />
    );

    // Check that enforcement types are indicated in tooltips
    const enforcementIcon = screen.getByTitle("Enforcement: hard_stop");
    expect(enforcementIcon).toBeInTheDocument();
  });
});
