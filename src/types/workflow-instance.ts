/**
 * Workflow Instance Types
 *
 * Defines the runtime execution state for workflow templates.
 * Separates immutable templates (blueprints) from mutable instances (execution state).
 */

// Common execution status for all workflow elements
export type ExecutionStatus =
  | "NOT_STARTED" // Element hasn't begun execution
  | "ACTIVE" // Currently executing or available for execution
  | "COMPLETED" // Successfully completed
  | "FAILED" // Failed during execution
  | "CANCELLED" // Manually cancelled or stopped
  | "SKIPPED" // Skipped due to conditions or constraints
  | "BLOCKED"; // Blocked by dependencies or constraints

// Base runtime envelope for all workflow element instances
export interface RuntimeEnvelope {
  id: string; // Unique instance ID
  templateId: string; // Reference to template element ID
  status: ExecutionStatus; // Current execution status
  createdAt: Date; // When instance was created
  updatedAt: Date; // Last status update
  parentInstanceId?: string; // Parent instance for hierarchy traversal
  ctx?: Record<string, any>; // Runtime context and results
}

// Goal-specific instance data
export interface GoalInstance extends RuntimeEnvelope {
  progressPercent: number; // 0-100 completion percentage
  activatedAt?: Date; // When goal became active
  completedAt?: Date; // When goal was completed
  timeoutAt?: Date; // When goal will timeout
  outputs?: Record<string, any>; // Goal output data
}

// Constraint-specific instance data
export interface ConstraintInstance extends RuntimeEnvelope {
  satisfied: boolean | null; // null = not evaluated, true/false = result
  lastCheckedAt?: Date; // Last constraint evaluation time
  violationCount: number; // Number of times constraint was violated
  enforcement:
    | "hard_stop"
    | "block_progression"
    | "require_approval"
    | "warn"
    | "skip_workflow"
    | "delay_until_allowed"
    | "filter_recipients"
    | "content_review"
    | "block_until_met"
    | "block_duplicate";
  violationDetails?: string; // Details about constraint violation
}

// Policy-specific instance data
export interface PolicyInstance extends RuntimeEnvelope {
  fireCount: number; // Number of times policy has been triggered
  lastTriggeredAt?: Date; // Last time policy was triggered
  evaluationHistory: Array<{
    // History of policy evaluations
    timestamp: Date;
    conditionMet: boolean;
    actionTaken?: string;
    result?: any;
  }>;
}

// Task-specific instance data
export interface TaskInstance extends RuntimeEnvelope {
  assigneeId?: string; // ID of assigned human or agent
  assignedAt?: Date; // When task was assigned
  startedAt?: Date; // When work began
  completedAt?: Date; // When task was completed
  dueAt?: Date; // Task deadline
  result?: any; // Task execution result
  inputs?: Record<string, any>; // Input data provided to task
  outputs?: Record<string, any>; // Output data from task execution
  retryCount: number; // Number of retry attempts
  estimatedDuration?: number; // Estimated duration in minutes
}

// Form-specific instance data
export interface FormInstance extends RuntimeEnvelope {
  submittedAt?: Date; // When form was submitted
  validatedAt?: Date; // When form validation was completed
  fields: Record<string, FieldInstance>; // Field-level state
  validationErrors?: Record<string, string>; // Field validation errors
  submissionResult?: any; // Result of form submission
}

// Individual form field instance
export interface FieldInstance {
  value: any; // Current field value
  dirty: boolean; // Has been modified by user
  touched: boolean; // Has been focused/interacted with
  valid: boolean | null; // Validation status
  error?: string; // Validation error message
  updatedAt: Date; // Last update timestamp
}

// Root workflow instance containing all element instances
export interface WorkflowInstance {
  id: string; // Unique workflow instance ID
  templateId: string; // Reference to workflow template
  templateVersion: string; // Template version for drift detection
  status: ExecutionStatus; // Overall workflow status
  createdAt: Date; // Instance creation time
  updatedAt: Date; // Last update time
  startedAt?: Date; // Execution start time
  completedAt?: Date; // Execution completion time

  // Normalized flat storage for performance
  nodeMap: Record<string, RuntimeEnvelope>; // instanceId -> RuntimeEnvelope

  // Fast lookup indexes
  templateToInstanceMap: Record<string, string>; // templateId -> instanceId

  // Runtime context and metadata
  context: Record<string, any>; // Global workflow context
  metadata: {
    scenario?: string; // Development scenario name
    simulationSpeed?: number; // For development simulation
    tags?: string[]; // Runtime tags
  };
}

// Factory functions for creating instances
export interface InstanceFactory {
  createGoalInstance(templateId: string, parentId?: string): GoalInstance;
  createConstraintInstance(
    templateId: string,
    parentId: string
  ): ConstraintInstance;
  createPolicyInstance(templateId: string, parentId: string): PolicyInstance;
  createTaskInstance(templateId: string, parentId: string): TaskInstance;
  createFormInstance(templateId: string, parentId: string): FormInstance;
}

// Type guards for instance types
export function isGoalInstance(
  instance: RuntimeEnvelope
): instance is GoalInstance {
  return "progressPercent" in instance;
}

export function isConstraintInstance(
  instance: RuntimeEnvelope
): instance is ConstraintInstance {
  return "satisfied" in instance && "violationCount" in instance;
}

export function isPolicyInstance(
  instance: RuntimeEnvelope
): instance is PolicyInstance {
  return "fireCount" in instance && "evaluationHistory" in instance;
}

export function isTaskInstance(
  instance: RuntimeEnvelope
): instance is TaskInstance {
  return "retryCount" in instance;
}

export function isFormInstance(
  instance: RuntimeEnvelope
): instance is FormInstance {
  return "fields" in instance;
}

// Development scenario types for testing different execution states
export interface ExecutionScenario {
  name: string;
  description: string;
  instance: WorkflowInstance;
}

export type ScenarioType =
  | "fresh_start" // All elements NOT_STARTED
  | "in_progress" // Mixed states with some active elements
  | "happy_path" // Successful completion path
  | "blocked_constraint" // Blocked by constraint violation
  | "failed_task" // Task execution failure
  | "policy_triggered" // Policies actively firing
  | "form_partial" // Forms partially filled
  | "timeout_scenario"; // Elements approaching timeouts
