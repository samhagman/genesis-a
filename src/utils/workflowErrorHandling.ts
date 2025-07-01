/**
 * Workflow Error Handling Utilities
 *
 * Production error handling for workflow operations following Cloudflare best practices.
 * Provides structured error handling and user-friendly error messages.
 */

/**
 * Custom error class for workflow operations
 */
export class WorkflowOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public workflowId?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WorkflowOperationError";
  }
}

/**
 * Validation error for workflow schema issues
 */
export class WorkflowValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown,
    public workflowId?: string
  ) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

/**
 * Error for workflow state management issues
 */
export class WorkflowStateError extends Error {
  constructor(
    message: string,
    public state?: string,
    public workflowId?: string
  ) {
    super(message);
    this.name = "WorkflowStateError";
  }
}

/**
 * Handle workflow errors and return user-friendly messages
 * @param error The error that occurred
 * @param operation The operation that was being performed
 * @param workflowId Optional workflow ID for context
 * @returns User-friendly error message
 */
export function handleWorkflowError(
  error: unknown,
  operation: string,
  workflowId?: string
): string {
  console.error(`Workflow operation failed: ${operation}`, error);

  // Log structured error data for production monitoring
  if (workflowId && error instanceof Error) {
    console.error(`Workflow ID: ${workflowId}`, {
      operation,
      error: error.message,
      stack: error.stack,
      workflowId,
    });
  }

  // Handle specific workflow errors
  if (error instanceof WorkflowOperationError) {
    return `Failed to ${operation}: ${error.message}`;
  }

  if (error instanceof WorkflowValidationError) {
    const fieldInfo = error.field ? ` (field: ${error.field})` : "";
    return `Workflow validation failed: ${error.message}${fieldInfo}. Please check your input and try again.`;
  }

  if (error instanceof WorkflowStateError) {
    return `Workflow state error: ${error.message}. Try reloading the workflow or creating a new one.`;
  }

  // Handle common error patterns
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage?.includes("validation")) {
    return `Workflow validation failed: ${errorMessage}. Please check your input and try again.`;
  }

  if (errorMessage?.includes("not found")) {
    return `Could not find the specified workflow element. Use 'viewCurrentWorkflow' to see available options.`;
  }

  if (errorMessage?.includes("No workflow loaded")) {
    return `No workflow is currently loaded. Use 'createWorkflow' to start a new workflow or load an existing one.`;
  }

  if (errorMessage?.includes("timeout")) {
    return "The operation timed out. This might be due to network issues or high server load. Please try again.";
  }

  if (
    errorMessage?.includes("unauthorized") ||
    errorMessage?.includes("permission")
  ) {
    return `You don't have permission to perform this operation. Please check your access rights.`;
  }

  if (errorMessage?.includes("rate limit")) {
    return "Too many requests. Please wait a moment before trying again.";
  }

  // Generic error handling
  return `Sorry, I encountered an error while trying to ${operation}. Please try again or rephrase your request.`;
}

/**
 * Create a WorkflowOperationError with structured details
 * @param message Error message
 * @param operation Operation that failed
 * @param workflowId Optional workflow ID
 * @param details Additional error details
 * @returns WorkflowOperationError instance
 */
export function createWorkflowError(
  message: string,
  operation: string,
  workflowId?: string,
  details?: Record<string, unknown>
): WorkflowOperationError {
  return new WorkflowOperationError(message, operation, workflowId, details);
}

/**
 * Wrap a workflow operation with error handling
 * @param operation Function to execute
 * @param operationName Name of the operation for error reporting
 * @param workflowId Optional workflow ID for context
 * @returns Promise with handled errors
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  workflowId?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const errorMessage = handleWorkflowError(error, operationName, workflowId);
    return { success: false, error: errorMessage };
  }
}

/**
 * Validate required fields and throw validation error if missing
 * @param obj Object to validate
 * @param requiredFields Array of required field names
 * @param workflowId Optional workflow ID for context
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  requiredFields: string[],
  workflowId?: string
): void {
  for (const field of requiredFields) {
    const value = obj[field];
    if (value === undefined || value === null || value === "") {
      throw new WorkflowValidationError(
        `Required field '${field}' is missing`,
        field,
        value,
        workflowId
      );
    }
  }
}

/**
 * Validate that a value is not empty (string, array, object)
 * @param value Value to validate
 * @param fieldName Name of the field being validated
 * @param workflowId Optional workflow ID for context
 */
export function validateNotEmpty(
  value: unknown,
  fieldName: string,
  workflowId?: string
): void {
  if (value === null || value === undefined) {
    throw new WorkflowValidationError(
      `Field '${fieldName}' cannot be null or undefined`,
      fieldName,
      value,
      workflowId
    );
  }

  if (typeof value === "string" && value.trim().length === 0) {
    throw new WorkflowValidationError(
      `Field '${fieldName}' cannot be empty`,
      fieldName,
      value,
      workflowId
    );
  }

  if (Array.isArray(value) && value.length === 0) {
    throw new WorkflowValidationError(
      `Field '${fieldName}' must contain at least one item`,
      fieldName,
      value,
      workflowId
    );
  }
}

/**
 * Log workflow operation for production monitoring
 * @param operation Operation name
 * @param workflowId Workflow ID
 * @param details Additional details to log
 */
export function logWorkflowOperation(
  operation: string,
  workflowId?: string,
  details?: Record<string, unknown>
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    workflowId,
    ...details,
  };

  console.log(`[Workflow Operation] ${operation}`, logData);
}
