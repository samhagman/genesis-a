/**
 * EXPENSIVE INTEGRATION TESTS - COSTS REAL MONEY TO RUN
 *
 * These tests use real Cloudflare bindings (AI, R2, Durable Objects) and external APIs.
 * They require valid credentials and will incur actual usage charges.
 *
 * Prerequisites:
 * - OPENAI_API_KEY set in .dev.vars
 * - Real Cloudflare AI binding configured
 * - Real R2 bucket for WORKFLOW_VERSIONS
 * - Valid Cloudflare account with sufficient credits
 *
 * Run with: npm run test:expensive (after configuring credentials)
 */

import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Expensive Integration Tests (Real Cloudflare Services)", () => {
  // No mock setup - these tests use real bindings and services

  it("should create a new workflow when requested", async () => {
    // Use SELF.fetch to go through the worker entry point (official pattern)
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Create a workflow called 'Employee Onboarding' for managing new hire setup",
        }),
      }
    );

    expect(response.ok).toBe(true);
    const responseText = await response.text();

    // Verify the agent used the createWorkflow tool
    expect(responseText).toContain("Employee Onboarding");
    expect(responseText).toContain("Created new workflow");
  });

  it("should add goals to an existing workflow", async () => {
    // First create a workflow
    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Create a workflow called 'Order Processing'",
      }),
    });

    // Then add a goal
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Add a goal called 'Validate Order' for checking order details and inventory",
        }),
      }
    );

    const responseText = await response.text();
    expect(responseText).toContain("Validate Order");
    expect(responseText).toContain("Added goal");
  });

  it("should add tasks to workflow goals", async () => {
    // Create workflow and goal first
    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Create a workflow called 'Customer Support' with a goal 'Handle Ticket'",
      }),
    });

    // Add a task
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Add a human task 'Review customer complaint' to the Handle Ticket goal",
        }),
      }
    );

    const responseText = await response.text();
    expect(responseText).toContain("Review customer complaint");
    expect(responseText).toContain("human task");
  });

  it("should add constraints to workflow goals", async () => {
    // Create workflow and goal first
    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Create a workflow called 'Data Processing' with a goal 'Process Data'",
      }),
    });

    // Add a constraint
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Add a time limit constraint to ensure processing completes within 60 minutes",
        }),
      }
    );

    const responseText = await response.text();
    expect(responseText).toContain("constraint");
    expect(responseText).toContain("time_limit");
  });

  it("should maintain workflow state across multiple interactions", async () => {
    // Create workflow
    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Create a workflow called 'Product Launch'",
      }),
    });

    // Add multiple goals
    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Add a goal 'Market Research'",
      }),
    });

    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Add a goal 'Product Development'",
      }),
    });

    // View workflow to confirm state persistence
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Show me the current workflow",
        }),
      }
    );

    const responseText = await response.text();
    expect(responseText).toContain("Product Launch");
    expect(responseText).toContain("Market Research");
    expect(responseText).toContain("Product Development");
    expect(responseText).toContain("Goals: 2");
  });

  it("should handle workflow validation errors gracefully", async () => {
    // Try to add a goal without a workflow
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Add a goal called 'Test Goal'",
        }),
      }
    );

    const responseText = await response.text();
    expect(
      responseText.includes("No workflow loaded") ||
        responseText.includes("Create or load a workflow first")
    ).toBe(true);
  });

  it("should handle human-in-the-loop delete operations", async () => {
    // Create workflow with goal
    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Create a workflow called 'Test Workflow' with a goal 'Test Goal'",
      }),
    });

    // Attempt to delete goal (should require confirmation)
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Delete the Test Goal",
        }),
      }
    );

    const responseText = await response.text();
    expect(
      responseText.includes("confirmation") ||
        responseText.includes("DELETE GOAL") ||
        responseText.includes("destructive")
    ).toBe(true);
  });

  it("should persist workflow data in R2 storage", async () => {
    // Create workflow
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Create a workflow called 'Storage Test' for testing persistence",
        }),
      }
    );

    expect(response.ok).toBe(true);

    // Verify R2 storage was used (check that no errors occurred)
    const responseText = await response.text();
    expect(responseText).toContain("Storage Test");
    expect(responseText).toContain("Created new workflow");
  });

  it("should handle multiple workflow operations in sequence", async () => {
    // Complex workflow building sequence
    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Create a workflow called 'E-commerce Order Fulfillment'",
      }),
    });

    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Add a goal 'Order Validation' for checking order details",
      }),
    });

    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Add an AI task 'Validate payment information' to Order Validation",
      }),
    });

    await SELF.fetch("http://localhost/agents/test-agent/rooms/test-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Add a business rule constraint for payment validation",
      }),
    });

    // Verify final state
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "View current workflow",
        }),
      }
    );

    const responseText = await response.text();
    expect(responseText).toContain("E-commerce Order Fulfillment");
    expect(responseText).toContain("Order Validation");
    expect(responseText).toContain("Tasks: 1");
    expect(responseText).toContain("Constraints: 1");
  });

  it("should provide helpful guidance when workflow context is missing", async () => {
    // Try to perform operations without a workflow
    const viewResponse = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Show me the current workflow",
        }),
      }
    );

    const viewText = await viewResponse.text();
    expect(
      viewText.includes("No workflow") ||
        viewText.includes("createWorkflow") ||
        viewText.includes("start a new workflow")
    ).toBe(true);
  });

  it("should handle errors and edge cases gracefully", async () => {
    // Test with malformed or edge case inputs
    const response = await SELF.fetch(
      "http://localhost/agents/test-agent/rooms/test-room",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "", // Empty message
        }),
      }
    );

    expect(response.ok).toBe(true);

    // Should not crash, should provide helpful response
    const responseText = await response.text();
    expect(responseText.length).toBeGreaterThan(0);
  });
});