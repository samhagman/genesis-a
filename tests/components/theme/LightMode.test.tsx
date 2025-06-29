import { InspectorPanel } from "@/components/inspector/InspectorPanel";
import { ThreePanelLayout } from "@/components/layout/ThreePanelLayout";
import { WorkflowPanel } from "@/components/workflow/WorkflowPanel";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import { render } from "@testing-library/react";
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
      constraints: [],
      policies: [],
      tasks: [],
      forms: [],
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
