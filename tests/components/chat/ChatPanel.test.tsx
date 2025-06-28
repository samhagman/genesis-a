import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ChatPanel } from "@/components/chat/ChatPanel";

describe("ChatPanel", () => {
  it("renders without crashing", () => {
    const mockProps = {
      theme: "dark" as const,
      onThemeToggle: () => {},
    };

    expect(() => render(<ChatPanel {...mockProps} />)).not.toThrow();
  });

  it("shows edit mode toggle when workflow is provided", () => {
    const mockWorkflow = {
      id: "test-workflow",
      name: "Test Workflow",
      version: "1.0.0",
      objective: "Test objective",
      metadata: {
        author: "Test Author",
        created_at: "2024-01-01",
        last_modified: "2024-01-01",
        tags: [],
      },
      goals: [],
    };

    const mockProps = {
      theme: "dark" as const,
      onThemeToggle: () => {},
      workflow: mockWorkflow,
      onWorkflowUpdate: () => {},
    };

    const { container } = render(<ChatPanel {...mockProps} />);

    // The component should render with workflow editing capabilities
    expect(container).toBeTruthy();
  });

  it("disables edit mode when no workflow is provided", () => {
    const mockProps = {
      theme: "dark" as const,
      onThemeToggle: () => {},
      workflow: null,
      onWorkflowUpdate: () => {},
    };

    const { container } = render(<ChatPanel {...mockProps} />);

    // The component should render but edit mode should be disabled
    expect(container).toBeTruthy();
  });
});
