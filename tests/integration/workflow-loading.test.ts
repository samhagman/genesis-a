import { describe, it, expect } from "vitest";
import { WorkflowTemplateV2, isWorkflowV2 } from "@/types/workflow-v2";

// Test workflow data loading and validation
describe("Workflow Data Loading Integration", () => {
  it("should load and validate InstaWork V2 workflow", async () => {
    // Dynamic import to test actual workflow loading
    const workflowModule = await import(
      "@/workflows/instawork-shift-filling.json"
    );
    const workflow = workflowModule.default as WorkflowTemplateV2;

    // Validate basic structure
    expect(workflow).toBeDefined();
    expect(workflow.id).toBe("instawork-shift-filling");
    expect(workflow.name).toBe("InstaWork Shift Filling Workflow");
    expect(workflow.version).toBe("2.0");
    expect(workflow.objective).toContain("fill");

    // Validate V2 schema compliance
    expect(isWorkflowV2(workflow)).toBe(true);

    // Validate goals structure
    expect(workflow.goals).toBeDefined();
    expect(Array.isArray(workflow.goals)).toBe(true);
    expect(workflow.goals.length).toBe(3);

    // Validate each goal has V2 elements
    workflow.goals.forEach((goal, index) => {
      expect(goal.id).toBeDefined();
      expect(goal.name).toBeDefined();
      expect(goal.description).toBeDefined();
      expect(goal.order).toBe(index + 1);

      // V2 elements
      expect(Array.isArray(goal.constraints)).toBe(true);
      expect(Array.isArray(goal.policies)).toBe(true);
      expect(Array.isArray(goal.tasks)).toBe(true);
      expect(Array.isArray(goal.forms)).toBe(true);
    });

    // Validate constraints structure
    const allConstraints = workflow.goals.flatMap((goal) => goal.constraints);
    expect(allConstraints.length).toBeGreaterThan(0);

    allConstraints.forEach((constraint) => {
      expect(constraint.id).toBeDefined();
      expect(constraint.description).toBeDefined();
      expect(constraint.type).toBeDefined();
      expect(constraint.enforcement).toBeDefined();
    });

    // Validate policies structure
    const allPolicies = workflow.goals.flatMap((goal) => goal.policies);
    expect(allPolicies.length).toBeGreaterThan(0);

    allPolicies.forEach((policy) => {
      expect(policy.id).toBeDefined();
      expect(policy.name).toBeDefined();
      expect(policy.if).toBeDefined();
      expect(policy.then).toBeDefined();
      expect(policy.then.action).toBeDefined();
      expect(policy.then.params).toBeDefined();
    });

    // Validate tasks structure
    const allTasks = workflow.goals.flatMap((goal) => goal.tasks);
    expect(allTasks.length).toBeGreaterThan(0);

    allTasks.forEach((task) => {
      expect(task.id).toBeDefined();
      expect(task.description).toBeDefined();
      expect(task.assignee).toBeDefined();
      expect(task.assignee.type).toMatch(/^(ai_agent|human)$/);
    });

    // Validate forms structure
    const allForms = workflow.goals.flatMap((goal) => goal.forms);
    expect(allForms.length).toBeGreaterThan(0);

    allForms.forEach((form) => {
      expect(form.id).toBeDefined();
      expect(form.name).toBeDefined();
      expect(form.type).toMatch(/^(structured|conversational|automated)$/);
    });
  });

  it("should load and validate Employee Onboarding V2 workflow", async () => {
    // Test the converted V2 version of employee onboarding
    const workflowModule = await import(
      "@/workflows/employee-onboarding-v2.json"
    );
    const workflow = workflowModule.default as WorkflowTemplateV2;

    // Validate basic structure
    expect(workflow).toBeDefined();
    expect(workflow.id).toBe("employee-onboarding-v2");
    expect(workflow.name).toBe("Employee Onboarding Process V2");
    expect(workflow.version).toBe("2.0");

    // Validate V2 schema compliance
    expect(isWorkflowV2(workflow)).toBe(true);

    // Should have goals with V2 elements
    expect(workflow.goals).toBeDefined();
    expect(workflow.goals.length).toBeGreaterThan(0);

    workflow.goals.forEach((goal) => {
      expect(goal.constraints).toBeDefined();
      expect(goal.policies).toBeDefined();
      expect(goal.tasks).toBeDefined();
      expect(goal.forms).toBeDefined();
    });
  });

  it("should load workflow index and provide unified access", async () => {
    // Test the workflow loader utilities
    const workflowIndex = await import("@/workflows/index");

    // Should export workflow loading functions or data
    expect(workflowIndex).toBeDefined();
    expect(typeof workflowIndex).toBe("object");
  });

  it("should handle V2 type guards correctly", () => {
    // Test valid V2 workflow
    const validV2Workflow = {
      id: "test",
      name: "Test Workflow",
      version: "2.0",
      objective: "Test objective",
      metadata: {
        author: "test",
        created_at: "2025-01-01",
        last_modified: "2025-01-01",
        tags: ["test"],
      },
      goals: [
        {
          id: "goal-1",
          name: "Test Goal",
          description: "Test goal description",
          order: 1,
          constraints: [],
          policies: [],
          tasks: [],
          forms: [],
        },
      ],
    };

    expect(isWorkflowV2(validV2Workflow)).toBe(true);

    // Test invalid V1-style workflow
    const invalidWorkflow = {
      id: "test",
      name: "Test Workflow",
      goals: [
        {
          id: "goal-1",
          name: "Test Goal",
          subtasks: [], // V1 style
        },
      ],
    };

    expect(isWorkflowV2(invalidWorkflow)).toBe(false);

    // Test completely invalid data - these should return falsy values
    expect(isWorkflowV2(null)).toBeFalsy();
    expect(isWorkflowV2(undefined)).toBeFalsy();
    expect(isWorkflowV2("string")).toBeFalsy();
    expect(isWorkflowV2(123)).toBeFalsy();
    expect(isWorkflowV2({})).toBeFalsy();
  });

  it("should validate workflow metadata structure", async () => {
    const workflowModule = await import(
      "@/workflows/instawork-shift-filling.json"
    );
    const workflow = workflowModule.default as WorkflowTemplateV2;

    // Validate metadata
    expect(workflow.metadata).toBeDefined();
    expect(workflow.metadata.author).toBeDefined();
    expect(workflow.metadata.created_at).toBeDefined();
    expect(workflow.metadata.last_modified).toBeDefined();
    expect(Array.isArray(workflow.metadata.tags)).toBe(true);

    // Validate global settings if present
    if (workflow.global_settings) {
      expect(typeof workflow.global_settings.max_execution_time_hours).toBe(
        "number"
      );
      expect(typeof workflow.global_settings.data_retention_days).toBe(
        "number"
      );
      expect(typeof workflow.global_settings.default_timezone).toBe("string");
    }

    // Validate triggers if present
    if (workflow.triggers) {
      expect(Array.isArray(workflow.triggers)).toBe(true);
      workflow.triggers.forEach((trigger) => {
        expect(trigger.type).toMatch(/^(webhook|schedule|manual|event)$/);
      });
    }
  });

  it("should validate constraint types and enforcement levels", async () => {
    const workflowModule = await import(
      "@/workflows/instawork-shift-filling.json"
    );
    const workflow = workflowModule.default as WorkflowTemplateV2;

    const allConstraints = workflow.goals.flatMap((goal) => goal.constraints);

    const validConstraintTypes = [
      "time_limit",
      "data_validation",
      "business_rule",
      "rate_limit",
      "access_control",
      "timing",
      "change_management",
      "data_protection",
      "privacy",
      "content_validation",
    ];

    const validEnforcementLevels = [
      "hard_stop",
      "block_progression",
      "require_approval",
      "warn",
      "skip_workflow",
      "delay_until_allowed",
      "filter_recipients",
      "content_review",
      "block_until_met",
      "block_duplicate",
    ];

    allConstraints.forEach((constraint) => {
      expect(validConstraintTypes).toContain(constraint.type);
      expect(validEnforcementLevels).toContain(constraint.enforcement);
    });
  });

  it("should validate task assignee types and configurations", async () => {
    const workflowModule = await import(
      "@/workflows/instawork-shift-filling.json"
    );
    const workflow = workflowModule.default as WorkflowTemplateV2;

    const allTasks = workflow.goals.flatMap((goal) => goal.tasks);

    allTasks.forEach((task) => {
      expect(["ai_agent", "human"]).toContain(task.assignee.type);

      if (task.assignee.type === "ai_agent") {
        // AI agents should have model or capabilities
        expect(
          task.assignee.model ||
            (task.assignee.capabilities &&
              task.assignee.capabilities.length > 0)
        ).toBeTruthy();
      }

      if (task.assignee.type === "human") {
        // Humans might have role or skills defined
        // This is optional, so we just check structure if present
        if (task.assignee.role) {
          expect(typeof task.assignee.role).toBe("string");
        }
      }
    });
  });

  it("should validate form types and structures", async () => {
    const workflowModule = await import(
      "@/workflows/instawork-shift-filling.json"
    );
    const workflow = workflowModule.default as WorkflowTemplateV2;

    const allForms = workflow.goals.flatMap((goal) => goal.forms);

    allForms.forEach((form) => {
      expect(["structured", "conversational", "automated"]).toContain(
        form.type
      );

      if (form.type === "structured") {
        // Structured forms should have schema or fields
        expect(form.schema || form.fields || form.sections).toBeTruthy();
      }

      if (form.type === "conversational") {
        // Conversational forms might have initial_prompt
        if (form.initial_prompt) {
          expect(typeof form.initial_prompt).toBe("string");
        }
      }

      if (form.type === "automated") {
        // Automated forms might have data_sources or generation config
        if (form.data_sources) {
          expect(Array.isArray(form.data_sources)).toBe(true);
        }
      }
    });
  });
});
