import { type Schedule, routeAgentRequest } from "agents";

import { unstable_getSchedulePrompt } from "agents/schedule";

import { createOpenAI } from "@ai-sdk/openai";
import { AIChatAgent } from "agents/ai-chat-agent";
import {
  type LanguageModel,
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

// Import local workflow templates for development fallback
import instaworkTemplate from "./workflows/instawork-shift-filling.json";
import employeeOnboardingTemplate from "./workflows/employee-onboarding-v2.json";

// Local templates mapping for development
const LOCAL_TEMPLATES: Record<string, WorkflowTemplateV2> = {
  "instawork-shift-filling": instaworkTemplate as WorkflowTemplateV2,
  "employee-onboarding-v2": employeeOnboardingTemplate as WorkflowTemplateV2,
};

// AI model will be initialized in the Chat class constructor with proper API key access

/**
 * AI Chat implementation that handles real-time AI interactions
 */
export class Chat extends AIChatAgent<Env> {
  private model: LanguageModel;
  private currentWorkflow: WorkflowTemplateV2 | null = null;
  private workflowLoaded = false;
  private currentTemplateId: string | null = null;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    
    console.log("🏗️ [Chat DO] Constructor called", {
      hasApiKey: !!this.env.OPENAI_API_KEY,
      apiKeyLength: this.env.OPENAI_API_KEY?.length || 0,
      environment: this.env.ENVIRONMENT,
      stateId: state.id?.toString() || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    // Assert critical conditions
    console.assert(this.env.OPENAI_API_KEY, '❌ OPENAI_API_KEY should be available in env');
    console.assert(typeof this.env.OPENAI_API_KEY === 'string', '❌ OPENAI_API_KEY should be a string');
    
    try {
      // Initialize the AI model with proper API key access
      const openaiProvider = createOpenAI({
        apiKey: this.env.OPENAI_API_KEY,
        // If you use a Cloudflare AI Gateway, you can add its URL here:
        // baseURL: this.env.GATEWAY_BASE_URL,
      });
      
      console.log("🤖 [Chat DO] Creating OpenAI model with gpt-4o");
      // Corrected model name from "gpt-4o-2024-11-20" to "gpt-4o"
      this.model = openaiProvider("gpt-4o");
      
      console.log("✅ [Chat DO] AI model initialized successfully", {
        modelType: typeof this.model,
        hasModel: !!this.model
      });
      
      // Assert model initialization
      console.assert(this.model, '❌ AI model should be initialized');
      
    } catch (error) {
      console.error("❌ [Chat DO] Failed to initialize AI model:", error);
      throw error;
    }
    
    // ❌ REMOVED: this.initializeWorkflowState(); 
    // This async call was causing a race condition - moved to entry point methods
  }

  private async initializeWorkflowState() {
    try {
      console.log("🔄 [Chat DO] Initializing workflow state", {
        hasState: !!this.state,
        stateType: typeof this.state,
        hasStorage: !!(this.state as any)?.storage,
        stateKeys: this.state ? Object.keys(this.state) : []
      });

      // @ts-ignore - Durable Object storage typing issue
      const storedWorkflow = await this.ctx.storage.get("currentWorkflow");
      // @ts-ignore - Durable Object storage typing issue
      const storedTemplateId =
        await this.ctx.storage.get("currentTemplateId");

      this.currentWorkflow = storedWorkflow
        ? (storedWorkflow as WorkflowTemplateV2)
        : null;
      this.currentTemplateId = storedTemplateId
        ? (storedTemplateId as string)
        : null;
      this.workflowLoaded = true;

      if (this.currentWorkflow) {
        console.log(
          `Loaded workflow: ${this.currentWorkflow.name} (${this.currentWorkflow.goals.length} goals)`
        );
      }

      if (this.currentTemplateId) {
        console.log(`Restored template context: ${this.currentTemplateId}`);
      }
    } catch (error) {
      console.warn("Failed to load workflow state:", error);
      this.currentWorkflow = null;
      this.currentTemplateId = null;
      this.workflowLoaded = true;
    }
  }

  getCurrentWorkflow(): WorkflowTemplateV2 | null {
    return this.currentWorkflow;
  }

  /**
   * Initialize Chat DO with specific template context for V3 template editing
   * @param templateId - The ID of the template to load and set as current context
   */
  async initializeWithTemplate(templateId: string): Promise<void> {
    try {
      console.log("🔄 [Chat DO] initializeWithTemplate starting", {
        templateId,
        hasWorkflowVersions: !!this.env.WORKFLOW_VERSIONS,
        envKeys: Object.keys(this.env),
        localTemplatesAvailable: Object.keys(LOCAL_TEMPLATES),
        hasTargetTemplate: !!LOCAL_TEMPLATES[templateId]
      });

      this.currentTemplateId = templateId;
      let templateData: WorkflowTemplateV2 | null = null;

      // 1. Try loading from R2 if available
      if (this.env.WORKFLOW_VERSIONS) {
        const key = `workflows/${templateId}/current.json`;
        console.log("📂 [Chat DO] Attempting to load from R2", { key });
        
        const template = await this.env.WORKFLOW_VERSIONS.get(key);
        console.log("📂 [Chat DO] R2 get result", { 
          hasTemplate: !!template,
          templateType: typeof template
        });

        if (template) {
          console.log("📝 [Chat DO] Parsing template JSON from R2");
          templateData = (await template.json()) as WorkflowTemplateV2;
          console.log("📝 [Chat DO] Template parsed from R2", {
            name: templateData.name,
            goalsCount: templateData.goals?.length || 0,
            hasMetadata: !!templateData.metadata
          });
        } else {
          console.warn(`[Chat DO] Template ${templateId} not found in R2 storage. Falling back to local.`);
        }
      } else {
        console.warn(
          "[Chat DO] WORKFLOW_VERSIONS R2 bucket not available. Using local templates as fallback."
        );
      }

      // 2. Fallback to local templates if not loaded from R2
      if (!templateData) {
        console.log("🔄 [Chat DO] Attempting to load from local templates");
        templateData = LOCAL_TEMPLATES[templateId] || null;
        
        if (templateData) {
          console.log("📁 [Chat DO] Found in local templates", {
            name: templateData.name,
            goalsCount: templateData.goals?.length || 0
          });
        } else {
          console.error(`❌ [Chat DO] Template ${templateId} not found in any source.`);
        }
      }

      // 3. Validate and set the workflow state
      if (templateData) {
        const validationResult = validateWorkflowV2(templateData);
        console.log("✅ [Chat DO] Validation result", {
          isValid: validationResult.isValid,
          errorCount: validationResult.errors?.length || 0
        });
        
        if (validationResult.isValid) {
          this.currentWorkflow = templateData;
          console.log(
            `✅ [Chat DO] Successfully initialized with template: ${templateData.name} (${templateData.goals.length} goals)`
          );
        } else {
          console.error(
            `❌ [Chat DO] Template validation failed for ${templateId}:`,
            validationResult.errors
          );
          this.currentWorkflow = null;
        }
      } else {
        this.currentWorkflow = null;
      }

      this.workflowLoaded = true;

      // Persist template ID and the loaded workflow to durable storage for session continuity
      try {
        // @ts-ignore - Durable Object storage typing issue
        await this.ctx.storage.put("currentTemplateId", templateId);
        // @ts-ignore - Durable Object storage typing issue  
        await this.ctx.storage.put("currentWorkflow", this.currentWorkflow);
        console.log("✅ [Chat DO] Persisted to storage", { templateId, hasWorkflow: !!this.currentWorkflow });
      } catch (storageError) {
        console.warn("⚠️ [Chat DO] Failed to persist to storage:", storageError);
      }
    } catch (error) {
      console.error(
        `Failed to initialize Chat DO with template ${templateId}:`,
        error
      );
      this.currentWorkflow = null;
      this.currentTemplateId = null;
      this.workflowLoaded = true;
    }
  }

  /**
   * Get the currently loaded template ID
   */
  getCurrentTemplateId(): string | null {
    return this.currentTemplateId;
  }

  /**
   * Handle internal requests to the Chat DO, including context setting
   */
  async fetch(request: Request): Promise<Response> {
    // ✅ ADD INITIALIZATION GUARD to ensure state is loaded before any operation
    if (!this.workflowLoaded) {
      console.log("⏳ [Chat DO] Fetch - initializing workflow state");
      await this.initializeWorkflowState();
    }

    const url = new URL(request.url);
    
    console.log("🔧 [Chat DO] Internal fetch called", {
      pathname: url.pathname,
      method: request.method,
      workflowLoaded: this.workflowLoaded
    });
    
    // Handle internal context setting requests
    if (url.pathname === "/_internal/set-context") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      
      try {
        const { templateId } = await request.json();
        
        console.log("🔧 [Chat DO] Setting context to template:", templateId);
        
        if (typeof templateId === "string" && templateId.length > 0) {
          await this.initializeWithTemplate(templateId);
          console.log("✅ [Chat DO] Context set successfully to:", templateId);
          return new Response("Context set successfully", { status: 200 });
        } else {
          console.error("❌ [Chat DO] Invalid templateId:", templateId);
          return new Response("Invalid templateId", { status: 400 });
        }
      } catch (error) {
        console.error("❌ [Chat DO] Error setting context:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    // Handle debug state requests
    if (url.pathname === "/_internal/debug-state") {
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      
      try {
        const debugInfo = {
          workflowLoaded: this.workflowLoaded,
          currentTemplateId: this.currentTemplateId,
          hasCurrentWorkflow: !!this.currentWorkflow,
          workflowName: this.currentWorkflow?.name || null,
          workflowGoalsCount: this.currentWorkflow?.goals?.length || 0,
          workflowVersion: this.currentWorkflow?.version || null,
          hasEnvWorkflowVersions: !!this.env.WORKFLOW_VERSIONS,
          hasEnvOpenAI: !!this.env.OPENAI_API_KEY,
          localTemplatesAvailable: Object.keys(LOCAL_TEMPLATES),
          instanceIdFromDO: this.state?.id?.toString() || 'unknown',
          timestamp: new Date().toISOString()
        };
        
        return Response.json(debugInfo);
      } catch (error) {
        return Response.json({ 
          error: "Debug state failed", 
          message: error.message,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }
    
    // Fallback to the default agent fetch handler
    return super.fetch ? super.fetch(request) : new Response("Not Found", { status: 404 });
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
    // Update template ID to match the saved workflow
    this.currentTemplateId = workflow.id;

    // Save to storage
    try {
      // @ts-ignore - Durable Object storage typing issue
      await this.ctx.storage.put("currentWorkflow", workflow);
      // @ts-ignore - Durable Object storage typing issue
      await this.ctx.storage.put("currentTemplateId", workflow.id);
      console.log("✅ [Chat DO] Workflow saved to storage", { workflowId: workflow.id, goals: workflow.goals.length });
    } catch (storageError) {
      console.warn("⚠️ [Chat DO] Failed to save workflow to storage:", storageError);
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

    // Broadcast workflow update to all connected WebSocket clients
    this.ctx.getWebSockets().forEach(ws => {
      try { 
        ws.send(JSON.stringify({ type: "workflow_updated" })); 
      } catch {}
    });

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
    console.log("📨 [Chat DO] onChatMessage called", {
      messagesCount: this.messages.length,
      workflowLoaded: this.workflowLoaded,
      currentTemplateId: this.currentTemplateId,
      hasModel: !!this.model,
      hasCurrentWorkflow: !!this.currentWorkflow,
      workflowGoalsCount: this.currentWorkflow?.goals?.length || 0,
      instanceId: this.state?.id?.toString() || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Assert critical conditions
    console.assert(this.model, '❌ AI model should be available in onChatMessage');
    console.assert(typeof onFinish === 'function', '❌ onFinish should be a function');

    // Wait for workflow state to be loaded
    if (!this.workflowLoaded) {
      console.log("⏳ [Chat DO] Workflow not loaded, initializing state");
      await this.initializeWorkflowState();
    }

    // Enhanced system prompt with workflow awareness
    const workflowContext = this.currentWorkflow
      ? `Currently editing workflow: "${this.currentWorkflow.name}" with ${this.currentWorkflow.goals.length} goals.`
      : "No workflow currently loaded. Use 'createWorkflow' to start a new workflow.";

    console.log("📝 [Chat DO] System prompt context", {
      hasCurrentWorkflow: !!this.currentWorkflow,
      workflowName: this.currentWorkflow?.name,
      goalsCount: this.currentWorkflow?.goals?.length || 0,
      workflowContext: workflowContext.substring(0, 100) + '...'
    });

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

    console.log("🔧 [Chat DO] Tools collected", {
      baseToolsCount: Object.keys(tools).length,
      mcpToolsCount: Object.keys(this.mcp.unstable_getAITools()).length,
      allToolsCount: Object.keys(allTools).length,
      toolNames: Object.keys(allTools).slice(0, 5) // Just first 5 for brevity
    });

    // Create a streaming response that handles both text and tool outputs
    const dataStreamResponse = createDataStreamResponse({
      execute: async (dataStream) => {
        console.log("🎯 [Chat DO] Starting dataStream execution");
        
        // Process any pending tool calls from previous messages
        // This handles human-in-the-loop confirmations for tools
        const processedMessages = await processToolCalls({
          messages: this.messages,
          dataStream,
          tools: allTools,
          executions,
        });

        console.log("✅ [Chat DO] Tool calls processed", {
          originalMessagesCount: this.messages.length,
          processedMessagesCount: processedMessages.length
        });

        console.log("🚀 [Chat DO] Calling streamText", {
          hasModel: !!this.model,
          systemPromptLength: systemPrompt.length,
          messagesCount: processedMessages.length,
          toolsCount: Object.keys(allTools).length,
          maxSteps: 10
        });

        // Assert critical conditions before streaming
        console.assert(this.model, '❌ Model should exist before streamText call');
        console.assert(systemPrompt, '❌ System prompt should exist');
        console.assert(processedMessages.length > 0, '❌ Should have messages to process');

        try {
          // Stream the AI response using GPT-4
          const result = streamText({
            model: this.model,
            system: systemPrompt,
            messages: processedMessages,
            tools: allTools,
            onFinish: async (args) => {
              console.log("🏁 [Chat DO] streamText finished", {
                hasResult: !!args,
                finishReason: args?.finishReason,
                usage: args?.usage
              });
              onFinish(
                args as Parameters<StreamTextOnFinishCallback<ToolSet>>[0]
              );
              // await this.mcp.closeConnection(mcpConnection.id);
            },
            onError: (error) => {
              console.error("❌ [Chat DO] Error while streaming:", error);
            },
            maxSteps: 10,
          });
          
          console.log("✅ [Chat DO] streamText created successfully, merging into dataStream");
          
          // Merge the AI response stream with tool execution outputs
          result.mergeIntoDataStream(dataStream);
          
          console.log("✅ [Chat DO] Stream merged into dataStream successfully");
          
        } catch (error) {
          console.error("❌ [Chat DO] Failed to create streamText:", error);
          throw error;
        }
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

    // Debug endpoint to check Chat DO state
    if (url.pathname === "/debug/chat-state") {
      try {
        const doId = env.Chat.idFromName("default");
        const chatDO = env.Chat.get(doId);
        
        const debugResponse = await chatDO.fetch(new Request(new URL(request.url).origin + "/_internal/debug-state", {
          method: "GET",
        }));
        
        const debugData = await debugResponse.json();
        
        // Add DO instance ID debugging
        debugData.doInstanceId = doId.toString();
        debugData.debugEndpointUsed = "/debug/chat-state";
        
        return Response.json(debugData);
      } catch (error) {
        return Response.json({ 
          error: "Debug failed", 
          message: error.message,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    // Dedicated endpoint for setting chat context with template ID
    if (url.pathname === "/api/chat/set-context") {
      if (request.method === "OPTIONS") {
        return new Response(null, { 
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          }
        });
      }
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      
      try {
        const { agent, templateId } = await request.json();
        
        console.log("🔧 [Server] Setting chat context", { 
          agent, 
          templateId,
          hasBinding: !!env.Chat,
          timestamp: new Date().toISOString()
        });
        
        // Basic validation
        if (agent !== "chat" || !templateId) {
          return Response.json(
            { success: false, message: "Invalid request body - agent must be 'chat' and templateId is required" },
            { status: 400 }
          );
        }
        
        // Sanitize templateId to prevent path traversal
        if (!/^[\w-]+$/.test(templateId)) {
          return Response.json(
            { success: false, message: "Invalid templateId format" },
            { status: 400 }
          );
        }
        
        // TODO: Add authorization logic here to ensure user can access this templateId
        
        // Get the default Chat DO instance (using room name only to match agents routing)
        const doId = env.Chat.idFromName("default");
        const chatDO = env.Chat.get(doId);
        
        // Send internal request to Chat DO to set context
        console.log("🔗 [Server] Calling Chat DO with context", { templateId });
        const contextResponse = await chatDO.fetch(new Request(new URL(request.url).origin + "/_internal/set-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId }),
        }));
        
        console.log("📡 [Server] Chat DO response", { 
          status: contextResponse.status, 
          ok: contextResponse.ok 
        });
        
        if (contextResponse.ok) {
          console.log("✅ [Server] Chat context set successfully", { templateId });
          return Response.json({ 
            success: true, 
            message: `Context set to template: ${templateId}` 
          }, {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            }
          });
        } else {
          console.error("❌ [Server] Failed to set chat context", await contextResponse.text());
          return Response.json(
            { success: false, message: "Failed to set context" },
            { 
              status: 500,
              headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
              }
            }
          );
        }
        
      } catch (error) {
        console.error("❌ [Server] Error setting chat context:", error);
        return Response.json(
          { success: false, message: "Internal Server Error" },
          { 
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            }
          }
        );
      }
    }
    if (!env.OPENAI_API_KEY) {
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
      (await routeAgentRequest(request, env, { cors: true })) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
