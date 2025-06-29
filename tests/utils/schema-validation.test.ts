import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import {
  type ValidationResult,
  isValidWorkflowV2,
  validateWorkflowV2,
  validateWorkflowV2WithDetails,
} from "@/utils/schema-validation";
import { describe, expect, it } from "vitest";

describe("Schema Validation", () => {
  const validWorkflow: WorkflowTemplateV2 = {
    id: "test-workflow",
    name: "Test Workflow",
    version: "2.0",
    objective: "Test workflow for validation",
    metadata: {
      author: "Test Author",
      created_at: "2025-01-01T00:00:00Z",
      last_modified: "2025-01-01T00:00:00Z",
      tags: ["test", "validation"],
    },
    goals: [
      {
        id: "goal-1",
        name: "Test Goal",
        description: "A test goal for validation",
        order: 1,
        constraints: [
          {
            id: "constraint-1",
            description: "Test constraint",
            type: "time_limit",
            enforcement: "hard_stop",
            value: 30,
            unit: "minutes",
          },
        ],
        policies: [
          {
            id: "policy-1",
            name: "Test Policy",
            if: {
              field: "test",
              operator: "==",
              value: "test",
            },
            then: {
              action: "test_action",
              params: { key: "value" },
            },
          },
        ],
        tasks: [
          {
            id: "task-1",
            description: "Test task",
            assignee: {
              type: "ai_agent",
              model: "gpt-4",
              capabilities: ["analysis"],
            },
            timeout_minutes: 15,
          },
        ],
        forms: [
          {
            id: "form-1",
            name: "Test Form",
            description: "Test form description",
            type: "structured",
            schema: {
              sections: [
                {
                  name: "Test Section",
                  fields: [
                    {
                      name: "test_field",
                      type: "string",
                      required: true,
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  };

  describe("validateWorkflowV2", () => {
    it("should validate a correct V2 workflow", () => {
      const result = validateWorkflowV2(validWorkflow);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject null/undefined input", () => {
      const result1 = validateWorkflowV2(null);
      const result2 = validateWorkflowV2(undefined);

      expect(result1.isValid).toBe(false);
      expect(result1.errors[0].code).toBe("INVALID_TYPE");

      expect(result2.isValid).toBe(false);
      expect(result2.errors[0].code).toBe("INVALID_TYPE");
    });

    it("should reject non-object input", () => {
      const result1 = validateWorkflowV2("string");
      const result2 = validateWorkflowV2(123);
      const result3 = validateWorkflowV2([]);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result3.isValid).toBe(false);
    });

    it("should require essential fields", () => {
      const incompleteWorkflow = {
        id: "test",
        // missing name, version, objective, goals
      };

      const result = validateWorkflowV2(incompleteWorkflow);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.path === "root.name")).toBe(true);
      expect(result.errors.some((e) => e.path === "root.version")).toBe(true);
      expect(result.errors.some((e) => e.path === "root.objective")).toBe(true);
      expect(result.errors.some((e) => e.path === "root.goals")).toBe(true);
    });

    it("should validate goal structure", () => {
      const workflowWithBadGoals = {
        ...validWorkflow,
        goals: [
          {
            id: "goal-1",
            // missing name, description, order, constraints, policies, tasks, forms
          },
        ],
      };

      const result = validateWorkflowV2(workflowWithBadGoals);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.path === "goals[0].name")).toBe(true);
      expect(result.errors.some((e) => e.path === "goals[0].description")).toBe(
        true
      );
      expect(result.errors.some((e) => e.path === "goals[0].constraints")).toBe(
        true
      );
      expect(result.errors.some((e) => e.path === "goals[0].policies")).toBe(
        true
      );
      expect(result.errors.some((e) => e.path === "goals[0].tasks")).toBe(true);
      expect(result.errors.some((e) => e.path === "goals[0].forms")).toBe(true);
    });

    it("should validate constraint types and enforcement", () => {
      const workflowWithBadConstraint = {
        ...validWorkflow,
        goals: [
          {
            ...validWorkflow.goals[0],
            constraints: [
              {
                id: "constraint-1",
                description: "Test constraint",
                type: "invalid_type",
                enforcement: "invalid_enforcement",
              },
            ],
          },
        ],
      };

      const result = validateWorkflowV2(workflowWithBadConstraint);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === "INVALID_ENUM_VALUE" && e.path.includes("type")
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.code === "INVALID_ENUM_VALUE" && e.path.includes("enforcement")
        )
      ).toBe(true);
    });

    it("should validate task assignee types", () => {
      const workflowWithBadTask = {
        ...validWorkflow,
        goals: [
          {
            ...validWorkflow.goals[0],
            tasks: [
              {
                id: "task-1",
                description: "Test task",
                assignee: {
                  type: "invalid_type",
                },
              },
            ],
          },
        ],
      };

      const result = validateWorkflowV2(workflowWithBadTask);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === "INVALID_ENUM_VALUE" && e.path.includes("assignee.type")
        )
      ).toBe(true);
    });

    it("should validate form types", () => {
      const workflowWithBadForm = {
        ...validWorkflow,
        goals: [
          {
            ...validWorkflow.goals[0],
            forms: [
              {
                id: "form-1",
                name: "Test Form",
                type: "invalid_type",
              },
            ],
          },
        ],
      };

      const result = validateWorkflowV2(workflowWithBadForm);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === "INVALID_ENUM_VALUE" && e.path.includes("type")
        )
      ).toBe(true);
    });

    it("should generate warnings for missing recommended fields", () => {
      const workflowWithWarnings = {
        ...validWorkflow,
        goals: [
          {
            ...validWorkflow.goals[0],
            tasks: [
              {
                id: "task-1",
                description: "Test task",
                assignee: {
                  type: "ai_agent",
                  // missing model and capabilities
                },
              },
            ],
            forms: [
              {
                id: "form-1",
                name: "Test Form",
                type: "conversational",
                // missing initial_prompt
              },
            ],
          },
        ],
      };

      const result = validateWorkflowV2(workflowWithWarnings);

      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.code === "MISSING_RECOMMENDED_FIELD")
      ).toBe(true);
    });

    it("should validate metadata structure", () => {
      const workflowWithBadMetadata = {
        ...validWorkflow,
        metadata: {
          // missing required fields
          tags: "not_an_array",
        },
      };

      const result = validateWorkflowV2(workflowWithBadMetadata);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.path === "metadata.author")).toBe(
        true
      );
      expect(result.errors.some((e) => e.path === "metadata.created_at")).toBe(
        true
      );
      expect(
        result.errors.some((e) => e.path === "metadata.last_modified")
      ).toBe(true);
      expect(result.errors.some((e) => e.path === "metadata.tags")).toBe(true);
    });

    it("should validate global settings when present", () => {
      const workflowWithGlobalSettings = {
        ...validWorkflow,
        global_settings: {
          max_execution_time_hours: "not_a_number",
          data_retention_days: -1,
          default_timezone: 123,
        },
      };

      const result = validateWorkflowV2(workflowWithGlobalSettings);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.path.includes("max_execution_time_hours"))
      ).toBe(true);
      expect(
        result.errors.some((e) => e.path.includes("default_timezone"))
      ).toBe(true);
    });

    it("should validate triggers when present", () => {
      const workflowWithTriggers = {
        ...validWorkflow,
        triggers: [
          {
            type: "invalid_trigger_type",
          },
          {
            // missing type
            event: "test",
          },
        ],
      };

      const result = validateWorkflowV2(workflowWithTriggers);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_ENUM_VALUE")).toBe(
        true
      );
      expect(
        result.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")
      ).toBe(true);
    });

    it("should validate policy structure", () => {
      const workflowWithBadPolicy = {
        ...validWorkflow,
        goals: [
          {
            ...validWorkflow.goals[0],
            policies: [
              {
                id: "policy-1",
                name: "Test Policy",
                if: { condition: "test" },
                then: {
                  // missing action and params
                },
              },
            ],
          },
        ],
      };

      const result = validateWorkflowV2(workflowWithBadPolicy);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("then.action"))).toBe(
        true
      );
      expect(result.errors.some((e) => e.path.includes("then.params"))).toBe(
        true
      );
    });
  });

  describe("isValidWorkflowV2", () => {
    it("should return true for valid workflow", () => {
      expect(isValidWorkflowV2(validWorkflow)).toBe(true);
    });

    it("should return false for invalid workflow", () => {
      expect(isValidWorkflowV2(null)).toBe(false);
      expect(isValidWorkflowV2({})).toBe(false);
      expect(isValidWorkflowV2("invalid")).toBe(false);
    });
  });

  describe("validateWorkflowV2WithDetails", () => {
    it("should return the same result as validateWorkflowV2", () => {
      const result1 = validateWorkflowV2(validWorkflow);
      const result2 = validateWorkflowV2WithDetails(validWorkflow);

      expect(result1.isValid).toBe(result2.isValid);
      expect(result1.errors).toEqual(result2.errors);
      expect(result1.warnings).toEqual(result2.warnings);
    });
  });

  describe("error and warning codes", () => {
    it("should use consistent error codes", () => {
      const invalidWorkflow = {
        id: 123, // wrong type
        goals: "not_an_array", // wrong type
      };

      const result = validateWorkflowV2(invalidWorkflow);

      expect(result.errors.every((e) => typeof e.code === "string")).toBe(true);
      expect(result.errors.some((e) => e.code === "INVALID_TYPE")).toBe(true);
      expect(
        result.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")
      ).toBe(true);
    });

    it("should provide helpful error messages", () => {
      const invalidWorkflow = {};

      const result = validateWorkflowV2(invalidWorkflow);

      expect(result.errors.every((e) => e.message.length > 0)).toBe(true);
      expect(result.errors.every((e) => e.path.length > 0)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty arrays gracefully", () => {
      const workflowWithEmptyArrays = {
        ...validWorkflow,
        goals: [
          {
            ...validWorkflow.goals[0],
            constraints: [],
            policies: [],
            tasks: [],
            forms: [],
          },
        ],
      };

      const result = validateWorkflowV2(workflowWithEmptyArrays);

      expect(result.isValid).toBe(true);
    });

    it("should handle missing optional fields", () => {
      const minimalWorkflow = {
        id: "minimal",
        name: "Minimal Workflow",
        version: "2.0",
        objective: "Minimal test",
        metadata: {
          author: "Test",
          created_at: "2025-01-01T00:00:00Z",
          last_modified: "2025-01-01T00:00:00Z",
          tags: [],
        },
        goals: [
          {
            id: "goal-1",
            name: "Minimal Goal",
            description: "Minimal goal",
            order: 1,
            constraints: [],
            policies: [],
            tasks: [],
            forms: [],
          },
        ],
      };

      const result = validateWorkflowV2(minimalWorkflow);

      expect(result.isValid).toBe(true);
    });

    it("should validate numeric constraints properly", () => {
      const workflowWithNumericValidation = {
        ...validWorkflow,
        global_settings: {
          max_execution_time_hours: 0, // Should generate warning
          data_retention_days: 30,
          default_timezone: "UTC",
        },
        goals: [
          {
            ...validWorkflow.goals[0],
            order: 0, // Should generate warning
            tasks: [
              {
                id: "task-1",
                description: "Test task",
                assignee: { type: "human" },
                timeout_minutes: -5, // Should generate warning
              },
            ],
          },
        ],
      };

      const result = validateWorkflowV2(workflowWithNumericValidation);

      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings.some((w) => w.code === "INVALID_VALUE")).toBe(
        true
      );
    });
  });
});
