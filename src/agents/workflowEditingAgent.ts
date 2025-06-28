/**
 * Workflow Editing Agent Orchestrator
 *
 * This module provides an AI agent that can process natural language requests
 * and translate them into safe, validated calls to WorkflowEditingTools.
 *
 * Key Features:
 * - Natural language to tool call translation via Cloudflare Workers AI
 * - Schema validation safety net with self-correction loops
 * - Comprehensive system prompts to prevent prompt injection
 * - Tool-level permission checking and audit logging
 */

import {
  workflowEditingTools,
  WORKFLOW_EDITING_TOOL_DEFINITIONS,
} from "./workflowEditingTools";
import {
  generateSystemPrompt,
  generateWorkflowSummary,
  generateErrorCorrectionPrompt,
  validateUserRequest,
  sanitizeUserInput,
} from "./promptTemplates";
import type { WorkflowTemplateV2 } from "../types/workflow-v2";
import { validateWorkflowV2Strict } from "../utils/schema-validation";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WorkflowEditRequest {
  workflowId: string;
  currentWorkflow: WorkflowTemplateV2;
  userMessage: string;
  userId?: string;
  sessionId?: string;
}

export interface WorkflowEditResponse {
  success: boolean;
  updatedWorkflow?: WorkflowTemplateV2;
  message: string;
  toolCalls?: ToolCall[];
  errorDetails?: string;
  validationErrors?: string[];
}

export interface ToolCall {
  tool: string;
  params: Record<string, any>;
  result?: "success" | "error";
  errorMessage?: string;
}

export interface AgentContext {
  workflowSummary: string;
  availableTools: string[];
  userRequest: string;
  previousAttempts?: number;
}

// System prompts are now managed in promptTemplates.ts

// ============================================================================
// Core Agent Implementation
// ============================================================================

export class WorkflowEditingAgent {
  private maxRetries = 2;
  private auditLog: ToolCall[] = [];

  constructor(
    private ai: Ai, // Cloudflare Workers AI binding
    private modelName: "@cf/meta/llama-3.1-8b-instruct" = "@cf/meta/llama-3.1-8b-instruct"
  ) {}

  /**
   * Process a natural language workflow editing request
   */
  async processEditRequest(
    request: WorkflowEditRequest
  ): Promise<WorkflowEditResponse> {
    try {
      console.log(
        `Processing edit request for workflow ${request.workflowId}:`,
        request.userMessage
      );

      // Validate and sanitize user input
      const validation = validateUserRequest(request.userMessage);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid request: ${validation.issues.join(", ")}`,
          errorDetails: "Request validation failed",
        };
      }

      const sanitizedMessage = sanitizeUserInput(request.userMessage);

      // Generate workflow summary using template
      const workflowSummary = generateWorkflowSummary(request.currentWorkflow);

      // Build agent context
      const context: AgentContext = {
        workflowSummary,
        availableTools: Object.keys(WORKFLOW_EDITING_TOOL_DEFINITIONS),
        userRequest: sanitizedMessage,
        previousAttempts: 0,
      };

      // Attempt to process with retries
      return await this.processWithRetries(request, context);
    } catch (error) {
      console.error("Error processing edit request:", error);
      return {
        success: false,
        message: "Internal error processing your request. Please try again.",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Process request with retry logic for self-correction
   */
  private async processWithRetries(
    request: WorkflowEditRequest,
    context: AgentContext
  ): Promise<WorkflowEditResponse> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      context.previousAttempts = attempt;

      try {
        // Get LLM response with tool calls
        const agentResponse = await this.callLLM(context, lastError);

        if (!agentResponse.toolCalls || agentResponse.toolCalls.length === 0) {
          return {
            success: false,
            message:
              "I could not determine how to make the requested changes. Please provide more specific instructions.",
            errorDetails: "No valid tool calls generated",
          };
        }

        // Execute tool calls and validate
        const executionResult = await this.executeToolCalls(
          request.currentWorkflow,
          agentResponse.toolCalls
        );

        if (executionResult.success) {
          return {
            success: true,
            updatedWorkflow: executionResult.updatedWorkflow,
            message: `Successfully ${this.summarizeChanges(agentResponse.toolCalls)}. ${agentResponse.reasoning || ""}`,
            toolCalls: agentResponse.toolCalls,
          };
        } else {
          lastError = executionResult.errorMessage;
          console.warn(`Attempt ${attempt + 1} failed:`, lastError);

          // If this is the last attempt, return the error
          if (attempt === this.maxRetries) {
            return {
              success: false,
              message:
                "I was unable to make the requested changes after multiple attempts. Please check your request and try again.",
              errorDetails: lastError,
              validationErrors: executionResult.validationErrors,
              toolCalls: agentResponse.toolCalls,
            };
          }
        }
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : "Unknown execution error";
        console.error(`Attempt ${attempt + 1} error:`, error);

        if (attempt === this.maxRetries) {
          return {
            success: false,
            message:
              "An error occurred while processing your request. Please try rephrasing your request.",
            errorDetails: lastError,
          };
        }
      }
    }

    // Should never reach here, but just in case
    return {
      success: false,
      message: "Maximum retry attempts exceeded.",
      errorDetails: lastError,
    };
  }

  /**
   * Call the LLM to get tool calls for the user request
   */
  private async callLLM(
    context: AgentContext,
    previousError?: string
  ): Promise<{ toolCalls: ToolCall[]; reasoning: string }> {
    const messages = [
      {
        role: "system",
        content: generateSystemPrompt(),
      },
      {
        role: "user",
        content: this.buildUserPrompt(context, previousError),
      },
    ];

    const response = await this.ai.run(this.modelName, {
      messages,
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for consistent tool calls
    });

    // Parse the response
    try {
      const responseText =
        (response as any).response || JSON.stringify(response);
      const parsed = JSON.parse(responseText);

      if (!parsed.toolCalls || !Array.isArray(parsed.toolCalls)) {
        throw new Error("Invalid response format: missing toolCalls array");
      }

      return {
        toolCalls: parsed.toolCalls,
        reasoning: parsed.reasoning || "",
      };
    } catch (error) {
      console.error("Failed to parse LLM response:", response);
      throw new Error(
        `Invalid LLM response format: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Execute a series of tool calls on the workflow
   */
  private async executeToolCalls(
    workflow: WorkflowTemplateV2,
    toolCalls: ToolCall[]
  ): Promise<{
    success: boolean;
    updatedWorkflow?: WorkflowTemplateV2;
    errorMessage?: string;
    validationErrors?: string[];
  }> {
    let currentWorkflow = workflow;
    const executedCalls: ToolCall[] = [];
    const validationErrors: string[] = [];

    try {
      for (const toolCall of toolCalls) {
        console.log(`Executing tool call: ${toolCall.tool}`, toolCall.params);

        // Validate tool exists
        if (
          !workflowEditingTools[
            toolCall.tool as keyof typeof workflowEditingTools
          ]
        ) {
          throw new Error(`Unknown tool: ${toolCall.tool}`);
        }

        // Execute the tool call
        const toolFunction = workflowEditingTools[
          toolCall.tool as keyof typeof workflowEditingTools
        ] as Function;
        const updatedWorkflow = toolFunction(
          currentWorkflow,
          ...Object.values(toolCall.params)
        );

        // Schema validation safety net: validate the result
        try {
          validateWorkflowV2Strict(updatedWorkflow);
          console.log(`Schema validation passed for tool: ${toolCall.tool}`);
        } catch (validationError) {
          const errorMsg =
            validationError instanceof Error
              ? validationError.message
              : "Unknown validation error";
          console.error(
            `Schema validation failed for tool ${toolCall.tool}:`,
            errorMsg
          );
          throw new Error(
            `Schema validation failed after ${toolCall.tool}: ${errorMsg}`
          );
        }

        // If validation passes, update the current workflow
        currentWorkflow = updatedWorkflow;

        // Mark as successful
        toolCall.result = "success";
        executedCalls.push(toolCall);

        // Log successful execution
        this.auditLog.push(toolCall);
      }

      return {
        success: true,
        updatedWorkflow: currentWorkflow,
      };
    } catch (error) {
      // Mark failed tool call
      const lastCall = toolCalls[executedCalls.length];
      if (lastCall) {
        lastCall.result = "error";
        lastCall.errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        executedCalls.push(lastCall);

        // Log failed execution to audit log
        this.auditLog.push(lastCall);
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown execution error";

      // Check if it's a validation error and categorize it
      if (
        errorMessage.includes("validation failed") ||
        errorMessage.includes("Schema validation failed")
      ) {
        validationErrors.push(errorMessage);
      }

      return {
        success: false,
        errorMessage,
        validationErrors:
          validationErrors.length > 0 ? validationErrors : undefined,
      };
    }
  }

  /**
   * Generate enhanced error correction guidance for schema validation failures
   */
  private generateValidationErrorGuidance(errorMessage: string): string {
    const commonIssues = [
      {
        pattern: /(name.*required|required.*name|Required field 'name')/i,
        guidance:
          "All required fields must be present. Goals need name and description. Tasks need description and assignee. Check the schema for required fields.",
      },
      {
        pattern: /(id.*required|required.*id|field.*missing)/i,
        guidance:
          "Ensure all elements have unique 'id' fields. Use descriptive naming like 'goal_user_registration' or 'task_email_validation'.",
      },
      {
        pattern: /(invalid.*assignee|assignee.*invalid)/i,
        guidance:
          "Task assignee must have 'type' field set to either 'ai_agent' or 'human'. AI agents should specify 'model', humans should specify 'role'.",
      },
      {
        pattern: /invalid.*type/i,
        guidance:
          "Check that constraint types are one of: time_limit, data_validation, business_rule, rate_limit, access_control. Policy action types should match available actions.",
      },
      {
        pattern: /invalid.*enforcement/i,
        guidance:
          "Constraint enforcement must be one of: hard_stop, block_progression, require_approval, warn.",
      },
    ];

    for (const issue of commonIssues) {
      if (issue.pattern.test(errorMessage)) {
        return `VALIDATION ERROR GUIDANCE: ${issue.guidance}

Original error: ${errorMessage}`;
      }
    }

    return `VALIDATION ERROR: ${errorMessage}

Please review the V2 schema requirements and ensure all fields are properly formatted.`;
  }

  /**
   * Build the user prompt with context and error feedback
   */
  private buildUserPrompt(
    context: AgentContext,
    previousError?: string
  ): string {
    let prompt = `${context.workflowSummary}

USER REQUEST: "${context.userRequest}"

Please respond with the appropriate tool calls to fulfill the user's request.`;

    if (previousError && context.previousAttempts! > 0) {
      // Use enhanced guidance for validation errors
      const errorGuidance =
        previousError.includes("validation failed") ||
        previousError.includes("Schema validation failed")
          ? this.generateValidationErrorGuidance(previousError)
          : generateErrorCorrectionPrompt(
              previousError,
              context.previousAttempts!,
              this.maxRetries
            );

      prompt += "\n\n" + errorGuidance;
    }

    return prompt;
  }

  /**
   * Generate a human-readable summary of the changes made
   */
  private summarizeChanges(toolCalls: ToolCall[]): string {
    const actionCounts = toolCalls.reduce(
      (counts, call) => {
        const action = call.tool.includes("add")
          ? "added"
          : call.tool.includes("update")
            ? "updated"
            : call.tool.includes("delete")
              ? "deleted"
              : call.tool.includes("move")
                ? "moved"
                : call.tool.includes("duplicate")
                  ? "duplicated"
                  : "modified";

        counts[action] = (counts[action] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );

    const summaryParts = Object.entries(actionCounts).map(([action, count]) =>
      count === 1 ? `${action} 1 element` : `${action} ${count} elements`
    );

    return summaryParts.join(", ");
  }

  /**
   * Get audit log of all tool calls made in this session
   */
  getAuditLog(): ToolCall[] {
    return [...this.auditLog];
  }

  /**
   * Clear the audit log (useful for new sessions)
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
}

// ============================================================================
// Factory Function for Worker Integration
// ============================================================================

/**
 * Create a workflow editing agent instance configured for Cloudflare Workers
 */
export function createWorkflowEditingAgent(
  ai: Ai,
  options?: {
    modelName?: "@cf/meta/llama-3.1-8b-instruct";
    maxRetries?: number;
  }
): WorkflowEditingAgent {
  const agent = new WorkflowEditingAgent(
    ai,
    options?.modelName || "@cf/meta/llama-3.1-8b-instruct"
  );

  if (options?.maxRetries !== undefined) {
    (agent as any).maxRetries = options.maxRetries;
  }

  return agent;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate a tool call against the tool definitions
 */
export function validateToolCall(toolCall: ToolCall): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if tool exists
  const toolDef =
    WORKFLOW_EDITING_TOOL_DEFINITIONS[
      toolCall.tool as keyof typeof WORKFLOW_EDITING_TOOL_DEFINITIONS
    ];
  if (!toolDef) {
    errors.push(`Unknown tool: ${toolCall.tool}`);
    return { valid: false, errors };
  }

  // Validate required parameters
  const requiredParams = toolDef.parameters.required || [];
  for (const param of requiredParams) {
    if (!(param in toolCall.params)) {
      errors.push(`Missing required parameter: ${param}`);
    }
  }

  // Validate parameter types (basic validation)
  for (const [paramName, paramValue] of Object.entries(toolCall.params)) {
    const paramDef = (toolDef.parameters.properties as any)[paramName];
    if (paramDef && paramDef.type) {
      const actualType = Array.isArray(paramValue)
        ? "array"
        : typeof paramValue;
      if (actualType !== paramDef.type) {
        errors.push(
          `Parameter ${paramName} should be ${paramDef.type}, got ${actualType}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// User input sanitization is now handled by promptTemplates.ts

export default WorkflowEditingAgent;
