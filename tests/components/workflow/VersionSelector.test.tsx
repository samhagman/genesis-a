import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  VersionSelector,
  type WorkflowVersion,
} from "@/components/workflow/VersionSelector";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";

// Mock workflow for testing
const mockWorkflow: WorkflowTemplateV2 = {
  id: "test-workflow",
  name: "Test Workflow",
  version: "1.0.0",
  objective: "Test workflow for version selector",
  metadata: {
    author: "Test Author",
    created_at: "2024-01-01",
    last_modified: "2024-01-01",
    tags: ["test"],
  },
  goals: [
    {
      id: "goal_1",
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

// Mock version data
const mockVersions: WorkflowVersion[] = [
  {
    version: 3,
    templateId: "test-workflow",
    createdAt: "2024-01-03T10:00:00Z",
    createdBy: "user",
    editSummary: "Added new task for user validation",
    filePath: "/workflows/test-workflow/v3.json",
    fileSize: 2048,
    checksum: "abc123",
  },
  {
    version: 2,
    templateId: "test-workflow",
    createdAt: "2024-01-02T10:00:00Z",
    createdBy: "user",
    editSummary: "Updated goal descriptions",
    filePath: "/workflows/test-workflow/v2.json",
    fileSize: 1536,
    checksum: "def456",
  },
  {
    version: 1,
    templateId: "test-workflow",
    createdAt: "2024-01-01T10:00:00Z",
    createdBy: "admin",
    editSummary: "Initial workflow creation",
    filePath: "/workflows/test-workflow/v1.json",
    fileSize: 1024,
    checksum: "ghi789",
  },
];

// Mock fetch
global.fetch = vi.fn();

describe("VersionSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ versions: mockVersions }),
    });
  });

  it("renders without crashing when workflow is provided", () => {
    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    expect(() => render(<VersionSelector {...mockProps} />)).not.toThrow();
  });

  it("does not render when no workflow is provided", () => {
    const { container } = render(
      <VersionSelector
        workflow={null}
        currentVersion={1}
        onVersionChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("loads version history on mount", async () => {
    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/workflow/test-workflow/versions"
      );
    });
  });

  it("displays version history information", async () => {
    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Version History")).toBeInTheDocument();
      expect(screen.getByText("3 versions available")).toBeInTheDocument();
    });
  });

  it("shows current version with star indicator", async () => {
    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    await waitFor(() => {
      // Should show current version badge
      expect(screen.getByText("Current")).toBeInTheDocument();
      expect(screen.getByText("Version 3")).toBeInTheDocument();
    });
  });

  it("displays version details when version is selected", async () => {
    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Added new task for user validation")
      ).toBeInTheDocument();
      expect(screen.getByText("by user")).toBeInTheDocument();
      expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    });
  });

  it("handles version selection change", async () => {
    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    await waitFor(() => {
      const select = screen.getByDisplayValue(/★ v3/);
      fireEvent.change(select, { target: { value: "2" } });
    });

    // Should update selected version display
    await waitFor(() => {
      expect(screen.getByText("Version 2")).toBeInTheDocument();
      expect(screen.getByText("Updated goal descriptions")).toBeInTheDocument();
    });
  });

  it("shows revert button for non-current versions", async () => {
    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    // Change to version 2
    await waitFor(() => {
      const select = screen.getByDisplayValue(/★ v3/);
      fireEvent.change(select, { target: { value: "2" } });
    });

    await waitFor(() => {
      expect(screen.getByText("Revert to This Version")).toBeInTheDocument();
    });
  });

  it("hides revert button for current version", async () => {
    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    await waitFor(() => {
      expect(
        screen.queryByText("Revert to This Version")
      ).not.toBeInTheDocument();
    });
  });

  it("handles revert operation successfully", async () => {
    const mockRevertResponse = {
      success: true,
      newVersion: 4,
      updatedWorkflow: { ...mockWorkflow, version: "1.1.0" },
    };

    const mockOnVersionChange = vi.fn();

    // Mock successful revert response
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ versions: mockVersions }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRevertResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ versions: mockVersions }),
      });

    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: mockOnVersionChange,
    };

    render(<VersionSelector {...mockProps} />);

    // Wait for initial load
    await waitFor(() => {
      const select = screen.getByDisplayValue(/★ v3/);
      fireEvent.change(select, { target: { value: "2" } });
    });

    // Click revert button
    await waitFor(() => {
      const revertButton = screen.getByText("Revert to This Version");
      fireEvent.click(revertButton);
    });

    // Should call onVersionChange with revert result
    await waitFor(() => {
      expect(mockOnVersionChange).toHaveBeenCalledWith(
        4,
        mockRevertResponse.updatedWorkflow
      );
    });
  });

  it("shows loading state during revert", async () => {
    // Mock delayed revert response
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ versions: mockVersions }),
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      newVersion: 4,
                      updatedWorkflow: mockWorkflow,
                    }),
                }),
              100
            )
          )
      );

    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    // Change to version 2 and click revert
    await waitFor(() => {
      const select = screen.getByDisplayValue(/★ v3/);
      fireEvent.change(select, { target: { value: "2" } });
    });

    await waitFor(() => {
      const revertButton = screen.getByText("Revert to This Version");
      fireEvent.click(revertButton);
    });

    // Should show loading state
    expect(screen.getByText("Reverting...")).toBeInTheDocument();
  });

  it("handles version loading error gracefully", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("No version history available")
      ).toBeInTheDocument();
    });
  });

  it("handles revert error gracefully", async () => {
    // Mock successful initial load, failed revert
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ versions: mockVersions }),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: "Server Error",
      });

    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    // Change to version 2 and click revert
    await waitFor(() => {
      const select = screen.getByDisplayValue(/★ v3/);
      fireEvent.change(select, { target: { value: "2" } });
    });

    await waitFor(() => {
      const revertButton = screen.getByText("Revert to This Version");
      fireEvent.click(revertButton);
    });

    // Should handle error gracefully and return to normal state
    await waitFor(() => {
      expect(screen.getByText("Revert to This Version")).toBeInTheDocument();
    });
  });

  it("disables select during revert operation", async () => {
    // Mock delayed revert response
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ versions: mockVersions }),
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      newVersion: 4,
                      updatedWorkflow: mockWorkflow,
                    }),
                }),
              100
            )
          )
      );

    const mockProps = {
      workflow: mockWorkflow,
      currentVersion: 3,
      onVersionChange: vi.fn(),
    };

    render(<VersionSelector {...mockProps} />);

    // Change to version 2 and start revert
    await waitFor(() => {
      const select = screen.getByDisplayValue(/★ v3/);
      fireEvent.change(select, { target: { value: "2" } });
    });

    await waitFor(() => {
      const revertButton = screen.getByText("Revert to This Version");
      fireEvent.click(revertButton);
    });

    // Select should be disabled during revert
    const select = screen.getByDisplayValue("v2 - Updated goal descriptions");
    expect(select).toBeDisabled();
  });
});
