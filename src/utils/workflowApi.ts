/**
 * Frontend API utilities for workflow operations
 *
 * Provides functions to interact with the backend workflow API endpoints,
 * handling data source prioritization (R2 storage first, local fallback).
 */

import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import { getApiUrl } from "@/config";

// API response types
interface WorkflowApiResponse {
  success: boolean;
  workflowId: string;
  workflow: WorkflowTemplateV2;
  source: "r2" | "local";
}

interface WorkflowApiError {
  success: false;
  message: string;
  errorDetails?: string;
}

/**
 * Load a workflow from the backend API (R2 storage with local fallback)
 */
export async function loadWorkflowFromApi(
  templateId: string
): Promise<WorkflowTemplateV2> {
  try {
    const response = await fetch(getApiUrl(`/api/workflow/${templateId}`), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as
      | WorkflowApiResponse
      | WorkflowApiError;

    if (!data.success) {
      const errorData = data as WorkflowApiError;
      throw new Error(errorData.message || "Unknown API error");
    }

    const successData = data as WorkflowApiResponse;
    console.log(`[Frontend API] Loaded workflow from ${successData.source}:`, {
      templateId,
      name: successData.workflow.name,
      goalsCount: successData.workflow.goals?.length || 0,
    });

    return successData.workflow;
  } catch (error) {
    console.error(
      `[Frontend API] Failed to load workflow ${templateId} from API:`,
      error
    );
    throw error;
  }
}

/**
 * Safe workflow loading that falls back to local files if API fails
 */
export async function loadWorkflowSafe(
  templateId: string
): Promise<{ workflow: WorkflowTemplateV2; source: "api" | "local" }> {
  try {
    // Try API first
    const workflow = await loadWorkflowFromApi(templateId);
    return { workflow, source: "api" };
  } catch (apiError) {
    console.warn(
      `[Frontend API] API load failed for ${templateId}, falling back to local files:`,
      apiError
    );

    try {
      // Fall back to local import
      const { loadWorkflowTemplate } = await import("../workflows");
      const workflow = await loadWorkflowTemplate(templateId);
      return { workflow, source: "local" };
    } catch (localError) {
      console.error(
        `[Frontend API] Both API and local loading failed for ${templateId}:`,
        {
          apiError,
          localError,
        }
      );
      throw new Error(
        `Failed to load workflow ${templateId} from both API and local sources: ${localError instanceof Error ? localError.message : String(localError)}`
      );
    }
  }
}

/**
 * Check if the API is available
 */
export async function checkApiAvailability(): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl("/api/workflow/health"), {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}
