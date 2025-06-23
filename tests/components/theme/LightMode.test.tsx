import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ThreePanelLayout } from "@/components/layout/ThreePanelLayout";
import { WorkflowPanel } from "@/components/workflow/WorkflowPanel";
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

describe("Light Mode Styling", () => {
  it("applies light backgrounds to three panel layout", () => {
    const { container } = render(
      <div className="light">
        <ThreePanelLayout
          leftPanel={<div>Left Panel</div>}
          centerPanel={<div>Center Panel</div>}
          rightPanel={<div>Right Panel</div>}
        />
      </div>
    );

    // Check for layout structure classes
    const flexContainers = container.querySelectorAll(".flex");
    expect(flexContainers.length).toBeGreaterThan(0);

    // Check that panels have proper backgrounds
    const lightPanels = container.querySelectorAll(".bg-neutral-50");
    expect(lightPanels.length).toBeGreaterThan(0);

    // Check for white backgrounds
    const whiteBg = container.querySelectorAll(".bg-white");
    expect(whiteBg.length).toBeGreaterThan(0);
  });

  it("shows light mode card styling in workflow", () => {
    const { container } = render(
      <div className="light">
        <WorkflowPanel
          workflow={mockWorkflow}
          workflowLoading={false}
          workflowError={null}
          selectedItemId={null}
          selectedItemType={null}
          onItemSelect={() => {}}
        />
      </div>
    );

    // Check for goal card with light styling
    const goalCards = container.querySelectorAll(".border-neutral-200");
    expect(goalCards.length).toBeGreaterThan(0);

    // Check that workflow header exists
    expect(container.querySelector("h2")).toHaveTextContent("Test Workflow");
  });
});
