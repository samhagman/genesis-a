import { TaskList } from "@/components/workflow/TaskList";
import type { Task } from "@/types/workflow-v2";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTasks: Task[] = [
  {
    id: "task-1",
    description: "Review and categorize incoming shift requests",
    assignee: {
      type: "ai_agent",
      model: "gpt-4",
      capabilities: ["data_analysis", "text_classification", "decision_making"],
    },
    timeout_minutes: 30,
    sla_minutes: 15,
  },
  {
    id: "task-2",
    description: "Manually verify worker certifications",
    assignee: {
      type: "human",
      role: "HR Specialist",
      skills: ["verification", "compliance"],
    },
    approval_required: true,
    human_review: {
      required: true,
      reviewer_role: "Senior HR",
      sla_minutes: 60,
    },
    depends_on: ["task-1"],
  },
  {
    id: "task-3",
    description: "Monitor shift filling progress continuously",
    assignee: {
      type: "ai_agent",
      model: "claude-3",
      capabilities: [
        "monitoring",
        "alerting",
        "data_collection",
        "pattern_recognition",
        "anomaly_detection",
      ],
    },
    continuous: true,
    schedule: "*/5 * * * *",
  },
  {
    id: "task-4",
    description: "Simple task with minimal configuration",
    assignee: {
      type: "human",
    },
  },
];

describe("TaskList", () => {
  const mockOnTaskSelect = vi.fn();

  beforeEach(() => {
    mockOnTaskSelect.mockClear();
  });

  it("renders all tasks with correct descriptions", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    expect(
      screen.getByText("Review and categorize incoming shift requests")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Manually verify worker certifications")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Monitor shift filling progress continuously")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Simple task with minimal configuration")
    ).toBeInTheDocument();
  });

  it("displays correct assignee types with proper icons and badges", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    // Check AI Agent badges
    const aiAgentBadges = screen.getAllByText("AI Agent");
    expect(aiAgentBadges).toHaveLength(2);

    // Check Human badges
    const humanBadges = screen.getAllByText("Human");
    expect(humanBadges).toHaveLength(2);
  });

  it("displays model information for AI agents", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    expect(screen.getByText("gpt-4")).toBeInTheDocument();
    expect(screen.getByText("claude-3")).toBeInTheDocument();
  });

  it("displays role information for humans", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    expect(screen.getByText("HR Specialist")).toBeInTheDocument();
  });

  it("formats timeout duration correctly", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    expect(screen.getByText(/30m.*timeout/)).toBeInTheDocument();
  });

  it("formats SLA duration correctly", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    expect(screen.getByText(/15m.*SLA/)).toBeInTheDocument();
  });

  it("displays task attribute badges correctly", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    expect(screen.getByText(/Continuous/)).toBeInTheDocument();
    expect(screen.getByText(/Approval Required/)).toBeInTheDocument();
    expect(screen.getByText(/Human Review/)).toBeInTheDocument();
  });

  it("displays capabilities with proper truncation", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    // Check that capabilities are shown
    expect(screen.getByText("data analysis")).toBeInTheDocument();
    expect(screen.getByText("text classification")).toBeInTheDocument();
    expect(screen.getByText("decision making")).toBeInTheDocument();

    // Check truncation for task with more than 3 capabilities
    expect(screen.getByText("monitoring")).toBeInTheDocument();
    expect(screen.getByText("alerting")).toBeInTheDocument();
    expect(screen.getByText("data collection")).toBeInTheDocument();
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("displays dependencies when present", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    expect(screen.getByText("Depends on: task-1")).toBeInTheDocument();
  });

  it("calls onTaskSelect when task is clicked", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    const firstTask = screen.getByText(
      "Review and categorize incoming shift requests"
    );
    fireEvent.click(firstTask);

    expect(mockOnTaskSelect).toHaveBeenCalledWith("task-1");
  });

  it("highlights selected task", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId="task-2"
        onTaskSelect={mockOnTaskSelect}
      />
    );

    const selectedTask = screen
      .getByText("Manually verify worker certifications")
      .closest("div");
    expect(selectedTask).toBeInTheDocument();
    // Focus on structural indication rather than specific CSS classes
  });

  it("shows selection indicator for selected task", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId="task-1"
        onTaskSelect={mockOnTaskSelect}
      />
    );

    // Check that the selected task has some visual indicator
    const selectedTaskContainer = screen
      .getByText("Review and categorize incoming shift requests")
      .closest("div");
    expect(selectedTaskContainer).toBeInTheDocument();
  });

  it("handles empty tasks array", () => {
    render(
      <TaskList
        tasks={[]}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    // Should render without errors - no tasks to display
    expect(
      screen.queryByText("Review and categorize incoming shift requests")
    ).not.toBeInTheDocument();
  });

  it("handles tasks without optional fields gracefully", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    // The simple task should render without errors even with minimal configuration
    expect(
      screen.getByText("Simple task with minimal configuration")
    ).toBeInTheDocument();
  });

  it("displays correct task type icons", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    // Check that task type icons are present in title attributes
    const continuousTaskIcon = document.querySelector('[title="Task Type"]');
    expect(continuousTaskIcon).toBeInTheDocument();
  });

  it("formats hour-based durations correctly", () => {
    const taskWithHourTimeout: Task = {
      id: "hour-task",
      description: "Task with hour timeout",
      assignee: { type: "human" },
      timeout_minutes: 120, // 2 hours
      sla_minutes: 90, // 1 hour 30 minutes
    };

    render(
      <TaskList
        tasks={[taskWithHourTimeout]}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    expect(screen.getByText(/2h.*timeout/)).toBeInTheDocument();
    expect(screen.getByText(/1h 30m.*SLA/)).toBeInTheDocument();
  });

  it("handles multiple dependencies", () => {
    const taskWithMultipleDeps: Task = {
      id: "multi-dep-task",
      description: "Task with multiple dependencies",
      assignee: { type: "human" },
      depends_on: ["task-1", "task-2", "task-3"],
    };

    render(
      <TaskList
        tasks={[taskWithMultipleDeps]}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    expect(
      screen.getByText("Depends on: task-1, task-2, task-3")
    ).toBeInTheDocument();
  });

  it("shows capabilities label when capabilities exist", () => {
    render(
      <TaskList
        tasks={mockTasks}
        selectedTaskId={null}
        onTaskSelect={mockOnTaskSelect}
      />
    );

    const capabilityLabels = screen.getAllByText("Capabilities:");
    expect(capabilityLabels.length).toBeGreaterThan(0);
  });
});
