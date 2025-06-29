import { InspectorPanel } from "@/components/inspector/InspectorPanel";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const mockWorkflow: WorkflowTemplateV2 = {
  id: "test-workflow",
  name: "Test Workflow",
  version: "1.0",
  objective: "A test workflow",
  metadata: {
    author: "test",
    created_at: "2024-01-01T00:00:00Z",
    last_modified: "2024-01-01T00:00:00Z",
    tags: ["test"],
  },
  goals: [
    {
      id: "goal-1",
      name: "Test Goal",
      description: "A test goal",
      order: 1,
      constraints: [
        {
          id: "constraint-1",
          description: "Test constraint",
          type: "time_limit",
          enforcement: "hard_stop",
          value: 30,
        },
      ],
      policies: [
        {
          id: "policy-1",
          name: "Test Policy",
          if: { field: "test", operator: "==", value: "test" },
          then: { action: "test_action", params: {} },
        },
      ],
      tasks: [
        {
          id: "task-1",
          description: "Test task",
          assignee: { type: "human", role: "test_role" },
        },
      ],
      forms: [
        {
          id: "form-1",
          name: "Test Form",
          description: "Test form description",
          type: "structured",
        },
      ],
    },
  ],
};

describe("InspectorPanel", () => {
  it("renders loading state when workflow is null", () => {
    render(
      <InspectorPanel
        workflow={null}
        selectedItemId={null}
        selectedItemType={null}
      />
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByText("Loading workflow data")).toBeInTheDocument();
    expect(screen.getByText("⏳")).toBeInTheDocument();
  });

  it("renders workflow overview when nothing is selected", () => {
    render(
      <InspectorPanel
        workflow={mockWorkflow}
        selectedItemId={null}
        selectedItemType={null}
      />
    );

    expect(screen.getByText("Test Workflow")).toBeInTheDocument();
    expect(screen.getByText("A test workflow")).toBeInTheDocument();
  });

  it("renders goal inspector when goal is selected", () => {
    render(
      <InspectorPanel
        workflow={mockWorkflow}
        selectedItemId="goal-1"
        selectedItemType="goal"
      />
    );

    // Check for V2 goal-specific content
    expect(screen.getByText("Goal 1: Test Goal")).toBeInTheDocument();
    expect(screen.getByText("ID: goal-1")).toBeInTheDocument();
    expect(screen.getByText("A test goal")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("renders constraint inspector when constraint is selected", () => {
    render(
      <InspectorPanel
        workflow={mockWorkflow}
        selectedItemId="constraint-1"
        selectedItemType="constraint"
      />
    );

    // Check for V2 constraint-specific content
    expect(screen.getByText("TIME LIMIT Constraint")).toBeInTheDocument();
    expect(screen.getByText("ID: constraint-1")).toBeInTheDocument();
    expect(screen.getByText("Test constraint")).toBeInTheDocument();
    expect(screen.getByText("HARD STOP")).toBeInTheDocument();
  });

  it("renders task inspector when task is selected", () => {
    render(
      <InspectorPanel
        workflow={mockWorkflow}
        selectedItemId="task-1"
        selectedItemType="task"
      />
    );

    // Check for V2 task-specific content
    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.getByText("ID: task-1")).toBeInTheDocument();
    expect(screen.getByText("Test task")).toBeInTheDocument();
    expect(screen.getByText("HUMAN")).toBeInTheDocument();
  });

  it("renders policy inspector when policy is selected", () => {
    render(
      <InspectorPanel
        workflow={mockWorkflow}
        selectedItemId="policy-1"
        selectedItemType="policy"
      />
    );

    // Check for V2 policy-specific content
    expect(screen.getByText("Test Policy")).toBeInTheDocument();
    expect(screen.getByText("ID: policy-1")).toBeInTheDocument();
    expect(screen.getByText("IF Condition")).toBeInTheDocument();
    expect(screen.getByText("THEN Action")).toBeInTheDocument();
  });

  it("renders form inspector when form is selected", () => {
    render(
      <InspectorPanel
        workflow={mockWorkflow}
        selectedItemId="form-1"
        selectedItemType="form"
      />
    );

    // Check for V2 form-specific content
    expect(screen.getByText("Test Form")).toBeInTheDocument();
    expect(screen.getByText("ID: form-1")).toBeInTheDocument();
    expect(screen.getByText("Test form description")).toBeInTheDocument();
    expect(screen.getByText("STRUCTURED")).toBeInTheDocument();
  });
});
