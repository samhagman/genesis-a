import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import {
  safeLoadWorkflow,
  WorkflowLoadError,
  logWorkflowError,
  retryWorkflowLoad,
  type SafeWorkflowResult,
} from "@/utils/error-handling";
import employeeOnboardingV2Data from "./employee-onboarding-v2.json";
import instaworkShiftFillingData from "./instawork-shift-filling.json";

// Registry of available workflow templates
const WORKFLOW_REGISTRY = {
  "instawork-shift-filling": {
    data: instaworkShiftFillingData,
    name: "InstaWork Shift Filling Workflow",
    description:
      "Automated workflow for filling shift positions with qualified workers",
  },
  "employee-onboarding": {
    data: employeeOnboardingV2Data,
    name: "Employee Onboarding Process V2",
    description:
      "Comprehensive employee onboarding workflow with automated tasks",
  },
} as const;

type WorkflowTemplateId = keyof typeof WORKFLOW_REGISTRY;

// Unified V2 workflow loading system with comprehensive error handling
export async function loadWorkflowTemplate(
  templateId: string
): Promise<WorkflowTemplateV2> {
  const result = await loadWorkflowTemplateSafe(templateId);

  if (!result.success) {
    logWorkflowError(result.error);
    throw result.error;
  }

  // Log warnings if present
  if (result.warnings && result.warnings.length > 0) {
    console.warn(
      `[Workflow Load] Loaded workflow "${templateId}" with warnings:`
    );
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  return result.data;
}

// Safe workflow loading that returns result object instead of throwing
export async function loadWorkflowTemplateSafe(
  templateId: string
): Promise<SafeWorkflowResult<WorkflowTemplateV2>> {
  // Check if template exists in registry
  if (!(templateId in WORKFLOW_REGISTRY)) {
    const availableIds = Object.keys(WORKFLOW_REGISTRY).join(", ");
    return {
      success: false,
      error: new WorkflowLoadError(
        `Workflow template "${templateId}" not found`,
        undefined,
        { templateId, availableTemplates: availableIds }
      ),
    };
  }

  const templateInfo = WORKFLOW_REGISTRY[templateId as WorkflowTemplateId];

  // Load with retry logic for network/file system issues
  return await retryWorkflowLoad(
    async () => {
      return safeLoadWorkflow(templateInfo.data, `registry:${templateId}`);
    },
    2,
    500
  );
}

// Export list of available workflow templates
export function getWorkflowTemplateList(): string[] {
  return Object.keys(WORKFLOW_REGISTRY);
}

// Get detailed information about available workflow templates
export function getWorkflowTemplateInfo() {
  return Object.entries(WORKFLOW_REGISTRY).map(([id, info]) => ({
    id,
    name: info.name,
    description: info.description,
  }));
}

// Check if a workflow template exists
export function hasWorkflowTemplate(templateId: string): boolean {
  return templateId in WORKFLOW_REGISTRY;
}

// Validate a workflow template without loading it fully
export async function validateWorkflowTemplate(templateId: string): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const result = await loadWorkflowTemplateSafe(templateId);

  if (!result.success) {
    return {
      isValid: false,
      errors: [result.error.message],
      warnings: [],
    };
  }

  return {
    isValid: true,
    errors: [],
    warnings: result.warnings || [],
  };
}

// Load multiple workflows safely
export async function loadMultipleWorkflowTemplates(
  templateIds: string[]
): Promise<{
  successful: Array<{ id: string; workflow: WorkflowTemplateV2 }>;
  failed: Array<{ id: string; error: string }>;
}> {
  const results = await Promise.allSettled(
    templateIds.map(async (id) => {
      const result = await loadWorkflowTemplateSafe(id);
      return { id, result };
    })
  );

  const successful: Array<{ id: string; workflow: WorkflowTemplateV2 }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  results.forEach((promiseResult) => {
    if (promiseResult.status === "fulfilled") {
      const { id, result } = promiseResult.value;
      if (result.success) {
        successful.push({ id, workflow: result.data });
      } else {
        failed.push({ id, error: result.error.message });
      }
    } else {
      failed.push({ id: "unknown", error: promiseResult.reason });
    }
  });

  return { successful, failed };
}

// Export types
export type { WorkflowTemplateId };

// Re-export error handling utilities for convenience
export {
  WorkflowError,
  WorkflowValidationError,
  WorkflowLoadError,
  WorkflowParseError,
  diagnoseWorkflowIssues,
  formatWorkflowError,
} from "@/utils/error-handling";
