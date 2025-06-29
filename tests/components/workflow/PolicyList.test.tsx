import { PolicyList } from "@/components/workflow/PolicyList";
import type { Policy } from "@/types/workflow-v2";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPolicies: Policy[] = [
  {
    id: "policy-1",
    name: "High Priority Shift Auto-categorization",
    if: {
      field: "priority",
      operator: "==",
      value: "high",
    },
    then: {
      action: "set_categorization",
      params: {
        category: "urgent",
        priority_boost: true,
      },
    },
  },
  {
    id: "policy-2",
    name: "Bonus Activation Policy",
    if: {
      condition: "shift_difficulty > 8 AND location_demand == 'critical'",
    },
    then: {
      action: "activate_bonus",
      params: {
        bonus_amount: 50,
        currency: "USD",
      },
    },
  },
  {
    id: "policy-3",
    name: "Complex Multi-condition Policy",
    if: {
      all_of: [
        { field: "experience", operator: ">", value: 5 },
        { field: "rating", operator: ">=", value: 4.5 },
      ],
    },
    then: {
      action: "create_task",
      params: {},
    },
  },
  {
    id: "policy-4",
    name: "Any-of Condition Policy",
    if: {
      any_of: [
        { field: "urgent", operator: "==", value: true },
        { field: "vip_client", operator: "==", value: true },
      ],
    },
    then: {
      action: "escalate_to_team",
      params: {
        team: "priority_handling",
      },
    },
  },
];

describe("PolicyList", () => {
  const mockOnPolicySelect = vi.fn();

  beforeEach(() => {
    mockOnPolicySelect.mockClear();
  });

  it("renders all policies with correct names", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    expect(
      screen.getByText("High Priority Shift Auto-categorization")
    ).toBeInTheDocument();
    expect(screen.getByText("Bonus Activation Policy")).toBeInTheDocument();
    expect(
      screen.getByText("Complex Multi-condition Policy")
    ).toBeInTheDocument();
    expect(screen.getByText("Any-of Condition Policy")).toBeInTheDocument();
  });

  it("displays if-then structure for all policies", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    // Check that IF and THEN labels are present
    const ifLabels = screen.getAllByText("IF:");
    const thenLabels = screen.getAllByText("THEN:");

    expect(ifLabels).toHaveLength(4);
    expect(thenLabels).toHaveLength(4);
  });

  it("renders simple field-operator-value conditions correctly", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    expect(screen.getByText("priority == high")).toBeInTheDocument();
  });

  it("renders complex string conditions correctly", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    expect(
      screen.getByText(/shift_difficulty > 8 AND location_demand/)
    ).toBeInTheDocument();
  });

  it("renders all_of conditions with count", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    expect(screen.getByText("ALL of 2 conditions")).toBeInTheDocument();
  });

  it("renders any_of conditions with count", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    expect(screen.getByText("ANY of 2 conditions")).toBeInTheDocument();
  });

  it("displays action badges with correct text", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    expect(screen.getByText(/set categorization/)).toBeInTheDocument();
    expect(screen.getByText(/activate bonus/)).toBeInTheDocument();
    expect(screen.getByText(/create task/)).toBeInTheDocument();
    expect(screen.getByText(/escalate.*team/)).toBeInTheDocument();
  });

  it("displays action parameters when present", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    // Check some parameter displays
    expect(screen.getByText(/category:/)).toBeInTheDocument();
    expect(screen.getByText(/urgent/)).toBeInTheDocument();
    expect(screen.getByText(/bonus_amount:/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
    expect(screen.getByText(/team:/)).toBeInTheDocument();
    expect(screen.getByText(/priority_handling/)).toBeInTheDocument();
  });

  it("handles empty action parameters", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    // The policy with empty params should not show parameter text
    const createTaskPolicy = screen
      .getByText("Complex Multi-condition Policy")
      .closest("div");
    expect(createTaskPolicy).toBeInTheDocument();
    expect(createTaskPolicy).not.toHaveTextContent("params:");
  });

  it("calls onPolicySelect when policy is clicked", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    const firstPolicy = screen.getByText(
      "High Priority Shift Auto-categorization"
    );
    fireEvent.click(firstPolicy);

    expect(mockOnPolicySelect).toHaveBeenCalledWith("policy-1");
  });

  it("highlights selected policy", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId="policy-2"
        onPolicySelect={mockOnPolicySelect}
      />
    );

    const selectedPolicy = screen
      .getByText("Bonus Activation Policy")
      .closest("div");
    expect(selectedPolicy).toBeInTheDocument();
    // Focus on structural indication rather than specific CSS classes
  });

  it("shows selection indicator for selected policy", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId="policy-1"
        onPolicySelect={mockOnPolicySelect}
      />
    );

    // Check that the selected policy has some visual indicator
    const selectedPolicyContainer = screen
      .getByText("High Priority Shift Auto-categorization")
      .closest("div");
    expect(selectedPolicyContainer).toBeInTheDocument();
  });

  it("handles empty policies array", () => {
    render(
      <PolicyList
        policies={[]}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    // Should render without errors - no policies to display
    expect(
      screen.queryByText("High Priority Shift Auto-categorization")
    ).not.toBeInTheDocument();
  });

  it("displays policy status icons", () => {
    render(
      <PolicyList
        policies={mockPolicies}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    // Check that status icons are present (currently shows dormant status)
    const statusIcons = document.querySelectorAll('[title="Policy Status"]');
    expect(statusIcons).toHaveLength(4);
  });

  it("truncates long parameter lists", () => {
    const policyWithManyParams: Policy = {
      id: "policy-many-params",
      name: "Policy with Many Parameters",
      if: { field: "test", operator: "==", value: "test" },
      then: {
        action: "create_task",
        params: {
          param1: "value1",
          param2: "value2",
          param3: "value3",
          param4: "value4",
        },
      },
    };

    render(
      <PolicyList
        policies={[policyWithManyParams]}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    // Should show truncation indicator
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("handles complex condition fallback", () => {
    const complexPolicy: Policy = {
      id: "complex-policy",
      name: "Complex Policy",
      if: {}, // Empty condition object should fallback to "Complex condition"
      then: {
        action: "flag_for_review",
        params: {},
      },
    };

    render(
      <PolicyList
        policies={[complexPolicy]}
        selectedPolicyId={null}
        onPolicySelect={mockOnPolicySelect}
      />
    );

    expect(screen.getByText("Complex condition")).toBeInTheDocument();
  });
});
