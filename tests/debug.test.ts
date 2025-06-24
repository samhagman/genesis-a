// Debug test to isolate React import issue
import { describe, it, expect } from "vitest";

// Test individual imports to find the React issue
describe("Debug React Import Issue", () => {
  it("basic test should pass", () => {
    expect(true).toBe(true);
  });

  it("can import workflow instance types", async () => {
    const { isGoalInstance } = await import("@/types/workflow-instance");
    expect(isGoalInstance).toBeDefined();
  });

  it("can import instance factory", async () => {
    const { createWorkflowInstance } = await import("@/state/instanceFactory");
    expect(createWorkflowInstance).toBeDefined();
  });

  // TODO: React 19 import issue - debug later
  // it('can import zustand create', async () => {
  //   const { create } = await import('zustand');
  //   expect(create).toBeDefined();
  // });

  // it('can import workflow store', async () => {
  //   const { useWorkflowStore } = await import('@/state/workflowStore');
  //   expect(useWorkflowStore).toBeDefined();
  // });
});
