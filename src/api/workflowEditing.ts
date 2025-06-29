/**
 * Workflow Editing API Endpoints
 *
 * This module provides HTTP endpoints for the Phase 5 AI Agent Workflow Template Editor.
 * Integrates WorkflowEditingAgent and WorkflowVersioningService with Cloudflare Workers.
 *
 * Endpoints:
 * - POST /api/workflow/edit - Process natural language workflow editing requests
 * - GET /api/workflow/{id}/versions - Get version history for a workflow
 * - GET /api/workflow/{id}/version/{v} - Get a specific version of a workflow
 * - POST /api/workflow/{id}/revert/{v} - Revert workflow to a specific version
 */

import { createWorkflowEditingAgent } from "../agents/workflowEditingAgent";
import type { WorkflowEditRequest } from "../agents/workflowEditingAgent";
import {
  createVersioningServiceFromEnv,
  generateVersionSummary,
} from "../services/workflowVersioning";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WorkflowEditingEnv {
  AI: Ai; // Cloudflare Workers AI binding
  WORKFLOW_VERSIONS: R2Bucket; // R2 bucket for version control
  OPENAI_API_KEY?: string; // Existing binding
  Chat?: DurableObjectNamespace; // Existing durable object
}

export interface EditRequestBody {
  workflowId: string;
  userMessage: string;
  sessionId?: string;
}

export interface RevertRequestBody {
  editSummary?: string;
}

// ============================================================================
// Core API Handler
// ============================================================================

export class WorkflowEditingAPI {
  constructor(private env: WorkflowEditingEnv) {}

  /**
   * Route incoming requests to appropriate handlers
   */
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    try {
      // Validate basic API path structure
      if (
        pathSegments.length < 2 ||
        pathSegments[0] !== "api" ||
        pathSegments[1] !== "workflow"
      ) {
        return this.errorResponse("Invalid API endpoint", 404);
      }

      // Route to specific handlers
      if (pathSegments[2] === "edit" && request.method === "POST") {
        return await this.handleEdit(request);
      }

      if (pathSegments.length >= 4) {
        const workflowId = pathSegments[2];

        if (pathSegments[3] === "versions" && request.method === "GET") {
          return await this.handleGetVersions(workflowId, url.searchParams);
        }

        if (
          pathSegments[3] === "version" &&
          pathSegments.length >= 5 &&
          request.method === "GET"
        ) {
          const version = Number.parseInt(pathSegments[4]);
          return await this.handleGetVersion(workflowId, version);
        }

        if (
          pathSegments[3] === "revert" &&
          pathSegments.length >= 5 &&
          request.method === "POST"
        ) {
          const version = Number.parseInt(pathSegments[4]);
          return await this.handleRevert(request, workflowId, version);
        }
      }

      return this.errorResponse("Endpoint not found", 404);
    } catch (error) {
      console.error("API request error:", error);
      return this.errorResponse(
        "Internal server error",
        500,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Handle POST /api/workflow/edit
   */
  private async handleEdit(request: Request): Promise<Response> {
    try {
      // Parse request body
      const body = (await request.json()) as EditRequestBody;

      // Validate required fields
      if (!body.workflowId || !body.userMessage) {
        return this.errorResponse(
          "Missing required fields: workflowId, userMessage",
          400
        );
      }

      // Initialize services
      const agent = createWorkflowEditingAgent(this.env.AI);
      const versioningService = createVersioningServiceFromEnv(this.env);

      if (!versioningService) {
        return this.errorResponse(
          "Workflow versioning service not available",
          503
        );
      }

      // Load current workflow
      const currentWorkflow = await versioningService.loadCurrentVersion(
        body.workflowId
      );
      if (!currentWorkflow) {
        return this.errorResponse(`Workflow ${body.workflowId} not found`, 404);
      }

      // Process edit request
      const editRequest: WorkflowEditRequest = {
        workflowId: body.workflowId,
        currentWorkflow,
        userMessage: body.userMessage,
        sessionId: body.sessionId,
      };

      const editResponse = await agent.processEditRequest(editRequest);

      // If editing was successful, save new version
      if (editResponse.success && editResponse.updatedWorkflow) {
        // Generate summary from tool calls
        const versionSummary =
          editResponse.toolCalls && editResponse.toolCalls.length > 0
            ? generateVersionSummary(
                currentWorkflow,
                editResponse.updatedWorkflow,
                editResponse.toolCalls
              )
            : "Updated via AI agent";

        const versionResult = await versioningService.saveVersion(
          body.workflowId,
          editResponse.updatedWorkflow,
          {
            userId: "mvp-system-user",
            editSummary: versionSummary,
          }
        );

        if (!versionResult.success) {
          console.error(
            "Failed to save workflow version:",
            versionResult.errorMessage
          );
          return Response.json(
            {
              success: false,
              message: "Workflow was edited but failed to save new version",
              error: versionResult.errorMessage,
            },
            { status: 500 }
          );
        }

        // Only return success if BOTH edit AND version save succeeded
        return Response.json({
          success: true,
          workflow: editResponse.updatedWorkflow,
          version: versionResult.version,
          message: editResponse.message,
          toolCalls: editResponse.toolCalls,
          auditLog: agent.getAuditLog(),
        });
      }
      // Edit failed - likely due to upstream service failure (AI, validation, etc.)
      return Response.json(
        {
          success: false,
          message: editResponse.message,
          errorDetails: editResponse.errorDetails,
          validationErrors: editResponse.validationErrors,
          auditLog: agent.getAuditLog(),
        },
        { status: 503 } // Service Unavailable - upstream dependency failed
      );
    } catch (error) {
      console.error("Edit request error:", error);
      return this.errorResponse(
        "Failed to process edit request",
        500,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Handle GET /api/workflow/{id}/versions
   */
  private async handleGetVersions(
    workflowId: string,
    searchParams: URLSearchParams
  ): Promise<Response> {
    try {
      const versioningService = createVersioningServiceFromEnv(this.env);
      if (!versioningService) {
        return this.errorResponse(
          "Workflow versioning service not available",
          503
        );
      }

      // Parse query parameters
      const limit = searchParams.get("limit")
        ? Number.parseInt(searchParams.get("limit")!)
        : undefined;
      const offset = searchParams.get("offset")
        ? Number.parseInt(searchParams.get("offset")!)
        : undefined;
      const includeContent = searchParams.get("includeContent") === "true";

      const versions = await versioningService.getVersionHistory(workflowId, {
        limit,
        offset,
        includeContent,
      });

      return Response.json({
        success: true,
        workflowId,
        versions,
        total: versions.length,
        pagination: {
          limit,
          offset,
          hasMore: limit ? versions.length === limit : false,
        },
      });
    } catch (error) {
      console.error("Get versions error:", error);
      return this.errorResponse(
        "Failed to retrieve version history",
        500,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Handle GET /api/workflow/{id}/version/{v}
   */
  private async handleGetVersion(
    workflowId: string,
    version: number
  ): Promise<Response> {
    try {
      if (Number.isNaN(version) || version < 1) {
        return this.errorResponse("Invalid version number", 400);
      }

      const versioningService = createVersioningServiceFromEnv(this.env);
      if (!versioningService) {
        return this.errorResponse(
          "Workflow versioning service not available",
          503
        );
      }

      const workflow = await versioningService.loadVersion(workflowId, version);
      if (!workflow) {
        return this.errorResponse(
          `Workflow ${workflowId} version ${version} not found`,
          404
        );
      }

      // Get version metadata
      const versionIndex = await versioningService.getVersionIndex(workflowId);
      const versionInfo = versionIndex?.versions.find(
        (v) => v.version === version
      );

      return Response.json({
        success: true,
        workflowId,
        version,
        workflow,
        metadata: versionInfo || null,
      });
    } catch (error) {
      console.error("Get version error:", error);
      return this.errorResponse(
        "Failed to retrieve workflow version",
        500,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Handle POST /api/workflow/{id}/revert/{v}
   */
  private async handleRevert(
    request: Request,
    workflowId: string,
    version: number
  ): Promise<Response> {
    try {
      if (Number.isNaN(version) || version < 1) {
        return this.errorResponse("Invalid version number", 400);
      }

      // Handle empty body gracefully - editSummary is optional
      let body: RevertRequestBody = {};
      const contentType = request.headers.get("content-type");
      if (request.body && contentType?.includes("application/json")) {
        try {
          const text = await request.text();
          if (text.trim()) {
            body = JSON.parse(text);
          }
        } catch (e) {
          return this.errorResponse("Invalid JSON in request body", 400);
        }
      }

      const versioningService = createVersioningServiceFromEnv(this.env);
      if (!versioningService) {
        return this.errorResponse(
          "Workflow versioning service not available",
          503
        );
      }

      // Attempt to revert
      const revertResult = await versioningService.revertToVersion(
        workflowId,
        version,
        {
          userId: "mvp-system-user",
          editSummary: body.editSummary || `Reverted to version ${version}`,
        }
      );

      if (revertResult.success) {
        // Load the reverted workflow
        const revertedWorkflow =
          await versioningService.loadCurrentVersion(workflowId);

        return Response.json({
          success: true,
          workflowId,
          revertedToVersion: version,
          newVersion: revertResult.version,
          workflow: revertedWorkflow,
          message: `Successfully reverted workflow to version ${version}`,
        });
      }
      return Response.json(
        {
          success: false,
          message: "Failed to revert workflow",
          errorDetails: revertResult.errorMessage,
        },
        { status: 400 }
      );
    } catch (error) {
      console.error("Revert error:", error);
      return this.errorResponse(
        "Failed to revert workflow",
        500,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Create standardized error response
   */
  private errorResponse(
    message: string,
    status: number,
    details?: string
  ): Response {
    return Response.json(
      {
        success: false,
        message,
        errorDetails: details,
      },
      {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create workflow editing API handler for use in Worker fetch handler
 */
export function createWorkflowEditingAPIHandler(env: WorkflowEditingEnv) {
  const api = new WorkflowEditingAPI(env);
  return (request: Request) => api.handleRequest(request);
}

/**
 * Route workflow editing API requests (helper for main fetch handler)
 */
export async function routeWorkflowEditingAPI(
  request: Request,
  env: WorkflowEditingEnv
): Promise<Response | null> {
  const url = new URL(request.url);

  // Check if this is a workflow editing API request
  if (url.pathname.startsWith("/api/workflow/")) {
    const handler = createWorkflowEditingAPIHandler(env);
    return await handler(request);
  }

  return null;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that required environment bindings are available
 */
export function validateWorkflowEditingEnv(
  env: unknown
): env is WorkflowEditingEnv {
  const typedEnv = env as Record<string, unknown>;
  if (!typedEnv.AI) {
    console.error(
      "AI binding not found - ensure AI is configured in wrangler.jsonc"
    );
    return false;
  }

  if (!typedEnv.WORKFLOW_VERSIONS) {
    console.error(
      "WORKFLOW_VERSIONS R2 binding not found - ensure R2 bucket is configured in wrangler.jsonc"
    );
    return false;
  }

  return true;
}

export default WorkflowEditingAPI;
