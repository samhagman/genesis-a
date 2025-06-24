/**
 * React Hooks for Workflow State Management
 *
 * Provides React hooks that integrate with the Zustand workflow store.
 * Designed for optimal performance with minimal re-renders.
 */

import { useMemo } from "react";
import type {
  WorkflowInstance,
  RuntimeEnvelope,
  ExecutionStatus,
  GoalInstance,
  ConstraintInstance,
  PolicyInstance,
  TaskInstance,
  FormInstance,
} from "@/types/workflow-instance";
import {
  isGoalInstance,
  isConstraintInstance,
  isPolicyInstance,
  isTaskInstance,
  isFormInstance,
} from "@/types/workflow-instance";
import { useWorkflowStore } from "./workflowStore";

// Hook to get the current active workflow instance
export function useActiveWorkflowInstance(): WorkflowInstance | null {
  return useWorkflowStore((state) => state.activeInstance);
}

// Hook to get a specific node instance by template ID
export function useNodeInstance(templateId: string): RuntimeEnvelope | null {
  return useWorkflowStore((state) => {
    if (!state.activeInstance) return null;
    const instanceId = state.activeInstance.templateToInstanceMap[templateId];
    if (!instanceId) return null;
    return state.activeInstance.nodeMap[instanceId] || null;
  });
}

// Hook to get typed node instances (with type guards)
export function useGoalInstance(templateId: string): GoalInstance | null {
  const node = useNodeInstance(templateId);
  return node && isGoalInstance(node) ? node : null;
}

export function useConstraintInstance(
  templateId: string
): ConstraintInstance | null {
  const node = useNodeInstance(templateId);
  return node && isConstraintInstance(node) ? node : null;
}

export function usePolicyInstance(templateId: string): PolicyInstance | null {
  const node = useNodeInstance(templateId);
  return node && isPolicyInstance(node) ? node : null;
}

export function useTaskInstance(templateId: string): TaskInstance | null {
  const node = useNodeInstance(templateId);
  return node && isTaskInstance(node) ? node : null;
}

export function useFormInstance(templateId: string): FormInstance | null {
  const node = useNodeInstance(templateId);
  return node && isFormInstance(node) ? node : null;
}

// Hook to get node status specifically (optimized for status-only updates)
export function useNodeStatus(templateId: string): ExecutionStatus | null {
  const node = useNodeInstance(templateId);
  return node?.status || null;
}

// Hook for workflow actions - returns stable references
export function useWorkflowActions() {
  return {
    setActiveInstance: useWorkflowStore((state) => state.setActiveInstance),
    clearActiveInstance: useWorkflowStore((state) => state.clearActiveInstance),
    updateNodeStatus: useWorkflowStore((state) => state.updateNodeStatus),
    updateNodeContext: useWorkflowStore((state) => state.updateNodeContext),
    updateNode: useWorkflowStore((state) => state.updateNode),
    loadScenario: useWorkflowStore((state) => state.loadScenario),
  };
}

// Hook for development scenarios
export function useWorkflowScenarios() {
  const scenarios = useWorkflowStore((state) => state.scenarios);
  const currentScenario = useWorkflowStore((state) => state.currentScenario);
  const loadScenario = useWorkflowStore((state) => state.loadScenario);

  return {
    scenarios,
    currentScenario,
    loadScenario,
  };
}

// Hook to check if workflow instance exists and is ready
export function useWorkflowReady(): boolean {
  const instance = useActiveWorkflowInstance();
  return instance !== null;
}

// Hook to get workflow-level statistics
export function useWorkflowStats() {
  const instance = useActiveWorkflowInstance();

  return useMemo(() => {
    if (!instance) {
      return {
        totalNodes: 0,
        completedNodes: 0,
        activeNodes: 0,
        failedNodes: 0,
        progressPercent: 0,
      };
    }

    const nodes = Object.values(instance.nodeMap);
    const totalNodes = nodes.length;
    const completedNodes = nodes.filter((n) => n.status === "COMPLETED").length;
    const activeNodes = nodes.filter((n) => n.status === "ACTIVE").length;
    const failedNodes = nodes.filter((n) => n.status === "FAILED").length;
    const progressPercent =
      totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    return {
      totalNodes,
      completedNodes,
      activeNodes,
      failedNodes,
      progressPercent,
    };
  }, [instance]);
}
