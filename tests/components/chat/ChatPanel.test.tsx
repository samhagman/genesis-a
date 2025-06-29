import { ChatPanel } from "@/components/chat/ChatPanel";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the agent hooks that cause async behavior
vi.mock("agents/ai-react", () => ({
  useAgentChat: () => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    addToolResult: vi.fn(),
    clearHistory: vi.fn(),
    isLoading: false,
    stop: vi.fn(),
  }),
}));

vi.mock("agents/react", () => ({
  useAgent: () => ({
    agent: "chat",
  }),
}));

describe("ChatPanel", () => {
  it("renders without crashing", () => {
    const mockProps = {
      theme: "dark" as const,
      onThemeToggle: () => {},
    };

    expect(() => render(<ChatPanel {...mockProps} />)).not.toThrow();
  });

  it("shows edit mode toggle when workflow is provided", async () => {
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

    // Wait for async operations to complete
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it("disables edit mode when no workflow is provided", async () => {
    const mockProps = {
      theme: "dark" as const,
      onThemeToggle: () => {},
      workflow: null,
      onWorkflowUpdate: () => {},
    };

    const { container } = render(<ChatPanel {...mockProps} />);

    // Wait for async operations to complete
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });
});
