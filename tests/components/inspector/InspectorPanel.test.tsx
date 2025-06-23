import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InspectorPanel } from "@/components/inspector/InspectorPanel";
import type { WorkflowTemplate } from "@/types/workflow";

const mockWorkflow: WorkflowTemplate = {
  templateId: "test-workflow",
  name: "Test Workflow",
  description: "A test workflow",
  version: "1.0",
  goals: [
    {
      goalId: "goal-1",
      name: "Test Goal",
      description: "A test goal",
      icon: "🎯",
      owner: "Test Owner",
      estimatedDuration: "1 hour",
      subtasks: [
        {
          subtaskId: "subtask-1",
          name: "Test Subtask",
          description: "A test subtask",
          estimatedDuration: "30 minutes",
          required: true,
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

    // Check for goal-specific content that's only in GoalInspector
    expect(screen.getByText("Goal Details")).toBeInTheDocument();
    expect(screen.getByText("Subtask Summary")).toBeInTheDocument();
    // Check that workflow overview is NOT shown when goal is selected
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("renders subtask inspector when subtask is selected", () => {
    render(
      <InspectorPanel
        workflow={mockWorkflow}
        selectedItemId="subtask-1"
        selectedItemType="subtask"
      />
    );

    // Check for subtask-specific content that's only in SubtaskInspector
    expect(screen.getByText("Test Subtask")).toBeInTheDocument();
    expect(screen.getByText("A test subtask")).toBeInTheDocument();
    expect(screen.getByText("Parent Goal")).toBeInTheDocument();
    expect(screen.getByText("Workflow Context")).toBeInTheDocument();
  });
});
