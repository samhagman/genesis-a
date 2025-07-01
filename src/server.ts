import { type Schedule, routeAgentRequest } from "agents";

import { unstable_getSchedulePrompt } from "agents/schedule";

import { openai } from "@ai-sdk/openai";
import { AIChatAgent } from "agents/ai-chat-agent";
import {
  type StreamTextOnFinishCallback,
  type ToolSet,
  createDataStreamResponse,
  generateId,
  streamText,
} from "ai";
import {
  type WorkflowEditingEnv,
  routeWorkflowEditingAPI,
  validateWorkflowEditingEnv,
} from "./api/workflowEditing";
import { executions, tools } from "./tools";
import type { WorkflowTemplateV2 } from "./types/workflow-v2";
import { processToolCalls } from "./utils";
import { validateWorkflowV2 } from "./utils/schema-validation";
// import { env } from "cloudflare:workers";

const model = openai("gpt-4o-2024-11-20");
// Cloudflare AI Gateway
// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
//   baseURL: env.GATEWAY_BASE_URL,
// });

/**
 * AI Chat implementation that handles real-time AI interactions
 */
export class Chat extends AIChatAgent<Env> {
  private currentWorkflow: WorkflowTemplateV2 | null = null;
  private workflowLoaded = false;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.initializeWorkflowState();
  }

  private async initializeWorkflowState() {
    try {
      // Guard against test environments where state might be undefined
      if (
        !this.state ||
        typeof this.state !== "object" ||
        !("storage" in this.state) ||
        !this.state.storage
      ) {
        console.warn(
          "State storage not available, using in-memory workflow state"
        );
        this.currentWorkflow = null;
        this.workflowLoaded = true;
        return;
      }

      // @ts-ignore - Durable Object storage typing issue
      const stored = await this.state.storage.get("currentWorkflow");
      this.currentWorkflow = stored ? (stored as WorkflowTemplateV2) : null;
      this.workflowLoaded = true;

      if (this.currentWorkflow) {
        console.log(
          `Loaded workflow: ${this.currentWorkflow.name} (${this.currentWorkflow.goals.length} goals)`
        );
      }
    } catch (error) {
      console.warn("Failed to load workflow state:", error);
      this.currentWorkflow = null;
      this.workflowLoaded = true;
    }
  }

  getCurrentWorkflow(): WorkflowTemplateV2 | null {
    return this.currentWorkflow;
  }

  async saveCurrentWorkflow(workflow: WorkflowTemplateV2): Promise<void> {
    // Validate workflow before saving (following Cloudflare best practices)
    const validationResult = validateWorkflowV2(workflow);
    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors
        .map((e) => e.message)
        .join(", ");
      throw new Error(`Workflow validation failed: ${errorMessages}`);
    }

    // Update last modified timestamp
    workflow.metadata.last_modified = new Date().toISOString();

    this.currentWorkflow = workflow;

    // Save to storage if available (not in test environments)
    if (
      this.state &&
      typeof this.state === "object" &&
      "storage" in this.state &&
      this.state.storage
    ) {
      // @ts-ignore - Durable Object storage typing issue
      await this.state.storage.put("currentWorkflow", workflow);
    }

    // Also save to R2 for persistence and versioning
    if (this.env.WORKFLOW_VERSIONS) {
      const key = `workflows/${workflow.id}/current.json`;
      await this.env.WORKFLOW_VERSIONS.put(
        key,
        JSON.stringify(workflow, null, 2),
        {
          customMetadata: {
            version: workflow.version,
            goals: workflow.goals.length.toString(),
            updated: new Date().toISOString(),
          },
        }
      );
    }

    console.log(
      `Saved workflow: ${workflow.name} (${workflow.goals.length} goals)`
    );
  }

  /**
   * Handles incoming chat messages and manages the response stream
   * @param onFinish - Callback function executed when streaming completes
   */

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal }
  ) {
    // Wait for workflow state to be loaded
    if (!this.workflowLoaded) {
      await this.initializeWorkflowState();
    }

    // Enhanced system prompt with workflow awareness
    const workflowContext = this.currentWorkflow
      ? `Currently editing workflow: "${this.currentWorkflow.name}" with ${this.currentWorkflow.goals.length} goals.`
      : "No workflow currently loaded. Use 'createWorkflow' to start a new workflow.";

    const systemPrompt = `You are a helpful AI assistant with advanced workflow editing capabilities.

**Current Context:**
${workflowContext}

**Workflow Tool Guidelines:**
- Always use 'viewCurrentWorkflow' to understand the current state before making changes
- When adding goals, use descriptive names that clearly indicate the goal's purpose
- For tasks, choose appropriate assignee types (ai_agent for automated tasks, human for tasks requiring judgment)
- Add constraints to enforce important business rules and quality standards
- Use specific, actionable descriptions for all workflow elements

**Tool Usage Patterns:**
1. **Starting a workflow**: Use 'createWorkflow' with a clear name and description
2. **Understanding current state**: Use 'viewCurrentWorkflow' to see all goals and tasks
3. **Adding structure**: Use 'addGoal' to create major workflow phases
4. **Adding work items**: Use 'addTask' to define specific work within goals
5. **Adding rules**: Use 'addConstraint' to enforce quality and compliance

**Safety**: Destructive operations (delete actions) require user confirmation. Present the confirmation requirements clearly.

When users ask about workflows, follow this pattern:
1. Check current workflow state with 'viewCurrentWorkflow'
2. Make requested changes using appropriate tools
3. Confirm changes were applied successfully

${unstable_getSchedulePrompt({ date: new Date() })}

If the user asks to schedule a task, use the schedule tool to schedule the task.
`;

    // const mcpConnection = await this.mcp.connect(
    //   "https://path-to-mcp-server/sse"
    // );

    // Collect all tools, including MCP tools
    const allTools = {
      ...tools,
      ...this.mcp.unstable_getAITools(),
    };

    // Create a streaming response that handles both text and tool outputs
    const dataStreamResponse = createDataStreamResponse({
      execute: async (dataStream) => {
        // Process any pending tool calls from previous messages
        // This handles human-in-the-loop confirmations for tools
        const processedMessages = await processToolCalls({
          messages: this.messages,
          dataStream,
          tools: allTools,
          executions,
        });

        // Stream the AI response using GPT-4
        const result = streamText({
          model,
          system: systemPrompt,
          messages: processedMessages,
          tools: allTools,
          onFinish: async (args) => {
            onFinish(
              args as Parameters<StreamTextOnFinishCallback<ToolSet>>[0]
            );
            // await this.mcp.closeConnection(mcpConnection.id);
          },
          onError: (error) => {
            console.error("Error while streaming:", error);
          },
          maxSteps: 10,
        });

        // Merge the AI response stream with tool execution outputs
        result.mergeIntoDataStream(dataStream);
      },
    });

    return dataStreamResponse;
  }

  async executeTask(description: string, task: Schedule<string>) {
    await this.saveMessages([
      ...this.messages,
      {
        id: generateId(),
        role: "user",
        content: `Running scheduled task: ${description}`,
        createdAt: new Date(),
      },
    ]);
  }
}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/check-open-ai-key") {
      const hasOpenAIKey = !!env.OPENAI_API_KEY;
      return Response.json({
        success: hasOpenAIKey,
      });
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
      );
    }

    // Route workflow editing API requests
    if (url.pathname.startsWith("/api/workflow/")) {
      if (validateWorkflowEditingEnv(env)) {
        const workflowResponse = await routeWorkflowEditingAPI(
          request,
          env as WorkflowEditingEnv
        );
        if (workflowResponse) {
          return workflowResponse;
        }
      } else {
        return Response.json(
          {
            success: false,
            message: "Workflow editing service not properly configured",
            errorDetails: "Missing AI or WORKFLOW_VERSIONS bindings",
          },
          { status: 503 }
        );
      }
    }

    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
