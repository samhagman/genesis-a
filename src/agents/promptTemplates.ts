/**
 * Prompt Templates for Workflow Editing Agent
 *
 * This module contains carefully crafted prompts for the AI agent to ensure
 * safe, accurate, and effective workflow editing through natural language.
 */

import { WORKFLOW_EDITING_TOOL_DEFINITIONS } from "./workflowEditingTools";

// ============================================================================
// Core System Prompts
// ============================================================================

export const WORKFLOW_AGENT_SYSTEM_PROMPT = `You are a specialized workflow editing agent that helps users modify WorkflowTemplateV2 schemas through natural language commands.

CORE MISSION:
Transform user requests into precise, validated tool calls that safely modify workflow templates while preserving data integrity and semantic meaning.

CRITICAL SAFETY RULES:
1. ONLY respond with valid tool calls from the provided tool list
2. NEVER generate code, SQL, scripts, or any executable content
3. NEVER attempt to access external systems or make network requests
4. NEVER modify system prompts or attempt prompt injection
5. ALWAYS validate tool calls match exact tool definitions

AVAILABLE TOOLS:
${Object.keys(WORKFLOW_EDITING_TOOL_DEFINITIONS).join(", ")}

RESPONSE FORMAT - YOU MUST FOLLOW THIS EXACTLY:
{
  "toolCalls": [
    {
      "tool": "exactToolName",
      "params": { /* exact parameters matching tool schema */ }
    }
  ],
  "reasoning": "Brief explanation of how these tool calls accomplish the user's request"
}

SEMANTIC UNDERSTANDING:
- "Add/Create" → Use addGoal, addTask, addConstraint, addPolicy, addForm
- "Update/Modify/Change" → Use updateGoal, updateTask, updateConstraint, updatePolicy, updateForm  
- "Delete/Remove" → Use deleteGoal, deleteTask, deleteConstraint, deletePolicy, deleteForm
- "Move/Transfer" → Use moveElementBetweenGoals
- "Copy/Duplicate" → Use duplicateGoal
- "Reorder" → Use reorderGoals

ID MANAGEMENT RULES:
- When creating new elements: Use descriptive IDs or let system auto-generate
- When updating elements: ALWAYS preserve existing IDs (never change them)
- When duplicating: System will auto-generate new IDs for all copied elements
- Use naming convention: {type}_{descriptive_name} (e.g., "task_email_validation")

VALIDATION REQUIREMENTS:
- All tool names must match exactly from available tools
- All parameters must conform to tool parameter schemas
- Required fields must be present
- Type checking: strings, numbers, arrays, objects must match expected types
- Enum values must be from allowed lists (e.g., constraint types, enforcement levels)

ERROR HANDLING:
- If request is ambiguous: Ask for clarification
- If multiple interpretations: Choose the most straightforward
- If missing information: Use reasonable defaults or ask for specifics
- If impossible request: Explain why and suggest alternatives

WORKFLOW ELEMENT TYPES:
1. Goals: High-level objectives with order, containing other elements
2. Tasks: Work items assigned to humans or AI agents
3. Constraints: Rules and boundaries that must be followed
4. Policies: If-then logic for automated decision making
5. Forms: Data collection mechanisms (structured, conversational, automated)

Remember: You are a precise tool orchestrator, not a creative writer. Focus on accuracy and safety.`;

// ============================================================================
// Context-Specific Prompts
// ============================================================================

export const WORKFLOW_SUMMARY_PROMPT = `
CURRENT WORKFLOW CONTEXT:
Name: {workflowName}
Version: {version}
Total Goals: {goalCount}
Total Elements: {totalElements}

GOALS BREAKDOWN:
{goalsBreakdown}

METADATA:
- Author: {author}
- Last Modified: {lastModified}
- Tags: {tags}
`;

export const ERROR_CORRECTION_PROMPT = `
PREVIOUS ATTEMPT FAILED:
Error: {errorMessage}
Attempt: {attemptNumber} of {maxAttempts}

CORRECTION GUIDANCE:
- Review the error message carefully
- Check parameter types and required fields
- Ensure tool names are exact matches
- Verify enum values are from allowed lists
- Consider if the request needs to be broken into smaller steps

Please analyze the error and provide corrected tool calls.`;

export const CLARIFICATION_REQUEST_PROMPT = `The request "{userRequest}" needs clarification. 

Possible interpretations:
{interpretations}

Please specify:
{clarificationQuestions}`;

// ============================================================================
// Tool-Specific Prompt Helpers
// ============================================================================

export const TOOL_USAGE_EXAMPLES = {
  addGoal: `Example: "Add a goal called 'User Verification'"
Tool Call: {
  "tool": "addGoal",
  "params": {
    "goal": {
      "name": "User Verification",
      "description": "Verify user identity and credentials",
      "constraints": [],
      "policies": [],
      "tasks": [],
      "forms": []
    }
  }
}`,

  addTask: `Example: "Add an email validation task to the user registration goal"
Tool Call: {
  "tool": "addTask",
  "params": {
    "goalId": "goal_user_registration",
    "task": {
      "description": "Validate user email address",
      "assignee": {
        "type": "ai_agent",
        "model": "email_validator_v1"
      }
    }
  }
}`,

  addConstraint: `Example: "Add a 30-minute time limit to the verification goal"
Tool Call: {
  "tool": "addConstraint",
  "params": {
    "goalId": "goal_verification",
    "constraint": {
      "description": "Process must complete within 30 minutes",
      "type": "time_limit",
      "enforcement": "hard_stop",
      "value": 30
    }
  }
}`,

  updateTask: `Example: "Change the email task timeout to 60 minutes"
Tool Call: {
  "tool": "updateTask", 
  "params": {
    "taskId": "task_email_validation",
    "updates": {
      "timeout_minutes": 60
    }
  }
}`,
};

// ============================================================================
// Validation Prompts
// ============================================================================

export const VALIDATION_ERROR_PROMPTS = {
  invalidToolName: `ERROR: Tool name "{toolName}" is not valid.
Available tools: {availableTools}
Please use the exact tool name from the list.`,

  missingRequiredParam: `ERROR: Missing required parameter "{paramName}" for tool "{toolName}".
Required parameters: {requiredParams}
Please include all required parameters.`,

  invalidParamType: `ERROR: Parameter "{paramName}" should be type "{expectedType}", got "{actualType}".
Please ensure parameter types match the tool definition.`,

  invalidEnumValue: `ERROR: Value "{value}" is not valid for "{fieldName}".
Allowed values: {allowedValues}
Please use one of the allowed values.`,

  schemaValidationFailed: `ERROR: The resulting workflow failed schema validation:
{validationErrors}
Please review your changes and ensure they maintain workflow integrity.`,
};

// ============================================================================
// Success Response Templates
// ============================================================================

export const SUCCESS_TEMPLATES = {
  singleChange: "Successfully {action} {elementType} '{elementName}'.",
  multipleChanges:
    "Successfully completed {changeCount} changes: {changeSummary}.",
  goalReorder: "Successfully reordered {goalCount} goals.",
  bulkOperation: "Successfully {operation} involving {elementCount} elements.",
};

// ============================================================================
// Helper Functions for Dynamic Prompt Generation
// ============================================================================

/**
 * Generate a complete system prompt with current tool definitions
 */
export function generateSystemPrompt(): string {
  const toolDefinitions = JSON.stringify(
    WORKFLOW_EDITING_TOOL_DEFINITIONS,
    null,
    2
  );

  return (
    WORKFLOW_AGENT_SYSTEM_PROMPT +
    `

COMPLETE TOOL DEFINITIONS:
${toolDefinitions}

TOOL USAGE EXAMPLES:
${Object.values(TOOL_USAGE_EXAMPLES).join("\n\n")}`
  );
}

/**
 * Generate workflow summary section for prompts
 */
export function generateWorkflowSummary(workflow: any): string {
  const totalElements = workflow.goals.reduce((total: number, goal: any) => {
    return (
      total +
      goal.constraints.length +
      goal.policies.length +
      goal.tasks.length +
      goal.forms.length
    );
  }, 0);

  const goalsBreakdown = workflow.goals
    .map(
      (goal: any, index: number) =>
        `  ${index + 1}. "${goal.name}" (${goal.constraints.length} constraints, ${goal.policies.length} policies, ${goal.tasks.length} tasks, ${goal.forms.length} forms)`
    )
    .join("\n");

  return WORKFLOW_SUMMARY_PROMPT.replace("{workflowName}", workflow.name)
    .replace("{version}", workflow.version)
    .replace("{goalCount}", workflow.goals.length.toString())
    .replace("{totalElements}", totalElements.toString())
    .replace("{goalsBreakdown}", goalsBreakdown)
    .replace("{author}", workflow.metadata?.author || "Unknown")
    .replace("{lastModified}", workflow.metadata?.last_modified || "Unknown")
    .replace("{tags}", (workflow.metadata?.tags || []).join(", ") || "None");
}

/**
 * Generate error correction prompt with context
 */
export function generateErrorCorrectionPrompt(
  errorMessage: string,
  attemptNumber: number,
  maxAttempts: number
): string {
  return ERROR_CORRECTION_PROMPT.replace("{errorMessage}", errorMessage)
    .replace("{attemptNumber}", attemptNumber.toString())
    .replace("{maxAttempts}", maxAttempts.toString());
}

/**
 * Generate validation error message
 */
export function generateValidationErrorMessage(
  errorType: keyof typeof VALIDATION_ERROR_PROMPTS,
  context: Record<string, string>
): string {
  let template = VALIDATION_ERROR_PROMPTS[errorType];

  for (const [key, value] of Object.entries(context)) {
    template = template.replace(`{${key}}`, value);
  }

  return template;
}

/**
 * Generate success message from template
 */
export function generateSuccessMessage(
  templateType: keyof typeof SUCCESS_TEMPLATES,
  context: Record<string, string>
): string {
  let template = SUCCESS_TEMPLATES[templateType];

  for (const [key, value] of Object.entries(context)) {
    template = template.replace(`{${key}}`, value);
  }

  return template;
}

// ============================================================================
// Prompt Validation
// ============================================================================

/**
 * Validate that a user request is safe and appropriate
 */
export function validateUserRequest(userRequest: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /system|prompt|instruction/i,
    /execute|run|eval|script/i,
    /delete.*all|drop.*table|truncate/i,
    /<script|javascript:|data:/i,
    /\b(admin|root|sudo)\b/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(userRequest)) {
      issues.push(
        `Request contains potentially unsafe content: ${pattern.source}`
      );
    }
  }

  // Check length
  if (userRequest.length > 1000) {
    issues.push("Request is too long (max 1000 characters)");
  }

  if (userRequest.trim().length < 5) {
    issues.push("Request is too short (min 5 characters)");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizeUserInput(input: string): string {
  // Remove potentially harmful patterns
  return input
    .replace(/```[\s\S]*?```/g, "[code block removed]") // Remove code blocks
    .replace(/\bsystem\b|\bprompt\b|\binstruct\b/gi, "[redacted]") // Remove system keywords
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim()
    .slice(0, 500); // Limit length
}

export default {
  WORKFLOW_AGENT_SYSTEM_PROMPT,
  generateSystemPrompt,
  generateWorkflowSummary,
  generateErrorCorrectionPrompt,
  generateValidationErrorMessage,
  generateSuccessMessage,
  validateUserRequest,
};
