/**
 * Test Repository Implementation
 *
 * Simple implementation for testing that doesn't use Zustand.
 * Avoids React 19 compatibility issues during testing.
 */

import type {
  ExecutionScenario,
  ExecutionStatus,
  RuntimeEnvelope,
  WorkflowInstance,
} from "@/types/workflow-instance";
import type { WorkflowRepository } from "./workflowRepository";

export class TestWorkflowRepository implements WorkflowRepository {
  private activeInstance: WorkflowInstance | null = null;
  private scenarios: ExecutionScenario[] = [];
  private currentScenario: string | null = null;

  getActiveInstance(): WorkflowInstance | null {
    return this.activeInstance;
  }

  setActiveInstance(instance: WorkflowInstance): void {
    this.activeInstance = instance;
  }

  clearActiveInstance(): void {
    this.activeInstance = null;
  }

  getNodeInstance(templateId: string): RuntimeEnvelope | null {
    if (!this.activeInstance) {
      return null;
    }

    const instanceId = this.activeInstance.templateToInstanceMap[templateId];
    if (!instanceId) {
      return null;
    }

    return this.activeInstance.nodeMap[instanceId] || null;
  }

  updateNodeStatus(templateId: string, status: ExecutionStatus): void {
    this.updateNode(templateId, { status });
  }

  updateNodeContext(
    templateId: string,
    context: Record<string, unknown>
  ): void {
    this.updateNode(templateId, { ctx: context });
  }

  updateNode(templateId: string, partial: Partial<RuntimeEnvelope>): void {
    if (!this.activeInstance) {
      throw new Error("No active workflow instance");
    }

    const instanceId = this.activeInstance.templateToInstanceMap[templateId];
    if (!instanceId) {
      throw new Error(`Node with template ID '${templateId}' not found`);
    }

    const existingNode = this.activeInstance.nodeMap[instanceId];
    if (!existingNode) {
      throw new Error(`Instance with ID '${instanceId}' not found`);
    }

    // Update the node with partial data
    this.activeInstance.nodeMap[instanceId] = {
      ...existingNode,
      ...partial,
      updatedAt: new Date(),
    };

    // Update the workflow instance timestamp
    this.activeInstance.updatedAt = new Date();
  }

  loadScenario(scenario: ExecutionScenario): void {
    this.activeInstance = scenario.instance;
    this.currentScenario = scenario.name;
  }

  getAvailableScenarios(): ExecutionScenario[] {
    return this.scenarios;
  }

  getCurrentScenario(): string | null {
    return this.currentScenario;
  }

  setScenarios(scenarios: ExecutionScenario[]): void {
    this.scenarios = scenarios;
  }

  subscribe(callback: (instance: WorkflowInstance | null) => void): () => void {
    // Simple implementation for testing - no actual subscription
    return () => {};
  }

  subscribeToNode(
    templateId: string,
    callback: (node: RuntimeEnvelope | null) => void
  ): () => void {
    // Simple implementation for testing - no actual subscription
    return () => {};
  }
}
