/**
 * Error handling utilities for workflow data processing
 * Provides comprehensive error handling for malformed workflow data
 */

import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import {
  type ValidationResult,
  validateWorkflowV2WithDetails,
} from "./schema-validation";

// Error types for workflow processing
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export class WorkflowValidationError extends WorkflowError {
  constructor(
    message: string,
    public validationResult: ValidationResult,
    context?: Record<string, unknown>
  ) {
    super(message, "VALIDATION_FAILED", context);
    this.name = "WorkflowValidationError";
  }
}

export class WorkflowLoadError extends WorkflowError {
  constructor(
    message: string,
    public originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, "LOAD_FAILED", context);
    this.name = "WorkflowLoadError";
  }
}

export class WorkflowParseError extends WorkflowError {
  constructor(
    message: string,
    public originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, "PARSE_FAILED", context);
    this.name = "WorkflowParseError";
  }
}

// Result wrapper for safe operations
export interface SafeResult<T> {
  success: true;
  data: T;
  warnings?: string[];
}

export interface SafeError {
  success: false;
  error: WorkflowError;
  partialData?: unknown;
}

export type SafeWorkflowResult<T> = SafeResult<T> | SafeError;

/**
 * Safely loads and validates a workflow from JSON data
 */
export function safeLoadWorkflow(
  data: unknown,
  source?: string
): SafeWorkflowResult<WorkflowTemplateV2> {
  try {
    // First, try to parse if it's a string
    let parsedData: unknown = data;
    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch (parseError) {
        return {
          success: false,
          error: new WorkflowParseError(
            "Failed to parse workflow JSON",
            parseError instanceof Error
              ? parseError
              : new Error(String(parseError)),
            { source }
          ),
          partialData: data,
        };
      }
    }

    // Validate the parsed data
    const validationResult = validateWorkflowV2WithDetails(parsedData);

    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.map(
        (e) => `${e.path}: ${e.message}`
      );
      return {
        success: false,
        error: new WorkflowValidationError(
          `Workflow validation failed: ${errorMessages.join(", ")}`,
          validationResult,
          { source, errorCount: validationResult.errors.length }
        ),
        partialData: parsedData,
      };
    }

    // Convert warnings to string array
    const warnings =
      validationResult.warnings.length > 0
        ? validationResult.warnings.map((w) => `${w.path}: ${w.message}`)
        : undefined;

    return {
      success: true,
      data: parsedData as WorkflowTemplateV2,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: new WorkflowLoadError(
        "Unexpected error during workflow loading",
        error instanceof Error ? error : new Error(String(error)),
        { source }
      ),
      partialData: data,
    };
  }
}

/**
 * Safely loads a workflow from a file path
 */
export async function safeLoadWorkflowFromFile(
  filePath: string
): Promise<SafeWorkflowResult<WorkflowTemplateV2>> {
  try {
    const module = await import(filePath);
    const data = module.default || module;

    return safeLoadWorkflow(data, filePath);
  } catch (error) {
    return {
      success: false,
      error: new WorkflowLoadError(
        `Failed to load workflow from file: ${filePath}`,
        error instanceof Error ? error : new Error(String(error)),
        { filePath }
      ),
    };
  }
}

/**
 * Safely extracts goal data with fallback values
 */
export function safeExtractGoalData(goal: unknown): {
  id: string;
  name: string;
  description: string;
  order: number;
  constraintCount: number;
  policyCount: number;
  taskCount: number;
  formCount: number;
} {
  const fallback = {
    id: "unknown-goal",
    name: "Unknown Goal",
    description: "Goal data could not be parsed",
    order: 0,
    constraintCount: 0,
    policyCount: 0,
    taskCount: 0,
    formCount: 0,
  };

  if (!goal || typeof goal !== "object") {
    return fallback;
  }

  const g = goal as Record<string, unknown>;

  try {
    return {
      id: typeof g.id === "string" ? g.id : fallback.id,
      name: typeof g.name === "string" ? g.name : fallback.name,
      description:
        typeof g.description === "string"
          ? g.description
          : fallback.description,
      order: typeof g.order === "number" ? g.order : fallback.order,
      constraintCount: Array.isArray(g.constraints) ? g.constraints.length : 0,
      policyCount: Array.isArray(g.policies) ? g.policies.length : 0,
      taskCount: Array.isArray(g.tasks) ? g.tasks.length : 0,
      formCount: Array.isArray(g.forms) ? g.forms.length : 0,
    };
  } catch {
    return fallback;
  }
}

/**
 * Safely extracts workflow metadata with fallback values
 */
export function safeExtractWorkflowMetadata(workflow: unknown): {
  id: string;
  name: string;
  version: string;
  objective: string;
  author?: string;
  tags: string[];
} {
  const fallback = {
    id: "unknown-workflow",
    name: "Unknown Workflow",
    version: "unknown",
    objective: "Workflow data could not be parsed",
    tags: [],
  };

  if (!workflow || typeof workflow !== "object") {
    return fallback;
  }

  const w = workflow as Record<string, unknown>;

  try {
    const metadata = w.metadata as Record<string, unknown> | undefined;

    return {
      id: typeof w.id === "string" ? w.id : fallback.id,
      name: typeof w.name === "string" ? w.name : fallback.name,
      version: typeof w.version === "string" ? w.version : fallback.version,
      objective:
        typeof w.objective === "string" ? w.objective : fallback.objective,
      author:
        metadata && typeof metadata.author === "string"
          ? metadata.author
          : undefined,
      tags:
        metadata && Array.isArray(metadata.tags)
          ? metadata.tags.filter(
              (tag): tag is string => typeof tag === "string"
            )
          : [],
    };
  } catch {
    return fallback;
  }
}

/**
 * Creates a user-friendly error message from WorkflowError
 */
export function formatWorkflowError(error: WorkflowError): string {
  let message = error.message;

  if (error instanceof WorkflowValidationError) {
    const errors = error.validationResult.errors;
    if (errors.length > 0) {
      const topErrors = errors.slice(0, 3);
      const errorList = topErrors.map((e) => `• ${e.message}`).join("\n");
      message += `\n\nValidation errors:\n${errorList}`;

      if (errors.length > 3) {
        message += `\n• ... and ${errors.length - 3} more errors`;
      }
    }
  }

  if (error.context) {
    const contextInfo = Object.entries(error.context)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    if (contextInfo) {
      message += `\n\nContext: ${contextInfo}`;
    }
  }

  return message;
}

/**
 * Logs workflow errors with appropriate severity
 */
export function logWorkflowError(
  error: WorkflowError,
  logger: Console = console
): void {
  const formattedMessage = formatWorkflowError(error);

  if (error instanceof WorkflowValidationError) {
    logger.warn(`[Workflow Validation] ${formattedMessage}`);
  } else if (error instanceof WorkflowParseError) {
    logger.error(`[Workflow Parse] ${formattedMessage}`);
  } else if (error instanceof WorkflowLoadError) {
    logger.error(`[Workflow Load] ${formattedMessage}`);
  } else {
    logger.error(`[Workflow] ${formattedMessage}`);
  }

  // Log original error stack if available
  if (
    error instanceof WorkflowLoadError ||
    error instanceof WorkflowParseError
  ) {
    if (error.originalError?.stack) {
      logger.error(`Original error stack: ${error.originalError.stack}`);
    }
  }
}

/**
 * Retries workflow loading with fallback strategies
 */
export async function retryWorkflowLoad(
  loadFunction: () => Promise<SafeWorkflowResult<WorkflowTemplateV2>>,
  maxRetries = 2,
  backoffMs = 1000
): Promise<SafeWorkflowResult<WorkflowTemplateV2>> {
  let lastResult: SafeWorkflowResult<WorkflowTemplateV2>;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await loadFunction();

    if (lastResult.success) {
      return lastResult;
    }

    // Don't retry validation errors - they won't get better
    if (lastResult.error instanceof WorkflowValidationError) {
      break;
    }

    // Wait before retrying (except on last attempt)
    if (attempt < maxRetries) {
      await new Promise((resolve) =>
        setTimeout(resolve, backoffMs * (attempt + 1))
      );
    }
  }

  return lastResult!;
}

/**
 * Creates a sanitized version of workflow data for logging/debugging
 */
export function sanitizeWorkflowForLogging(
  workflow: unknown
): Record<string, unknown> {
  if (!workflow || typeof workflow !== "object") {
    return { type: typeof workflow, value: "non-object" };
  }

  const w = workflow as Record<string, unknown>;

  try {
    return {
      id: w.id,
      name: w.name,
      version: w.version,
      goalCount: Array.isArray(w.goals) ? w.goals.length : "not-array",
      hasMetadata: !!w.metadata,
      hasGlobalSettings: !!w.global_settings,
      hasTriggers: !!w.triggers,
      keys: Object.keys(w),
    };
  } catch {
    return { error: "failed-to-sanitize" };
  }
}

/**
 * Validates workflow data and returns detailed error information
 */
export function diagnoseWorkflowIssues(workflow: unknown): {
  isValid: boolean;
  summary: string;
  issues: Array<{
    severity: "error" | "warning";
    category: string;
    message: string;
    path?: string;
  }>;
  suggestions: string[];
} {
  const issues: Array<{
    severity: "error" | "warning";
    category: string;
    message: string;
    path?: string;
  }> = [];

  const suggestions: string[] = [];

  // Basic structure check
  if (!workflow || typeof workflow !== "object") {
    return {
      isValid: false,
      summary: "Workflow data is not a valid object",
      issues: [
        {
          severity: "error",
          category: "structure",
          message: `Expected object, got ${typeof workflow}`,
        },
      ],
      suggestions: [
        "Ensure the workflow data is a valid JSON object",
        "Check that the file was loaded correctly",
      ],
    };
  }

  // Run validation
  const validationResult = validateWorkflowV2WithDetails(workflow);

  // Convert validation errors to issues
  for (const error of validationResult.errors) {
    issues.push({
      severity: "error",
      category: getErrorCategory(error.code),
      message: error.message,
      path: error.path,
    });
  }

  for (const warning of validationResult.warnings) {
    issues.push({
      severity: "warning",
      category: getErrorCategory(warning.code),
      message: warning.message,
      path: warning.path,
    });
  }

  // Generate suggestions based on common issues
  if (issues.some((i) => i.category === "structure")) {
    suggestions.push(
      "Check that all required fields are present and have correct types"
    );
  }

  if (issues.some((i) => i.category === "enum")) {
    suggestions.push(
      "Verify that enum values (constraint types, form types, etc.) use valid options"
    );
  }

  if (issues.some((i) => i.category === "validation")) {
    suggestions.push(
      "Review field values for logical consistency (positive numbers, valid dates, etc.)"
    );
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  let summary = "";
  if (errorCount === 0 && warningCount === 0) {
    summary = "Workflow is valid";
  } else if (errorCount === 0) {
    summary = `Workflow is valid with ${warningCount} warning${warningCount !== 1 ? "s" : ""}`;
  } else {
    summary = `Workflow has ${errorCount} error${errorCount !== 1 ? "s" : ""}`;
    if (warningCount > 0) {
      summary += ` and ${warningCount} warning${warningCount !== 1 ? "s" : ""}`;
    }
  }

  return {
    isValid: validationResult.isValid,
    summary,
    issues,
    suggestions,
  };
}

function getErrorCategory(code: string): string {
  switch (code) {
    case "MISSING_REQUIRED_FIELD":
    case "INVALID_TYPE":
      return "structure";
    case "INVALID_ENUM_VALUE":
      return "enum";
    case "INVALID_VALUE":
    case "INVALID_DATE_FORMAT":
      return "validation";
    case "MISSING_RECOMMENDED_FIELD":
      return "recommendation";
    default:
      return "other";
  }
}
