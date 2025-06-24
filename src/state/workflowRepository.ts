/**
 * Workflow Repository
 *
 * Provides a clean facade for workflow instance state management.
 * Abstracts the underlying store implementation (Zustand) for future flexibility.
 */

import type {
  WorkflowInstance,
  RuntimeEnvelope,
  ExecutionStatus,
  ExecutionScenario,
} from "@/types/workflow-instance";

// Repository interface for workflow instance management
export interface WorkflowRepository {
  // Instance management
  getActiveInstance(): WorkflowInstance | null;
  setActiveInstance(instance: WorkflowInstance): void;
  clearActiveInstance(): void;

  // Node state management
  getNodeInstance(templateId: string): RuntimeEnvelope | null;
  updateNodeStatus(templateId: string, status: ExecutionStatus): void;
  updateNodeContext(templateId: string, context: Record<string, any>): void;
  updateNode(templateId: string, partial: Partial<RuntimeEnvelope>): void;

  // Scenario management (for development)
  loadScenario(scenario: ExecutionScenario): void;
  getAvailableScenarios(): ExecutionScenario[];
  getCurrentScenario(): string | null;

  // Subscriptions
  subscribe(callback: (instance: WorkflowInstance | null) => void): () => void;
  subscribeToNode(
    templateId: string,
    callback: (node: RuntimeEnvelope | null) => void
  ): () => void;
}

// Error types for repository operations
export class WorkflowRepositoryError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "WorkflowRepositoryError";
  }
}

export class NodeNotFoundError extends WorkflowRepositoryError {
  constructor(templateId: string) {
    super(`Node with template ID '${templateId}' not found`, "NODE_NOT_FOUND");
  }
}

export class NoActiveInstanceError extends WorkflowRepositoryError {
  constructor() {
    super("No active workflow instance", "NO_ACTIVE_INSTANCE");
  }
}
