import { describe, it, expect, vi } from "vitest";
import {
  WorkflowError,
  WorkflowValidationError,
  WorkflowLoadError,
  WorkflowParseError,
  safeLoadWorkflow,
  safeLoadWorkflowFromFile,
  safeExtractGoalData,
  safeExtractWorkflowMetadata,
  formatWorkflowError,
  logWorkflowError,
  retryWorkflowLoad,
  sanitizeWorkflowForLogging,
  diagnoseWorkflowIssues,
  type SafeWorkflowResult,
} from "@/utils/error-handling";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";

// Note: For testing file not found errors, we'll use a non-existent path
// The actual import() will fail naturally, testing our error handling

describe("Error Handling Utilities", () => {
  const validWorkflow: WorkflowTemplateV2 = {
    id: "test-workflow",
    name: "Test Workflow",
    version: "2.0",
    objective: "Test workflow for error handling",
    metadata: {
      author: "Test Author",
      created_at: "2025-01-01T00:00:00Z",
      last_modified: "2025-01-01T00:00:00Z",
      tags: ["test"],
    },
    goals: [
      {
        id: "goal-1",
        name: "Test Goal",
        description: "Test goal",
        order: 1,
        constraints: [],
        policies: [],
        tasks: [],
        forms: [],
      },
    ],
  };

  describe("WorkflowError classes", () => {
    it("should create WorkflowError with code and context", () => {
      const error = new WorkflowError("Test error", "TEST_CODE", {
        key: "value",
      });

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.context).toEqual({ key: "value" });
      expect(error.name).toBe("WorkflowError");
    });

    it("should create WorkflowValidationError with validation result", () => {
      const validationResult = {
        isValid: false,
        errors: [{ path: "test", message: "Test error", code: "TEST" }],
        warnings: [],
      };

      const error = new WorkflowValidationError(
        "Validation failed",
        validationResult
      );

      expect(error.code).toBe("VALIDATION_FAILED");
      expect(error.validationResult).toBe(validationResult);
      expect(error.name).toBe("WorkflowValidationError");
    });

    it("should create WorkflowLoadError with original error", () => {
      const originalError = new Error("Original error");
      const error = new WorkflowLoadError("Load failed", originalError);

      expect(error.code).toBe("LOAD_FAILED");
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe("WorkflowLoadError");
    });

    it("should create WorkflowParseError with original error", () => {
      const originalError = new SyntaxError("Invalid JSON");
      const error = new WorkflowParseError("Parse failed", originalError);

      expect(error.code).toBe("PARSE_FAILED");
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe("WorkflowParseError");
    });
  });

  describe("safeLoadWorkflow", () => {
    it("should successfully load valid workflow", () => {
      const result = safeLoadWorkflow(validWorkflow, "test-source");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validWorkflow);
      }
    });

    it("should parse JSON string successfully", () => {
      const jsonString = JSON.stringify(validWorkflow);
      const result = safeLoadWorkflow(jsonString, "test-source");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validWorkflow);
      }
    });

    it("should handle invalid JSON string", () => {
      const invalidJson = '{"invalid": json}';
      const result = safeLoadWorkflow(invalidJson, "test-source");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(WorkflowParseError);
        expect(result.error.code).toBe("PARSE_FAILED");
        expect(result.partialData).toBe(invalidJson);
      }
    });

    it("should handle validation failures", () => {
      const invalidWorkflow = {
        id: "test",
        // missing required fields
      };

      const result = safeLoadWorkflow(invalidWorkflow, "test-source");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(WorkflowValidationError);
        expect(result.error.code).toBe("VALIDATION_FAILED");
        expect(result.partialData).toBe(invalidWorkflow);
      }
    });

    it("should include warnings for valid but suboptimal workflow", () => {
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
                  // missing model/capabilities - should generate warning
                },
              },
            ],
          },
        ],
      };

      const result = safeLoadWorkflow(workflowWithWarnings);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.length).toBeGreaterThan(0);
      }
    });

    it("should handle unexpected errors", () => {
      // Circular object will fail validation, not loading
      const circularObj: any = {};
      circularObj.self = circularObj;

      const result = safeLoadWorkflow(circularObj);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(WorkflowValidationError);
      }
    });
  });

  describe("safeLoadWorkflowFromFile", () => {
    // Note: Testing file loading would require actual files or complex mocking
    // This would be covered by integration tests that use real workflow files
  });

  describe("safeExtractGoalData", () => {
    it("should extract valid goal data", () => {
      const goalData = {
        id: "test-goal",
        name: "Test Goal",
        description: "Test description",
        order: 1,
        constraints: [1, 2, 3],
        policies: [1],
        tasks: [1, 2],
        forms: [1],
      };

      const result = safeExtractGoalData(goalData);

      expect(result).toEqual({
        id: "test-goal",
        name: "Test Goal",
        description: "Test description",
        order: 1,
        constraintCount: 3,
        policyCount: 1,
        taskCount: 2,
        formCount: 1,
      });
    });

    it("should provide fallback values for invalid data", () => {
      const result = safeExtractGoalData(null);

      expect(result).toEqual({
        id: "unknown-goal",
        name: "Unknown Goal",
        description: "Goal data could not be parsed",
        order: 0,
        constraintCount: 0,
        policyCount: 0,
        taskCount: 0,
        formCount: 0,
      });
    });

    it("should handle partial goal data", () => {
      const partialGoal = {
        id: "partial-goal",
        name: "Partial Goal",
        // missing description, order, arrays
      };

      const result = safeExtractGoalData(partialGoal);

      expect(result.id).toBe("partial-goal");
      expect(result.name).toBe("Partial Goal");
      expect(result.description).toBe("Goal data could not be parsed");
      expect(result.order).toBe(0);
      expect(result.constraintCount).toBe(0);
    });

    it("should handle non-array values gracefully", () => {
      const goalWithBadArrays = {
        id: "test",
        name: "Test",
        description: "Test",
        order: 1,
        constraints: "not-an-array",
        policies: null,
        tasks: undefined,
        forms: 123,
      };

      const result = safeExtractGoalData(goalWithBadArrays);

      expect(result.constraintCount).toBe(0);
      expect(result.policyCount).toBe(0);
      expect(result.taskCount).toBe(0);
      expect(result.formCount).toBe(0);
    });
  });

  describe("safeExtractWorkflowMetadata", () => {
    it("should extract valid workflow metadata", () => {
      const workflow = {
        id: "test-workflow",
        name: "Test Workflow",
        version: "2.0",
        objective: "Test objective",
        metadata: {
          author: "Test Author",
          tags: ["test", "workflow"],
        },
      };

      const result = safeExtractWorkflowMetadata(workflow);

      expect(result).toEqual({
        id: "test-workflow",
        name: "Test Workflow",
        version: "2.0",
        objective: "Test objective",
        author: "Test Author",
        tags: ["test", "workflow"],
      });
    });

    it("should provide fallback values for invalid data", () => {
      const result = safeExtractWorkflowMetadata(null);

      expect(result).toEqual({
        id: "unknown-workflow",
        name: "Unknown Workflow",
        version: "unknown",
        objective: "Workflow data could not be parsed",
        tags: [],
      });
    });

    it("should handle missing metadata", () => {
      const workflow = {
        id: "test",
        name: "Test",
        version: "1.0",
        objective: "Test",
        // no metadata
      };

      const result = safeExtractWorkflowMetadata(workflow);

      expect(result.author).toBeUndefined();
      expect(result.tags).toEqual([]);
    });

    it("should filter invalid tags", () => {
      const workflow = {
        id: "test",
        name: "Test",
        version: "1.0",
        objective: "Test",
        metadata: {
          author: "Test",
          tags: ["valid", 123, null, "another-valid", undefined],
        },
      };

      const result = safeExtractWorkflowMetadata(workflow);

      expect(result.tags).toEqual(["valid", "another-valid"]);
    });
  });

  describe("formatWorkflowError", () => {
    it("should format basic WorkflowError", () => {
      const error = new WorkflowError("Basic error", "BASIC_ERROR");
      const formatted = formatWorkflowError(error);

      expect(formatted).toBe("Basic error");
    });

    it("should format WorkflowError with context", () => {
      const error = new WorkflowError("Error with context", "ERROR_CODE", {
        source: "test.json",
        line: 42,
      });

      const formatted = formatWorkflowError(error);

      expect(formatted).toContain("Error with context");
      expect(formatted).toContain("Context: source: test.json, line: 42");
    });

    it("should format WorkflowValidationError with errors", () => {
      const validationResult = {
        isValid: false,
        errors: [
          {
            path: "goals[0].name",
            message: "Name is required",
            code: "REQUIRED",
          },
          {
            path: "goals[0].tasks",
            message: "Tasks must be array",
            code: "TYPE",
          },
          {
            path: "metadata.author",
            message: "Author is required",
            code: "REQUIRED",
          },
          { path: "extra.field", message: "Extra error", code: "EXTRA" },
        ],
        warnings: [],
      };

      const error = new WorkflowValidationError(
        "Validation failed",
        validationResult
      );
      const formatted = formatWorkflowError(error);

      expect(formatted).toContain("Validation failed");
      expect(formatted).toContain("• Name is required");
      expect(formatted).toContain("• Tasks must be array");
      expect(formatted).toContain("• Author is required");
      expect(formatted).toContain("... and 1 more errors");
    });
  });

  describe("logWorkflowError", () => {
    it("should log different error types with appropriate severity", () => {
      const mockLogger = {
        warn: vi.fn(),
        error: vi.fn(),
      };

      const validationError = new WorkflowValidationError("Validation failed", {
        isValid: false,
        errors: [],
        warnings: [],
      });

      const parseError = new WorkflowParseError("Parse failed");
      const loadError = new WorkflowLoadError("Load failed");
      const basicError = new WorkflowError("Basic error", "BASIC");

      logWorkflowError(validationError, mockLogger as any);
      logWorkflowError(parseError, mockLogger as any);
      logWorkflowError(loadError, mockLogger as any);
      logWorkflowError(basicError, mockLogger as any);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(3);
    });

    it("should log original error stack for load/parse errors", () => {
      const mockLogger = {
        error: vi.fn(),
      };

      const originalError = new Error("Original error");
      originalError.stack = "Error stack trace";

      const loadError = new WorkflowLoadError("Load failed", originalError);

      logWorkflowError(loadError, mockLogger as any);

      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Original error stack: Error stack trace")
      );
    });
  });

  describe("retryWorkflowLoad", () => {
    it("should return successful result on first try", async () => {
      const successResult: SafeWorkflowResult<WorkflowTemplateV2> = {
        success: true,
        data: validWorkflow,
      };

      const loadFunction = vi.fn().mockResolvedValue(successResult);

      const result = await retryWorkflowLoad(loadFunction, 2, 10);

      expect(result).toBe(successResult);
      expect(loadFunction).toHaveBeenCalledTimes(1);
    });

    it("should retry on load errors", async () => {
      const errorResult: SafeWorkflowResult<WorkflowTemplateV2> = {
        success: false,
        error: new WorkflowLoadError("Load failed"),
      };

      const successResult: SafeWorkflowResult<WorkflowTemplateV2> = {
        success: true,
        data: validWorkflow,
      };

      const loadFunction = vi
        .fn()
        .mockResolvedValueOnce(errorResult)
        .mockResolvedValueOnce(successResult);

      const result = await retryWorkflowLoad(loadFunction, 2, 10);

      expect(result).toBe(successResult);
      expect(loadFunction).toHaveBeenCalledTimes(2);
    });

    it("should not retry validation errors", async () => {
      const validationError: SafeWorkflowResult<WorkflowTemplateV2> = {
        success: false,
        error: new WorkflowValidationError("Validation failed", {
          isValid: false,
          errors: [],
          warnings: [],
        }),
      };

      const loadFunction = vi.fn().mockResolvedValue(validationError);

      const result = await retryWorkflowLoad(loadFunction, 2, 10);

      expect(result).toBe(validationError);
      expect(loadFunction).toHaveBeenCalledTimes(1);
    });

    it("should return last error after max retries", async () => {
      const errorResult: SafeWorkflowResult<WorkflowTemplateV2> = {
        success: false,
        error: new WorkflowLoadError("Load failed"),
      };

      const loadFunction = vi.fn().mockResolvedValue(errorResult);

      const result = await retryWorkflowLoad(loadFunction, 2, 10);

      expect(result).toBe(errorResult);
      expect(loadFunction).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });
  });

  describe("sanitizeWorkflowForLogging", () => {
    it("should sanitize valid workflow data", () => {
      const result = sanitizeWorkflowForLogging(validWorkflow);

      expect(result).toEqual({
        id: "test-workflow",
        name: "Test Workflow",
        version: "2.0",
        goalCount: 1,
        hasMetadata: true,
        hasGlobalSettings: false,
        hasTriggers: false,
        keys: expect.arrayContaining([
          "id",
          "name",
          "version",
          "objective",
          "metadata",
          "goals",
        ]),
      });
    });

    it("should handle non-object input", () => {
      const result = sanitizeWorkflowForLogging("string");

      expect(result).toEqual({
        type: "string",
        value: "non-object",
      });
    });

    it("should handle sanitization errors", () => {
      const problematicObject = {
        get id() {
          throw new Error("Property access error");
        },
      };

      const result = sanitizeWorkflowForLogging(problematicObject);

      expect(result).toEqual({
        error: "failed-to-sanitize",
      });
    });
  });

  describe("diagnoseWorkflowIssues", () => {
    it("should diagnose valid workflow", () => {
      const result = diagnoseWorkflowIssues(validWorkflow);

      expect(result.isValid).toBe(true);
      expect(result.summary).toBe("Workflow is valid");
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it("should diagnose non-object input", () => {
      const result = diagnoseWorkflowIssues("not an object");

      expect(result.isValid).toBe(false);
      expect(result.summary).toContain("not a valid object");
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe("error");
      expect(result.issues[0].category).toBe("structure");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("should categorize different types of issues", () => {
      const invalidWorkflow = {
        id: 123, // wrong type
        goals: [
          {
            id: "goal-1",
            // missing required fields
            constraints: [
              {
                id: "c1",
                description: "test",
                type: "invalid_type", // invalid enum
                enforcement: "warn",
              },
            ],
            policies: [],
            tasks: [],
            forms: [],
          },
        ],
      };

      const result = diagnoseWorkflowIssues(invalidWorkflow);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.category === "structure")).toBe(true);
      expect(result.issues.some((i) => i.category === "enum")).toBe(true);
      expect(
        result.suggestions.some((s) => s.includes("required fields"))
      ).toBe(true);
      expect(result.suggestions.some((s) => s.includes("enum values"))).toBe(
        true
      );
    });

    it("should handle warnings", () => {
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
                  // missing recommended fields
                },
              },
            ],
          },
        ],
      };

      const result = diagnoseWorkflowIssues(workflowWithWarnings);

      expect(result.isValid).toBe(true);
      expect(result.summary).toContain("warning");
      expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
    });
  });
});
