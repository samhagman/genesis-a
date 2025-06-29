/**
 * Runtime validation utilities for V2 workflow schema
 * Provides comprehensive validation for workflow data integrity
 */

// Type imports removed as validation uses runtime checking with unknown types

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

// Constraint type validation
const VALID_CONSTRAINT_TYPES = [
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
] as const;

const VALID_ENFORCEMENT_LEVELS = [
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
] as const;

const VALID_FORM_TYPES = ["structured", "conversational", "automated"] as const;
const VALID_ASSIGNEE_TYPES = ["ai_agent", "human"] as const;
const VALID_TRIGGER_TYPES = ["webhook", "schedule", "manual", "event"] as const;

/**
 * Validates a complete V2 workflow template
 */
export function validateWorkflowV2(workflow: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic structure validation
  if (!workflow || typeof workflow !== "object") {
    return {
      isValid: false,
      errors: [
        {
          path: "root",
          message: "Workflow must be an object",
          code: "INVALID_TYPE",
        },
      ],
      warnings: [],
    };
  }

  const w = workflow as Record<string, unknown>;

  // Required fields validation
  validateRequiredField(w, "id", "string", "root", errors);
  validateRequiredField(w, "name", "string", "root", errors);
  validateRequiredField(w, "version", "string", "root", errors);
  validateRequiredField(w, "objective", "string", "root", errors);
  validateRequiredField(w, "goals", "array", "root", errors);

  // Version validation
  if (w.version !== "2.0") {
    warnings.push({
      path: "version",
      message: "Expected version '2.0' for V2 workflow",
      code: "VERSION_MISMATCH",
    });
  }

  // Metadata validation
  if (w.metadata) {
    validateMetadata(w.metadata, "metadata", errors, warnings);
  }

  // Global settings validation
  if (w.global_settings) {
    validateGlobalSettings(
      w.global_settings,
      "global_settings",
      errors,
      warnings
    );
  }

  // Triggers validation
  if (w.triggers) {
    validateTriggers(w.triggers, "triggers", errors, warnings);
  }

  // Goals validation
  if (Array.isArray(w.goals)) {
    w.goals.forEach((goal, index) => {
      validateGoal(goal, `goals[${index}]`, errors, warnings);
    });
  } else if (w.goals) {
    errors.push({
      path: "goals",
      message: "Goals must be an array",
      code: "INVALID_TYPE",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates workflow metadata
 */
function validateMetadata(
  metadata: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!metadata || typeof metadata !== "object") {
    errors.push({
      path,
      message: "Metadata must be an object",
      code: "INVALID_TYPE",
    });
    return;
  }

  const m = metadata as Record<string, unknown>;

  validateRequiredField(m, "author", "string", path, errors);
  validateRequiredField(m, "created_at", "string", path, errors);
  validateRequiredField(m, "last_modified", "string", path, errors);
  validateRequiredField(m, "tags", "array", path, errors);

  // Date format validation
  if (typeof m.created_at === "string" && !isValidDateString(m.created_at)) {
    warnings.push({
      path: `${path}.created_at`,
      message: "Created date should be in ISO format",
      code: "INVALID_DATE_FORMAT",
    });
  }

  if (
    typeof m.last_modified === "string" &&
    !isValidDateString(m.last_modified)
  ) {
    warnings.push({
      path: `${path}.last_modified`,
      message: "Last modified date should be in ISO format",
      code: "INVALID_DATE_FORMAT",
    });
  }
}

/**
 * Validates global settings
 */
function validateGlobalSettings(
  settings: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!settings || typeof settings !== "object") {
    errors.push({
      path,
      message: "Global settings must be an object",
      code: "INVALID_TYPE",
    });
    return;
  }

  const s = settings as Record<string, unknown>;

  if (s.max_execution_time_hours !== undefined) {
    validateField(s, "max_execution_time_hours", "number", path, errors);
    if (
      typeof s.max_execution_time_hours === "number" &&
      s.max_execution_time_hours <= 0
    ) {
      warnings.push({
        path: `${path}.max_execution_time_hours`,
        message: "Execution time should be positive",
        code: "INVALID_VALUE",
      });
    }
  }

  if (s.data_retention_days !== undefined) {
    validateField(s, "data_retention_days", "number", path, errors);
  }

  if (s.default_timezone !== undefined) {
    validateField(s, "default_timezone", "string", path, errors);
  }
}

/**
 * Validates workflow triggers
 */
function validateTriggers(
  triggers: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(triggers)) {
    errors.push({
      path,
      message: "Triggers must be an array",
      code: "INVALID_TYPE",
    });
    return;
  }

  triggers.forEach((trigger, index) => {
    const triggerPath = `${path}[${index}]`;

    if (!trigger || typeof trigger !== "object") {
      errors.push({
        path: triggerPath,
        message: "Trigger must be an object",
        code: "INVALID_TYPE",
      });
      return;
    }

    const t = trigger as Record<string, unknown>;
    validateRequiredField(t, "type", "string", triggerPath, errors);

    if (
      typeof t.type === "string" &&
      !VALID_TRIGGER_TYPES.includes(
        t.type as (typeof VALID_TRIGGER_TYPES)[number]
      )
    ) {
      errors.push({
        path: `${triggerPath}.type`,
        message: `Invalid trigger type. Must be one of: ${VALID_TRIGGER_TYPES.join(", ")}`,
        code: "INVALID_ENUM_VALUE",
      });
    }
  });
}

/**
 * Validates a single goal
 */
function validateGoal(
  goal: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!goal || typeof goal !== "object") {
    errors.push({
      path,
      message: "Goal must be an object",
      code: "INVALID_TYPE",
    });
    return;
  }

  const g = goal as Record<string, unknown>;

  // Required fields
  validateRequiredField(g, "id", "string", path, errors);
  validateRequiredField(g, "name", "string", path, errors);
  validateRequiredField(g, "description", "string", path, errors);
  validateRequiredField(g, "order", "number", path, errors);
  validateRequiredField(g, "constraints", "array", path, errors);
  validateRequiredField(g, "policies", "array", path, errors);
  validateRequiredField(g, "tasks", "array", path, errors);
  validateRequiredField(g, "forms", "array", path, errors);

  // Validate arrays
  if (Array.isArray(g.constraints)) {
    g.constraints.forEach((constraint, index) => {
      validateConstraint(
        constraint,
        `${path}.constraints[${index}]`,
        errors,
        warnings
      );
    });
  } else if (g.constraints) {
    errors.push({
      path: `${path}.constraints`,
      message: "Constraints must be an array",
      code: "INVALID_TYPE",
    });
  }

  if (Array.isArray(g.policies)) {
    g.policies.forEach((policy, index) => {
      validatePolicy(policy, `${path}.policies[${index}]`, errors, warnings);
    });
  } else if (g.policies) {
    errors.push({
      path: `${path}.policies`,
      message: "Policies must be an array",
      code: "INVALID_TYPE",
    });
  }

  if (Array.isArray(g.tasks)) {
    g.tasks.forEach((task, index) => {
      validateTask(task, `${path}.tasks[${index}]`, errors, warnings);
    });
  } else if (g.tasks) {
    errors.push({
      path: `${path}.tasks`,
      message: "Tasks must be an array",
      code: "INVALID_TYPE",
    });
  }

  if (Array.isArray(g.forms)) {
    g.forms.forEach((form, index) => {
      validateForm(form, `${path}.forms[${index}]`, errors, warnings);
    });
  } else if (g.forms) {
    errors.push({
      path: `${path}.forms`,
      message: "Forms must be an array",
      code: "INVALID_TYPE",
    });
  }

  // Order validation
  if (typeof g.order === "number" && g.order < 1) {
    warnings.push({
      path: `${path}.order`,
      message: "Goal order should be 1 or greater",
      code: "INVALID_VALUE",
    });
  }
}

/**
 * Validates a constraint
 */
function validateConstraint(
  constraint: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!constraint || typeof constraint !== "object") {
    errors.push({
      path,
      message: "Constraint must be an object",
      code: "INVALID_TYPE",
    });
    return;
  }

  const c = constraint as Record<string, unknown>;

  validateRequiredField(c, "id", "string", path, errors);
  validateRequiredField(c, "description", "string", path, errors);
  validateRequiredField(c, "type", "string", path, errors);
  validateRequiredField(c, "enforcement", "string", path, errors);

  // Enum validation
  if (
    typeof c.type === "string" &&
    !VALID_CONSTRAINT_TYPES.includes(
      c.type as (typeof VALID_CONSTRAINT_TYPES)[number]
    )
  ) {
    errors.push({
      path: `${path}.type`,
      message: `Invalid constraint type. Must be one of: ${VALID_CONSTRAINT_TYPES.join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  if (
    typeof c.enforcement === "string" &&
    !VALID_ENFORCEMENT_LEVELS.includes(
      c.enforcement as (typeof VALID_ENFORCEMENT_LEVELS)[number]
    )
  ) {
    errors.push({
      path: `${path}.enforcement`,
      message: `Invalid enforcement level. Must be one of: ${VALID_ENFORCEMENT_LEVELS.join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }
}

/**
 * Validates a policy
 */
function validatePolicy(
  policy: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!policy || typeof policy !== "object") {
    errors.push({
      path,
      message: "Policy must be an object",
      code: "INVALID_TYPE",
    });
    return;
  }

  const p = policy as Record<string, unknown>;

  validateRequiredField(p, "id", "string", path, errors);
  validateRequiredField(p, "name", "string", path, errors);
  validateRequiredField(p, "if", "object", path, errors);
  validateRequiredField(p, "then", "object", path, errors);

  // Validate then action
  if (p.then && typeof p.then === "object") {
    const thenObj = p.then as Record<string, unknown>;
    validateRequiredField(thenObj, "action", "string", `${path}.then`, errors);
    validateRequiredField(thenObj, "params", "object", `${path}.then`, errors);
  }
}

/**
 * Validates a task
 */
function validateTask(
  task: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!task || typeof task !== "object") {
    errors.push({
      path,
      message: "Task must be an object",
      code: "INVALID_TYPE",
    });
    return;
  }

  const t = task as Record<string, unknown>;

  validateRequiredField(t, "id", "string", path, errors);
  validateRequiredField(t, "description", "string", path, errors);
  validateRequiredField(t, "assignee", "object", path, errors);

  // Validate assignee
  if (t.assignee && typeof t.assignee === "object") {
    const assignee = t.assignee as Record<string, unknown>;
    validateRequiredField(
      assignee,
      "type",
      "string",
      `${path}.assignee`,
      errors
    );

    if (
      typeof assignee.type === "string" &&
      !VALID_ASSIGNEE_TYPES.includes(
        assignee.type as (typeof VALID_ASSIGNEE_TYPES)[number]
      )
    ) {
      errors.push({
        path: `${path}.assignee.type`,
        message: `Invalid assignee type. Must be one of: ${VALID_ASSIGNEE_TYPES.join(", ")}`,
        code: "INVALID_ENUM_VALUE",
      });
    }

    // Type-specific validation
    if (assignee.type === "ai_agent") {
      if (
        !assignee.model &&
        (!assignee.capabilities || !Array.isArray(assignee.capabilities))
      ) {
        warnings.push({
          path: `${path}.assignee`,
          message: "AI agents should have a model or capabilities defined",
          code: "MISSING_RECOMMENDED_FIELD",
        });
      }
    }
  }

  // Duration validation
  if (t.timeout_minutes !== undefined) {
    validateField(t, "timeout_minutes", "number", path, errors);
    if (typeof t.timeout_minutes === "number" && t.timeout_minutes <= 0) {
      warnings.push({
        path: `${path}.timeout_minutes`,
        message: "Timeout should be positive",
        code: "INVALID_VALUE",
      });
    }
  }
}

/**
 * Validates a form
 */
function validateForm(
  form: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!form || typeof form !== "object") {
    errors.push({
      path,
      message: "Form must be an object",
      code: "INVALID_TYPE",
    });
    return;
  }

  const f = form as Record<string, unknown>;

  validateRequiredField(f, "id", "string", path, errors);
  validateRequiredField(f, "name", "string", path, errors);
  validateRequiredField(f, "type", "string", path, errors);

  // Enum validation
  if (
    typeof f.type === "string" &&
    !VALID_FORM_TYPES.includes(f.type as (typeof VALID_FORM_TYPES)[number])
  ) {
    errors.push({
      path: `${path}.type`,
      message: `Invalid form type. Must be one of: ${VALID_FORM_TYPES.join(", ")}`,
      code: "INVALID_ENUM_VALUE",
    });
  }

  // Type-specific validation
  if (f.type === "structured") {
    if (!f.schema && !f.fields && !f.sections) {
      warnings.push({
        path: `${path}`,
        message:
          "Structured forms should have schema, fields, or sections defined",
        code: "MISSING_RECOMMENDED_FIELD",
      });
    }
  }

  if (f.type === "conversational" && !f.initial_prompt) {
    warnings.push({
      path: `${path}`,
      message: "Conversational forms should have an initial_prompt",
      code: "MISSING_RECOMMENDED_FIELD",
    });
  }

  if (f.type === "automated" && !f.data_sources && !f.generation) {
    warnings.push({
      path: `${path}`,
      message: "Automated forms should have data_sources or generation config",
      code: "MISSING_RECOMMENDED_FIELD",
    });
  }
}

// Helper functions
function validateRequiredField(
  obj: Record<string, unknown>,
  field: string,
  expectedType: string,
  path: string,
  errors: ValidationError[]
): void {
  if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
    errors.push({
      path: `${path}.${field}`,
      message: `Required field '${field}' is missing`,
      code: "MISSING_REQUIRED_FIELD",
    });
    return;
  }

  const actualType = Array.isArray(obj[field]) ? "array" : typeof obj[field];

  if (actualType !== expectedType) {
    errors.push({
      path: `${path}.${field}`,
      message: `Field '${field}' must be of type ${expectedType}, got ${actualType}`,
      code: "INVALID_TYPE",
    });
  }
}

function validateField(
  obj: Record<string, unknown>,
  field: string,
  expectedType: "string" | "number" | "boolean" | "object",
  path: string,
  errors: ValidationError[]
): void {
  const value = obj[field];
  if (value !== undefined) {
    const actualType = typeof value;
    const isValid =
      (expectedType === "string" && actualType === "string") ||
      (expectedType === "number" && actualType === "number") ||
      (expectedType === "boolean" && actualType === "boolean") ||
      (expectedType === "object" && actualType === "object");

    if (!isValid) {
      errors.push({
        path: `${path}.${field}`,
        message: `Field '${field}' must be of type ${expectedType}`,
        code: "INVALID_TYPE",
      });
    }
  }
}

function isValidDateString(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !Number.isNaN(date.getTime()) && dateStr.includes("T"); // Basic ISO check
}

/**
 * Quick validation function for runtime checks
 */
export function isValidWorkflowV2(workflow: unknown): boolean {
  const result = validateWorkflowV2(workflow);
  return result.isValid;
}

/**
 * Validation with detailed error reporting
 */
export function validateWorkflowV2WithDetails(
  workflow: unknown
): ValidationResult {
  return validateWorkflowV2(workflow);
}

// ============================================================================
// Simple validation functions for WorkflowEditingTools
// These functions throw errors instead of returning ValidationResult objects
// ============================================================================

/**
 * Validates a WorkflowTemplateV2 and throws an error if invalid
 */
export function validateWorkflowV2Strict(workflow: unknown): void {
  const result = validateWorkflowV2(workflow);
  if (!result.isValid) {
    const errorMessages = result.errors
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    throw new Error(`Workflow validation failed: ${errorMessages}`);
  }
}

/**
 * Validates a Goal and throws an error if invalid
 */
export function validateGoalStrict(goal: unknown): void {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validateGoal(goal, "goal", errors, warnings);

  if (errors.length > 0) {
    const errorMessages = errors
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    throw new Error(`Goal validation failed: ${errorMessages}`);
  }
}

/**
 * Validates a Constraint and throws an error if invalid
 */
export function validateConstraintStrict(constraint: unknown): void {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validateConstraint(constraint, "constraint", errors, warnings);

  if (errors.length > 0) {
    const errorMessages = errors
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    throw new Error(`Constraint validation failed: ${errorMessages}`);
  }
}

/**
 * Validates a Policy and throws an error if invalid
 */
export function validatePolicyStrict(policy: unknown): void {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validatePolicy(policy, "policy", errors, warnings);

  if (errors.length > 0) {
    const errorMessages = errors
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    throw new Error(`Policy validation failed: ${errorMessages}`);
  }
}

/**
 * Validates a Task and throws an error if invalid
 */
export function validateTaskStrict(task: unknown): void {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validateTask(task, "task", errors, warnings);

  if (errors.length > 0) {
    const errorMessages = errors
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    throw new Error(`Task validation failed: ${errorMessages}`);
  }
}

/**
 * Validates a Form and throws an error if invalid
 */
export function validateFormStrict(form: unknown): void {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validateForm(form, "form", errors, warnings);

  if (errors.length > 0) {
    const errorMessages = errors
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    throw new Error(`Form validation failed: ${errorMessages}`);
  }
}
