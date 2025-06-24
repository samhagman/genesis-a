/**
 * Genesis V2 Workflow Schema Types
 *
 * This file defines the complete TypeScript interfaces for the V2 workflow schema,
 * supporting Goals + Constraints + Policies + Tasks + Forms with AI agent and human task assignment.
 */

// ============================================================================
// Core Workflow Elements
// ============================================================================

/**
 * Constraint: Declarative rules that define boundaries and guardrails
 * These are NOT action items, but rather rules that must be followed
 */
export interface Constraint {
  id: string;
  description: string;
  type:
    | "time_limit"
    | "data_validation"
    | "business_rule"
    | "rate_limit"
    | "access_control"
    | "timing"
    | "change_management"
    | "data_protection"
    | "privacy"
    | "content_validation";
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
  value?: any;
  unit?: string;
  condition?: string;
  required_fields?: string[];
  scope?: string;
  limit?: number;
  max_value?: string;
  check?: string;
  rule?: string;
  allowed_promises?: string[];
  operations?: string[];
  audit?: boolean;
  approval_required?: boolean;
  approver?: string;
  anonymization?: string;
  min_group_size?: number;
}

/**
 * Policy: If-then logic that triggers actions based on conditions
 * Defines automated decision-making within the workflow
 */
export interface Policy {
  id: string;
  name: string;
  if: PolicyCondition;
  then: PolicyAction;
}

export interface PolicyCondition {
  condition?: string;
  type?: string;
  field?: string;
  operator?: string;
  value?: any;
  all_of?: PolicyCondition[];
  any_of?: PolicyCondition[];
}

export interface PolicyAction {
  action: string;
  params: Record<string, any>;
}

/**
 * Task: Specific work items assignable to humans or AI agents
 * High-level assignments, not detailed step-by-step instructions
 */
export interface Task {
  id: string;
  description: string;
  assignee: TaskAssignee;
  inputs?: string[];
  outputs?: string[];
  timeout_minutes?: number;
  depends_on?: string[];
  trigger_condition?: string;
  retry_policy?: {
    max_attempts: number;
    backoff: string;
  };
  ui_component?: string;
  sla_minutes?: number;
  escalation?: {
    after_minutes: number;
    to: string;
  };
  continuous?: boolean;
  batch_size?: number;
  batch_delay_minutes?: number;
  schedule?: string;
  actions?: string[];
  approval_required?: boolean;
  audit_log?: boolean;
  human_review?: {
    required: boolean;
    reviewer_role: string;
    sla_minutes: number;
  };
  budget_source?: string;
  template?: string;
  tracking?: string;
  trigger?: string;
  decision_factors?: string[];
  tools?: string[];
  sla_hours?: number;
  review_materials?: string[];
  decision_options?: string[];
  config?: Record<string, any>;
  permissions?: string[];
}

export interface TaskAssignee {
  type: "ai_agent" | "human";
  model?: string;
  role?: string;
  capabilities?: string[];
  skills?: string[];
  routing?: string;
}

/**
 * Form: Information collection mechanisms
 * Can be traditional forms, chat interfaces, or automated data collection
 */
export interface Form {
  id: string;
  name: string;
  description?: string;
  type: "structured" | "conversational" | "automated";
  schema?: FormSchema;
  agent?: string;
  template?: string;
  initial_prompt?: string;
  context_provided?: string[];
  output_format?: Record<string, any>;
  fields?: FormField[];
  pre_filled?: boolean;
  sections?: FormSection[];
  generation?: string;
  data_sources?: string[];
  distribution?: string[];
  mode?: string;
  participants?: string[];
  discussion_points?: string[];
}

export interface FormSchema {
  sections: FormSection[];
}

export interface FormSection {
  id?: string;
  name: string;
  fields: FormField[];
}

export interface FormField {
  name: string;
  type:
    | "string"
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "multi_select"
    | "object"
    | "array"
    | "scale"
    | "budget_split";
  source?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  schema?: Record<string, any>;
  items?: {
    type: string;
    enum?: string[];
  };
  ai_generated?: boolean;
  max_length?: number;
  total?: string;
  ai_suggested?: boolean;
}

/**
 * Goal: Enhanced goal structure containing constraints, policies, tasks, and forms
 */
export interface Goal {
  id: string;
  name: string;
  description: string;
  order: number;
  timeout_minutes?: number;
  activation_condition?: string;
  continuous?: boolean;
  stop_condition?: string;
  trigger?: string;
  success_criteria?: {
    outputs_required: string[];
  };
  constraints: Constraint[];
  policies: Policy[];
  tasks: Task[];
  forms: Form[];
}

// ============================================================================
// Workflow Structure
// ============================================================================

/**
 * Workflow Trigger: Defines when a workflow should be initiated
 */
export interface WorkflowTrigger {
  type: "webhook" | "schedule" | "manual" | "event";
  event?: string;
  conditions?: Record<string, any>;
}

/**
 * Context Requirements: Define data requirements for workflow execution
 */
export interface ContextRequirements {
  [key: string]: {
    required_fields: string[];
    optional_fields?: string[];
  };
}

/**
 * Global Settings: Workflow-wide configuration
 */
export interface GlobalSettings {
  max_execution_time_hours: number;
  data_retention_days: number;
  default_timezone: string;
  notification_channels: {
    urgent: string[];
    normal: string[];
    reports: string[];
  };
  integrations: Record<string, any>;
}

/**
 * Workflow Metadata: Additional information about the workflow
 */
export interface WorkflowMetadata {
  author: string;
  created_at: string;
  last_modified: string;
  tags: string[];
  integration?: string;
}

/**
 * V2 Workflow Template: Complete workflow definition
 */
export interface WorkflowTemplateV2 {
  id: string;
  name: string;
  version: string;
  objective: string;
  metadata: WorkflowMetadata;
  triggers?: WorkflowTrigger[];
  context_requirements?: ContextRequirements;
  goals: Goal[];
  global_settings?: GlobalSettings;
}

// ============================================================================
// Status and State Types
// ============================================================================

/**
 * Enhanced status types for V2 workflow elements
 */
export type GoalStatus =
  | "PENDING"
  | "ACTIVE"
  | "COMPLETED"
  | "BLOCKED"
  | "SKIPPED";
export type ConstraintStatus = "SATISFIED" | "VIOLATED" | "PENDING_CHECK";
export type PolicyStatus = "TRIGGERED" | "DORMANT" | "EVALUATING";
export type TaskStatus =
  | "NOT_ASSIGNED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";
export type FormStatus =
  | "EMPTY"
  | "PARTIALLY_FILLED"
  | "COMPLETED"
  | "VALIDATED";

/**
 * Workflow Instance State (for future execution phases)
 * Represents the runtime state of a workflow execution
 */
export interface WorkflowInstance {
  instanceId: string;
  templateId: string;
  templateVersion: string;
  subjectId?: string;
  subjectName?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  currentGoal?: string;
  goalStatuses: GoalInstanceStatus[];
}

export interface GoalInstanceStatus {
  goalId: string;
  status: GoalStatus;
  startedAt?: string;
  completedAt?: string;
  constraintStatuses?: ConstraintInstanceStatus[];
  policyStatuses?: PolicyInstanceStatus[];
  taskStatuses?: TaskInstanceStatus[];
  formStatuses?: FormInstanceStatus[];
}

export interface ConstraintInstanceStatus {
  constraintId: string;
  status: ConstraintStatus;
  lastCheckedAt?: string;
  violationDetails?: string;
}

export interface PolicyInstanceStatus {
  policyId: string;
  status: PolicyStatus;
  lastEvaluatedAt?: string;
  conditionMet?: boolean;
  actionTriggered?: boolean;
}

export interface TaskInstanceStatus {
  taskId: string;
  status: TaskStatus;
  assignedTo?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  result?: any;
}

export interface FormInstanceStatus {
  formId: string;
  status: FormStatus;
  data?: Record<string, any>;
  submittedAt?: string;
  validatedAt?: string;
}

// ============================================================================
// Component Props and Selection Types
// ============================================================================

/**
 * Enhanced selection types for V2 workflow elements
 */
export interface SelectedItemV2 {
  type: "goal" | "constraint" | "policy" | "task" | "form";
  id: string;
  parentGoalId?: string;
  data: Goal | Constraint | Policy | Task | Form;
}

/**
 * Component prop interfaces for V2 workflow visualization
 */
export interface WorkflowPanelV2Props {
  workflow: WorkflowTemplateV2;
  selectedItemId: string | null;
  selectedItemType: SelectedItemV2["type"] | null;
  onItemSelect: (
    type: SelectedItemV2["type"],
    id: string,
    parentGoalId?: string
  ) => void;
}

export interface InspectorPanelV2Props {
  selectedItem: SelectedItemV2 | null;
  workflow: WorkflowTemplateV2;
}

export interface GoalCardV2Props {
  goal: Goal;
  isSelected: boolean;
  selectedSubitemId: string | null;
  selectedSubitemType: SelectedItemV2["type"] | null;
  onGoalSelect: (goalId: string) => void;
  onSubitemSelect: (type: SelectedItemV2["type"], id: string) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type guards for runtime type checking
 */
export function isWorkflowV2(workflow: any): workflow is WorkflowTemplateV2 {
  return (
    workflow &&
    typeof workflow.objective === "string" &&
    workflow.goals &&
    Array.isArray(workflow.goals) &&
    workflow.goals.every(
      (goal: any) =>
        goal.constraints && goal.policies && goal.tasks && goal.forms
    )
  );
}

export function isGoal(item: any): item is Goal {
  return item && item.constraints && item.policies && item.tasks && item.forms;
}

export function isConstraint(item: any): item is Constraint {
  return (
    item &&
    typeof item.type === "string" &&
    typeof item.enforcement === "string"
  );
}

export function isPolicy(item: any): item is Policy {
  return item && item.if && item.then;
}

export function isTask(item: any): item is Task {
  return item && item.assignee && typeof item.assignee.type === "string";
}

export function isForm(item: any): item is Form {
  return (
    item &&
    typeof item.type === "string" &&
    ["structured", "conversational", "automated"].includes(item.type)
  );
}

/**
 * Status configuration utilities
 */
export interface StatusConfig {
  icon: string;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}

export const GOAL_STATUS_CONFIG: Record<GoalStatus, StatusConfig> = {
  PENDING: {
    icon: "⏳",
    label: "Pending",
    bgColor: "bg-neutral-50",
    borderColor: "border-neutral-200",
    textColor: "text-neutral-700",
    iconColor: "text-neutral-500",
  },
  ACTIVE: {
    icon: "🔄",
    label: "Active",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
  },
  COMPLETED: {
    icon: "✅",
    label: "Completed",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    iconColor: "text-green-500",
  },
  BLOCKED: {
    icon: "🚫",
    label: "Blocked",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    iconColor: "text-red-500",
  },
  SKIPPED: {
    icon: "⏭️",
    label: "Skipped",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-700",
    iconColor: "text-yellow-500",
  },
};

export const CONSTRAINT_STATUS_CONFIG: Record<ConstraintStatus, StatusConfig> =
  {
    SATISFIED: {
      icon: "✅",
      label: "Satisfied",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      iconColor: "text-green-500",
    },
    VIOLATED: {
      icon: "❌",
      label: "Violated",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      iconColor: "text-red-500",
    },
    PENDING_CHECK: {
      icon: "🔍",
      label: "Pending Check",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700",
      iconColor: "text-yellow-500",
    },
  };

export const POLICY_STATUS_CONFIG: Record<PolicyStatus, StatusConfig> = {
  TRIGGERED: {
    icon: "⚡",
    label: "Triggered",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    iconColor: "text-green-500",
  },
  DORMANT: {
    icon: "😴",
    label: "Dormant",
    bgColor: "bg-neutral-50",
    borderColor: "border-neutral-200",
    textColor: "text-neutral-700",
    iconColor: "text-neutral-500",
  },
  EVALUATING: {
    icon: "🤔",
    label: "Evaluating",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
  },
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  NOT_ASSIGNED: {
    icon: "📋",
    label: "Not Assigned",
    bgColor: "bg-neutral-50",
    borderColor: "border-neutral-200",
    textColor: "text-neutral-700",
    iconColor: "text-neutral-500",
  },
  ASSIGNED: {
    icon: "👤",
    label: "Assigned",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
  },
  IN_PROGRESS: {
    icon: "🔄",
    label: "In Progress",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    iconColor: "text-purple-500",
  },
  COMPLETED: {
    icon: "✅",
    label: "Completed",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    iconColor: "text-green-500",
  },
  FAILED: {
    icon: "❌",
    label: "Failed",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    iconColor: "text-red-500",
  },
};

export const FORM_STATUS_CONFIG: Record<FormStatus, StatusConfig> = {
  EMPTY: {
    icon: "📝",
    label: "Empty",
    bgColor: "bg-neutral-50",
    borderColor: "border-neutral-200",
    textColor: "text-neutral-700",
    iconColor: "text-neutral-500",
  },
  PARTIALLY_FILLED: {
    icon: "📝",
    label: "Partially Filled",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-700",
    iconColor: "text-yellow-500",
  },
  COMPLETED: {
    icon: "📄",
    label: "Completed",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
  },
  VALIDATED: {
    icon: "✅",
    label: "Validated",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    iconColor: "text-green-500",
  },
};
