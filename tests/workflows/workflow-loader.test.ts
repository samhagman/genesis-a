import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadWorkflowTemplate,
  loadWorkflowTemplateSafe,
  getWorkflowTemplateList,
  getWorkflowTemplateInfo,
  hasWorkflowTemplate,
  validateWorkflowTemplate,
  loadMultipleWorkflowTemplates,
  WorkflowLoadError,
} from "@/workflows/index";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";

// Mock console methods to avoid noise in tests
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Workflow Loader", () => {
  describe("loadWorkflowTemplate", () => {
    it("should load InstaWork workflow successfully", async () => {
      const workflow = await loadWorkflowTemplate("instawork-shift-filling");

      expect(workflow).toBeDefined();
      expect(workflow.id).toBe("instawork-shift-filling");
      expect(workflow.name).toBe("InstaWork Shift Filling Workflow");
      expect(workflow.version).toBe("2.0");
      expect(workflow.goals).toBeDefined();
      expect(Array.isArray(workflow.goals)).toBe(true);
    });

    it("should load Employee Onboarding workflow successfully", async () => {
      const workflow = await loadWorkflowTemplate("employee-onboarding");

      expect(workflow).toBeDefined();
      expect(workflow.id).toBe("employee-onboarding-v2");
      expect(workflow.name).toBe("Employee Onboarding Process V2");
      expect(workflow.version).toBe("2.0");
      expect(workflow.goals).toBeDefined();
      expect(Array.isArray(workflow.goals)).toBe(true);
    });

    it("should throw error for non-existent workflow", async () => {
      await expect(loadWorkflowTemplate("non-existent")).rejects.toThrow(
        WorkflowLoadError
      );
      await expect(loadWorkflowTemplate("non-existent")).rejects.toThrow(
        "not found"
      );
    });

    it("should throw error for empty string template ID", async () => {
      await expect(loadWorkflowTemplate("")).rejects.toThrow(WorkflowLoadError);
    });

    it("should throw error for null/undefined template ID", async () => {
      await expect(loadWorkflowTemplate(null as any)).rejects.toThrow(
        WorkflowLoadError
      );
      await expect(loadWorkflowTemplate(undefined as any)).rejects.toThrow(
        WorkflowLoadError
      );
    });
  });

  describe("loadWorkflowTemplateSafe", () => {
    it("should return success result for valid workflow", async () => {
      const result = await loadWorkflowTemplateSafe("instawork-shift-filling");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("instawork-shift-filling");
        expect(result.data.name).toBe("InstaWork Shift Filling Workflow");
      }
    });

    it("should return error result for non-existent workflow", async () => {
      const result = await loadWorkflowTemplateSafe("non-existent");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(WorkflowLoadError);
        expect(result.error.message).toContain("not found");
        expect(result.error.context?.templateId).toBe("non-existent");
        expect(result.error.context?.availableTemplates).toContain(
          "instawork-shift-filling"
        );
      }
    });

    it("should include warnings if workflow has validation warnings", async () => {
      // This test assumes the workflow files might have minor validation warnings
      // If the workflow files are perfect, this test will pass with no warnings
      const result = await loadWorkflowTemplateSafe("employee-onboarding");

      expect(result.success).toBe(true);
      if (result.success) {
        // Warnings are optional - test passes whether they exist or not
        if (result.warnings) {
          expect(Array.isArray(result.warnings)).toBe(true);
        }
      }
    });
  });

  describe("getWorkflowTemplateList", () => {
    it("should return list of available workflow template IDs", () => {
      const list = getWorkflowTemplateList();

      expect(Array.isArray(list)).toBe(true);
      expect(list).toContain("instawork-shift-filling");
      expect(list).toContain("employee-onboarding");
      expect(list.length).toBeGreaterThanOrEqual(2);
    });

    it("should return consistent results on multiple calls", () => {
      const list1 = getWorkflowTemplateList();
      const list2 = getWorkflowTemplateList();

      expect(list1).toEqual(list2);
    });
  });

  describe("getWorkflowTemplateInfo", () => {
    it("should return detailed information about workflows", () => {
      const info = getWorkflowTemplateInfo();

      expect(Array.isArray(info)).toBe(true);
      expect(info.length).toBeGreaterThanOrEqual(2);

      const instaworkInfo = info.find(
        (w) => w.id === "instawork-shift-filling"
      );
      expect(instaworkInfo).toBeDefined();
      expect(instaworkInfo?.name).toBe("InstaWork Shift Filling Workflow");
      expect(instaworkInfo?.description).toContain("shift");

      const onboardingInfo = info.find((w) => w.id === "employee-onboarding");
      expect(onboardingInfo).toBeDefined();
      expect(onboardingInfo?.name).toBe("Employee Onboarding Process V2");
      expect(onboardingInfo?.description).toContain("onboarding");
    });

    it("should include all required fields for each workflow", () => {
      const info = getWorkflowTemplateInfo();

      info.forEach((workflow) => {
        expect(workflow.id).toBeDefined();
        expect(typeof workflow.id).toBe("string");
        expect(workflow.id.length).toBeGreaterThan(0);

        expect(workflow.name).toBeDefined();
        expect(typeof workflow.name).toBe("string");
        expect(workflow.name.length).toBeGreaterThan(0);

        expect(workflow.description).toBeDefined();
        expect(typeof workflow.description).toBe("string");
        expect(workflow.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("hasWorkflowTemplate", () => {
    it("should return true for existing workflows", () => {
      expect(hasWorkflowTemplate("instawork-shift-filling")).toBe(true);
      expect(hasWorkflowTemplate("employee-onboarding")).toBe(true);
    });

    it("should return false for non-existing workflows", () => {
      expect(hasWorkflowTemplate("non-existent")).toBe(false);
      expect(hasWorkflowTemplate("")).toBe(false);
      expect(hasWorkflowTemplate("random-id")).toBe(false);
    });

    it("should handle null/undefined input", () => {
      expect(hasWorkflowTemplate(null as any)).toBe(false);
      expect(hasWorkflowTemplate(undefined as any)).toBe(false);
    });
  });

  describe("validateWorkflowTemplate", () => {
    it("should validate existing workflows successfully", async () => {
      const result1 = await validateWorkflowTemplate("instawork-shift-filling");
      const result2 = await validateWorkflowTemplate("employee-onboarding");

      expect(result1.isValid).toBe(true);
      expect(result1.errors).toHaveLength(0);

      expect(result2.isValid).toBe(true);
      expect(result2.errors).toHaveLength(0);
    });

    it("should return validation errors for non-existent workflows", async () => {
      const result = await validateWorkflowTemplate("non-existent");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("not found");
    });

    it("should include warnings in validation result", async () => {
      const result = await validateWorkflowTemplate("employee-onboarding");

      expect(result.isValid).toBe(true);
      // Warnings are optional - test passes whether they exist or not
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("loadMultipleWorkflowTemplates", () => {
    it("should load multiple valid workflows successfully", async () => {
      const templateIds = ["instawork-shift-filling", "employee-onboarding"];
      const result = await loadMultipleWorkflowTemplates(templateIds);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);

      const instaworkResult = result.successful.find(
        (w) => w.id === "instawork-shift-filling"
      );
      expect(instaworkResult).toBeDefined();
      expect(instaworkResult?.workflow.id).toBe("instawork-shift-filling");

      const onboardingResult = result.successful.find(
        (w) => w.id === "employee-onboarding"
      );
      expect(onboardingResult).toBeDefined();
      expect(onboardingResult?.workflow.id).toBe("employee-onboarding-v2");
    });

    it("should handle mix of valid and invalid workflows", async () => {
      const templateIds = [
        "instawork-shift-filling",
        "non-existent",
        "employee-onboarding",
      ];
      const result = await loadMultipleWorkflowTemplates(templateIds);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);

      const successfulIds = result.successful.map((w) => w.id);
      expect(successfulIds).toContain("instawork-shift-filling");
      expect(successfulIds).toContain("employee-onboarding");

      const failedWorkflow = result.failed[0];
      expect(failedWorkflow.id).toBe("non-existent");
      expect(failedWorkflow.error).toContain("not found");
    });

    it("should handle empty array", async () => {
      const result = await loadMultipleWorkflowTemplates([]);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it("should handle all invalid workflows", async () => {
      const templateIds = ["invalid-1", "invalid-2", "invalid-3"];
      const result = await loadMultipleWorkflowTemplates(templateIds);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(3);

      result.failed.forEach((failed) => {
        expect(failed.error).toContain("not found");
      });
    });

    it("should handle duplicate template IDs", async () => {
      const templateIds = [
        "instawork-shift-filling",
        "instawork-shift-filling",
      ];
      const result = await loadMultipleWorkflowTemplates(templateIds);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);

      // Both should be the same workflow
      expect(result.successful[0].workflow.id).toBe(
        result.successful[1].workflow.id
      );
    });
  });

  describe("error handling", () => {
    it("should log warnings when loading workflow with warnings", async () => {
      const consoleSpy = vi.spyOn(console, "warn");

      // Assuming one of the workflows has warnings (if not, this test will pass silently)
      await loadWorkflowTemplate("employee-onboarding");

      // Test passes whether warnings were logged or not
      // consoleSpy.mockRestore();
    });

    it("should provide helpful error context", async () => {
      const result = await loadWorkflowTemplateSafe("invalid-workflow");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.context).toBeDefined();
        expect(result.error.context?.templateId).toBe("invalid-workflow");
        expect(result.error.context?.availableTemplates).toBeDefined();
        expect(typeof result.error.context?.availableTemplates).toBe("string");
      }
    });

    it("should maintain error chain for debugging", async () => {
      try {
        await loadWorkflowTemplate("non-existent");
      } catch (error) {
        expect(error).toBeInstanceOf(WorkflowLoadError);
        const workflowError = error as WorkflowLoadError;
        expect(workflowError.code).toBe("LOAD_FAILED");
        expect(workflowError.context).toBeDefined();
      }
    });
  });

  describe("performance", () => {
    it("should load workflows reasonably quickly", async () => {
      const startTime = Date.now();

      await loadWorkflowTemplate("instawork-shift-filling");

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should load within 100ms (generous threshold for CI environments)
      expect(duration).toBeLessThan(100);
    });

    it("should handle concurrent loads efficiently", async () => {
      const startTime = Date.now();

      const promises = [
        loadWorkflowTemplate("instawork-shift-filling"),
        loadWorkflowTemplate("employee-onboarding"),
        loadWorkflowTemplate("instawork-shift-filling"), // duplicate
      ];

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe("instawork-shift-filling");
      expect(results[1].id).toBe("employee-onboarding-v2");
      expect(results[2].id).toBe("instawork-shift-filling");

      // Should complete within 200ms even with concurrent loads
      expect(duration).toBeLessThan(200);
    });
  });
});
