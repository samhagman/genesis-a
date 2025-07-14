import { type Schedule, routeAgentRequest } from "agents";

import { createOpenAI } from "@ai-sdk/openai";
import { AIChatAgent } from "agents/ai-chat-agent";
import {
  type LanguageModel,
  type StreamTextOnFinishCallback,
  type ToolSet,
  createDataStreamResponse,
  streamText,
} from "ai";
import type { Message } from "@ai-sdk/ui-utils";
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
  // Explicitly store the state since the base class might not expose it
  private doState: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    // Store the state explicitly
    this.doState = state;

    console.log("🏗️ [Chat DO] Constructor called", {
      hasApiKey: !!this.env.OPENAI_API_KEY,
      apiKeyLength: this.env.OPENAI_API_KEY?.length || 0,
      environment: this.env.ENVIRONMENT,
      stateId: state.id?.toString() || "unknown",
      timestamp: new Date().toISOString(),
    });

    // Assert critical conditions
    console.assert(
      this.env.OPENAI_API_KEY,
      "❌ OPENAI_API_KEY should be available in env"
    );
    console.assert(
      typeof this.env.OPENAI_API_KEY === "string",
      "❌ OPENAI_API_KEY should be a string"
    );

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
        hasModel: !!this.model,
      });

      // Assert model initialization
      console.assert(this.model, "❌ AI model should be initialized");
    } catch (error) {
      console.error("❌ [Chat DO] Failed to initialize AI model:", error);
      throw error;
    }

    // ❌ REMOVED: this.initializeWorkflowState();
    // This async call was causing a race condition - moved to entry point methods
  }

  /**
   * Store a message for a specific template in DO storage
   * Uses the pattern msg:${templateId}:${messageId} for storage keys
   */
  async storeMessage(templateId: string, message: Message): Promise<void> {
    const key = `msg:${templateId}:${message.id}`;
    try {
      await this.doState.storage.put(key, JSON.stringify(message));
      console.log(
        `💾 [Chat DO] Stored message for template ${templateId}:`,
        message.id
      );
    } catch (error) {
      console.error(
        `❌ [Chat DO] Failed to store message ${message.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Retrieve all messages for a specific template from DO storage
   * Returns messages sorted by timestamp (oldest first)
   */
  async getMessages(templateId: string): Promise<Message[]> {
    const prefix = `msg:${templateId}:`;
    try {
      const keys = await this.doState.storage.list({ prefix });
      const messages: Message[] = [];

      for (const [key, value] of keys) {
        try {
          const message = JSON.parse(value as string) as Message;
          messages.push(message);
        } catch (error) {
          console.error(`❌ [Chat DO] Failed to parse message ${key}:`, error);
        }
      }

      // Sort by createdAt timestamp or by id if createdAt is not available
      return messages.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime || a.id.localeCompare(b.id);
      });
    } catch (error) {
      console.error(
        `❌ [Chat DO] Failed to get messages for ${templateId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Ensure the workflow state is initialized. This is called lazily
   * from methods that depend on the state being loaded.
   */
  private async ensureInitialized(): Promise<void> {
    // If already loaded, do nothing (idempotent)
    if (this.workflowLoaded) {
      return;
    }

    console.log(
      "🔄 [Chat DO] State not initialized. Running initialization logic."
    );

    try {
      // Try to restore saved template ID from durable storage
      const savedTemplateId =
        await this.doState.storage.get<string>("currentTemplateId");
      if (savedTemplateId) {
        console.log(
          "📦 [Chat DO] Found saved template ID, initializing:",
          savedTemplateId
        );
        // This call will set workflowLoaded = true upon success
        await this.initializeWithTemplate(savedTemplateId);
      } else {
        // Use the DO instance name as the template ID if no saved state
        const instanceName = this.doState.id.name;
        if (instanceName && instanceName !== "default") {
          console.log(
            "🔧 [Chat DO] No saved template, using instance name as template ID:",
            instanceName
          );
          await this.initializeWithTemplate(instanceName);
        } else {
          console.warn(
            "📭 [Chat DO] No saved template ID and instance name is default. Agent may have limited context."
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ [Chat DO] CRITICAL: Failed to initialize workflow state:",
        error
      );
      // Re-throwing to signal fatal state corruption
      throw new Error("Failed to initialize agent state.");
    }
  }

  /**
   * Initialize the Chat DO with a specific workflow template
   * This method loads the template and sets up the AI context
   */
  async initializeWithTemplate(templateId: string) {
    console.log("🔧 [Chat DO] Initializing with template:", templateId, {
      previousTemplateId: this.currentTemplateId,
      workflowLoaded: this.workflowLoaded,
      timestamp: new Date().toISOString(),
    });

    // Skip if already loaded with same template
    if (this.currentTemplateId === templateId && this.workflowLoaded) {
      console.log(
        "⚡ [Chat DO] Template already loaded, skipping:",
        templateId
      );
      return;
    }

    try {
      // First try R2 storage
      let workflow: WorkflowTemplateV2 | null = null;

      if (this.env.WORKFLOW_VERSIONS) {
        try {
          const r2Key = `workflows/${templateId}.json`;
          console.log("📚 [Chat DO] Attempting to load from R2:", r2Key);
          const r2Object = await this.env.WORKFLOW_VERSIONS.get(r2Key);

          if (r2Object) {
            const workflowData = await r2Object.json<WorkflowTemplateV2>();
            if (validateWorkflowV2(workflowData)) {
              workflow = workflowData;
              console.log("✅ [Chat DO] Loaded workflow from R2:", {
                templateId,
                workflowName: workflow.name,
                goalsCount: workflow.goals?.length || 0,
              });
            } else {
              console.error("❌ [Chat DO] Invalid workflow data from R2");
            }
          } else {
            console.log("❌ [Chat DO] Workflow not found in R2:", r2Key);
          }
        } catch (r2Error) {
          console.error("❌ [Chat DO] R2 loading failed:", r2Error);
        }
      } else {
        console.warn("⚠️ [Chat DO] R2 bucket not configured");
      }

      // Fall back to local templates if R2 fails
      if (!workflow && LOCAL_TEMPLATES[templateId]) {
        workflow = LOCAL_TEMPLATES[templateId];
        console.log("📂 [Chat DO] Loaded workflow from local fallback:", {
          templateId,
          workflowName: workflow.name,
          goalsCount: workflow.goals?.length || 0,
        });
      }

      if (!workflow) {
        throw new Error(
          `Workflow template not found: ${templateId} (tried R2 and local)`
        );
      }

      // Store the workflow in memory and state
      this.currentWorkflow = workflow;
      this.currentTemplateId = templateId;
      this.workflowLoaded = true;

      // Persist the current template ID
      await this.doState.storage.put("currentTemplateId", templateId);

      console.log("✅ [Chat DO] Successfully initialized with template:", {
        templateId,
        workflowName: workflow.name,
        workflowDescription: workflow.objective,
        goalsCount: workflow.goals?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Clear chat history when switching templates (optional)
      // await this.doState.storage.delete("messages");
    } catch (error) {
      console.error(
        "❌ [Chat DO] Failed to initialize with template:",
        templateId,
        error
      );
      this.workflowLoaded = false;
      throw error;
    }
  }

  /**
   * Override the fetch method to handle additional internal routes
   */
  async fetch(request: Request) {
    console.log("🌐 [Chat DO] Fetch called", {
      url: request.url,
      method: request.method,
      // biome-ignore lint/suspicious/noExplicitAny: Headers.entries() exists but TypeScript types are incomplete
      headers: Object.fromEntries((request.headers as any).entries()),
      hasCurrentWorkflow: !!this.currentWorkflow,
      currentTemplateId: this.currentTemplateId,
      timestamp: new Date().toISOString(),
    });

    const url = new URL(request.url);

    // Handle internal debug requests
    if (url.pathname === "/_internal/debug-state") {
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      // Ensure state is initialized before gathering debug info
      await this.ensureInitialized();

      const debugInfo = {
        currentTemplateId: this.currentTemplateId,
        workflowLoaded: this.workflowLoaded,
        hasCurrentWorkflow: !!this.currentWorkflow,
        workflowName: this.currentWorkflow?.name || null,
        workflowGoalsCount: this.currentWorkflow?.goals?.length || 0,
        hasModel: !!this.model,
        modelType: typeof this.model,
        environment: this.env.ENVIRONMENT,
        hasOpenAIKey: !!this.env.OPENAI_API_KEY,
        stateId: this.doState.id?.toString() || "unknown",
        timestamp: new Date().toISOString(),
      };

      console.log("🔍 [Chat DO] Debug state requested:", debugInfo);
      return Response.json(debugInfo);
    }

    // Handle internal clear history requests
    if (url.pathname === "/_internal/clear-history") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        console.log("🧹 [Chat DO] Clearing message history");
        console.log(
          "🧹 [Chat DO] Messages before clear:",
          this.messages?.length || 0
        );

        // CRITICAL: Clear messages from the SQL table
        // The base class AIChatAgent stores messages in cf_ai_chat_agent_messages table
        try {
          console.log(
            "🧹 [Chat DO] Deleting messages from SQL table cf_ai_chat_agent_messages"
          );
          // Access the sql method from the base class
          // The parent class uses this.sql`delete from cf_ai_chat_agent_messages`
          if (this.sql) {
            this.sql`delete from cf_ai_chat_agent_messages`;
            console.log("✅ [Chat DO] SQL table cleared successfully");
          } else {
            console.warn(
              "⚠️ [Chat DO] SQL method not available on this instance"
            );
          }
        } catch (sqlError) {
          console.error("❌ [Chat DO] Error clearing SQL table:", sqlError);
        }

        // Clear our in-memory messages
        this.messages = [];

        // Also clear any Durable Object storage that might be used
        if (this.doState?.storage) {
          const keysBefore = await this.doState.storage.list();
          console.log(
            "🧹 [Chat DO] Storage keys before clear:",
            Array.from(keysBefore.keys())
          );

          // Delete all keys from storage to be thorough
          for (const key of keysBefore.keys()) {
            await this.doState.storage.delete(key);
            console.log(`🧹 [Chat DO] Deleted storage key: ${key}`);
          }

          const keysAfter = await this.doState.storage.list();
          console.log(
            "🧹 [Chat DO] Storage keys after clear:",
            Array.from(keysAfter.keys())
          );
        }

        console.log("✅ [Chat DO] Message history cleared successfully");
        console.log(
          "✅ [Chat DO] Messages after clear:",
          this.messages?.length || 0
        );
        return Response.json({ success: true, messagesCleared: true });
      } catch (error) {
        console.error("❌ [Chat DO] Failed to clear history:", error);
        return Response.json(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    // Handle internal context setting requests
    if (url.pathname === "/_internal/set-context") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const { templateId } = (await request.json()) as { templateId: string };

        console.log("🔧 [Chat DO] Setting context to template:", templateId);

        if (typeof templateId === "string" && templateId.length > 0) {
          await this.initializeWithTemplate(templateId);
          console.log("✅ [Chat DO] Context set successfully to:", templateId);
          return new Response("Context set successfully", { status: 200 });
        }
        return new Response("Invalid templateId", { status: 400 });
      } catch (error) {
        console.error("❌ [Chat DO] Failed to set context:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    // Handle message retrieval endpoint
    if (url.pathname.endsWith("/messages") && request.method === "GET") {
      const templateId = url.searchParams.get("templateId");
      if (!templateId) {
        return new Response(JSON.stringify({ error: "templateId required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const messages = await this.getMessages(templateId);
        console.log(
          `📥 [Chat DO] Retrieved ${messages.length} messages for template ${templateId}`
        );
        return new Response(JSON.stringify({ messages }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error(
          `❌ [Chat DO] Failed to get messages for ${templateId}:`,
          error
        );
        return new Response(JSON.stringify({ messages: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Handle clear messages endpoint
    if (url.pathname.endsWith("/clear") && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          templateId?: string;
          clearAll?: boolean;
        };
        const { templateId, clearAll } = body;

        if (clearAll) {
          // Clear all messages for all templates
          const keys = await this.doState.storage.list({ prefix: "msg:" });
          await Promise.all(
            [...keys.keys()].map((key) => this.doState.storage.delete(key))
          );
          console.log("🧹 [Chat DO] Cleared all messages");
        } else if (templateId) {
          // Clear messages for specific template
          const prefix = `msg:${templateId}:`;
          const keys = await this.doState.storage.list({ prefix });
          await Promise.all(
            [...keys.keys()].map((key) => this.doState.storage.delete(key))
          );
          console.log(
            `🧹 [Chat DO] Cleared messages for template ${templateId}`
          );
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("❌ [Chat DO] Failed to clear messages:", error);
        return new Response(JSON.stringify({ success: false }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Handle WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      console.log("🔌 [Chat DO] WebSocket upgrade requested", {
        hasModel: !!this.model,
        hasCurrentWorkflow: !!this.currentWorkflow,
        currentTemplateId: this.currentTemplateId,
        timestamp: new Date().toISOString(),
      });

      // No need to initialize here - onChatMessage will handle it lazily
    }

    // Call parent class fetch for normal agent operations
    const response = await super.fetch(request);

    console.log("🔄 [Chat DO] Parent fetch completed", {
      status: response.status,
      statusText: response.statusText,
      hasBody: !!response.body,
      // biome-ignore lint/suspicious/noExplicitAny: Headers.entries() exists but TypeScript types are incomplete
      headers: Object.fromEntries((response.headers as any).entries()),
    });

    return response;
  }

  get id() {
    return this.doState.id.toString();
  }

  getModel() {
    console.log("🤖 [Chat DO] getModel called", {
      hasModel: !!this.model,
      modelType: typeof this.model,
      hasCurrentWorkflow: !!this.currentWorkflow,
      workflowGoalsCount: this.currentWorkflow?.goals?.length || 0,
      instanceId: "durable-object-instance",
      timestamp: new Date().toISOString(),
    });

    // Assert critical conditions
    console.assert(
      this.model,
      "❌ Model should be initialized before getModel is called"
    );
    console.assert(
      this.currentWorkflow,
      "⚠️ Current workflow should be loaded before getModel is called"
    );

    return this.model;
  }

  getTools() {
    console.log("🛠️ [Chat DO] getTools called", {
      hasCurrentWorkflow: !!this.currentWorkflow,
      workflowName: this.currentWorkflow?.name,
      goalsCount: this.currentWorkflow?.goals?.length || 0,
      timestamp: new Date().toISOString(),
    });

    return tools;
  }

  async onToolCall({
    context,
    toolCall,
    state,
  }: {
    context?: ToolSet;
    toolCall: { toolName: string; args: Record<string, unknown> };
    state: {
      messages: Array<{ role: string; content: string }>;
      userId?: string;
    };
  }) {
    console.log("🔧 [Chat DO] onToolCall:", {
      toolName: toolCall.toolName,
      args: toolCall.args,
      hasContext: !!context,
      hasCurrentWorkflow: !!this.currentWorkflow,
      messagesCount: state.messages?.length || 0,
      userId: state.userId,
      timestamp: new Date().toISOString(),
    });

    // Return execution object if provided by context
    return executions;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Complex type mismatch with streamText onFinish callback
  async onFinish(params: any) {
    const { text, finishReason, toolCalls, toolResults, usage, warnings } =
      params;
    console.log("🏁 [Chat DO] onFinish called", {
      responseLength: text?.length || 0,
      finishReason,
      toolCallsCount: toolCalls?.length || 0,
      toolResultsCount: toolResults?.length || 0,
      totalTokens: usage?.totalTokens || 0,
      warningsCount: warnings?.length || 0,
      hasCurrentWorkflow: !!this.currentWorkflow,
      timestamp: new Date().toISOString(),
    });

    // Process any tool calls if needed
    if (toolCalls && toolCalls.length > 0) {
      // TODO: Fix processToolCalls call - it expects an object with messages, dataStream, tools, executions
      // const processedResults = await processToolCalls(
      //   toolCalls,
      //   this.currentWorkflow
      // );
      console.log("✅ [Chat DO] Tool calls found but not processed:", {
        toolCallsCount: toolCalls.length,
      });
    }

    // Broadcast workflow update to all connected WebSocket clients
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(JSON.stringify({ type: "workflow_updated" }));
      } catch (error) {
        console.error("❌ [Chat DO] Failed to send WebSocket update:", error);
      }
    }
  }

  /**
   * Get the current workflow being edited
   * This method is required by the workflow tools
   */
  getCurrentWorkflow(): WorkflowTemplateV2 | null {
    console.log("📋 [Chat DO] getCurrentWorkflow called", {
      hasCurrentWorkflow: !!this.currentWorkflow,
      workflowName: this.currentWorkflow?.name,
      currentTemplateId: this.currentTemplateId,
      timestamp: new Date().toISOString(),
    });

    return this.currentWorkflow;
  }

  /**
   * Save the current workflow being edited
   * This method is required by the workflow tools
   */
  async saveCurrentWorkflow(workflow: WorkflowTemplateV2): Promise<void> {
    console.log("💾 [Chat DO] saveCurrentWorkflow called", {
      workflowId: workflow.id,
      workflowName: workflow.name,
      goalsCount: workflow.goals?.length || 0,
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate workflow before saving
      if (!validateWorkflowV2(workflow)) {
        throw new Error("Invalid workflow structure");
      }

      // Update last modified timestamp
      if (!workflow.metadata) {
        workflow.metadata = {
          author: "system",
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          tags: [],
        };
      }
      workflow.metadata.last_modified = new Date().toISOString();

      // Store in memory
      this.currentWorkflow = workflow;
      this.currentTemplateId = workflow.id;
      this.workflowLoaded = true;

      // Persist to durable storage
      await this.doState.storage.put("currentWorkflow", workflow);
      await this.doState.storage.put("currentTemplateId", workflow.id);

      // Also save to R2 for persistence and versioning
      if (this.env.WORKFLOW_VERSIONS) {
        const key = `workflows/${workflow.id}.json`;
        await this.env.WORKFLOW_VERSIONS.put(
          key,
          JSON.stringify(workflow, null, 2),
          {
            httpMetadata: {
              contentType: "application/json",
            },
            customMetadata: {
              workflowId: workflow.id,
              workflowName: workflow.name,
              version: workflow.version || "1.0",
              goalsCount: workflow.goals?.length.toString() || "0",
              updated: new Date().toISOString(),
            },
          }
        );
        console.log(`✅ [Chat DO] Workflow saved to R2: ${key}`);
      }

      console.log("✅ [Chat DO] Workflow saved successfully", {
        workflowId: workflow.id,
        workflowName: workflow.name,
        goalsCount: workflow.goals?.length || 0,
      });
    } catch (error) {
      console.error("❌ [Chat DO] Failed to save workflow:", error);
      throw error;
    }
  }

  /**
   * Schedule a task for future execution
   * This method is required by the scheduling tools
   */
  async schedule<T = string>(
    when: Date | number | string,
    callback: keyof this,
    payload?: T
  ): Promise<Schedule<T>> {
    console.log("⏰ [Chat DO] schedule called", {
      when: typeof when === "object" ? when.toISOString() : when,
      callback: String(callback),
      hasPayload: !!payload,
      timestamp: new Date().toISOString(),
    });

    try {
      // Call the parent class implementation
      const schedule = await super.schedule(when, callback, payload);
      console.log("✅ [Chat DO] Task scheduled successfully", {
        scheduleId: schedule.id,
        callback: String(callback),
        when: typeof when === "object" ? when.toISOString() : when,
      });
      return schedule;
    } catch (error) {
      console.error("❌ [Chat DO] Failed to schedule task:", error);
      throw error;
    }
  }

  /**
   * Get all scheduled tasks
   * This method is required by the scheduling tools
   */
  getSchedules<T = string>(criteria?: {
    id?: string;
    type?: "scheduled" | "delayed" | "cron";
    timeRange?: { start?: Date; end?: Date };
  }): Schedule<T>[] {
    console.log("📋 [Chat DO] getSchedules called", {
      hasCriteria: !!criteria,
      criteria,
      timestamp: new Date().toISOString(),
    });

    try {
      const schedules = super.getSchedules(criteria) as Schedule<T>[];
      console.log("✅ [Chat DO] Retrieved schedules successfully", {
        schedulesCount: schedules?.length || 0,
      });
      return schedules;
    } catch (error) {
      console.error("❌ [Chat DO] Failed to get schedules:", error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled task by ID
   * This method is required by the scheduling tools
   */
  async cancelSchedule(taskId: string): Promise<boolean> {
    console.log("❌ [Chat DO] cancelSchedule called", {
      taskId,
      timestamp: new Date().toISOString(),
    });

    try {
      const success = await super.cancelSchedule(taskId);
      console.log("✅ [Chat DO] Schedule canceled successfully", {
        taskId,
        success,
      });
      return success;
    } catch (error) {
      console.error("❌ [Chat DO] Failed to cancel schedule:", error);
      throw error;
    }
  }

  /**
   * Execute a scheduled task - called by the scheduler
   * This method is called when a scheduled task executes
   */
  async executeTask(description: string): Promise<void> {
    console.log("⚡ [Chat DO] executeTask called", {
      description,
      timestamp: new Date().toISOString(),
    });

    try {
      // For now, just log the task execution
      // In the future, this could send messages or perform other actions
      console.log("✅ [Chat DO] Scheduled task executed:", description);
    } catch (error) {
      console.error("❌ [Chat DO] Failed to execute scheduled task:", error);
      throw error;
    }
  }

  async getSystemPrompt() {
    // Ensure state is initialized before proceeding
    await this.ensureInitialized();

    console.log("📝 [Chat DO] getSystemPrompt called", {
      hasCurrentWorkflow: !!this.currentWorkflow,
      workflowName: this.currentWorkflow?.name,
      currentTemplateId: this.currentTemplateId,
      goalsCount: this.currentWorkflow?.goals?.length || 0,
      timestamp: new Date().toISOString(),
    });

    if (!this.currentWorkflow) {
      console.warn(
        "⚠️ [Chat DO] No workflow loaded, using default system prompt"
      );
      return "You are a helpful AI assistant that can view and help manage workflow templates.";
    }

    // Create a detailed system prompt that includes workflow context
    const prompt = `You are an AI assistant helping with the "${this.currentWorkflow.name}" workflow template.

Workflow Description: ${this.currentWorkflow.objective || "No description provided"}

This workflow has ${this.currentWorkflow.goals?.length || 0} goals:
${
  this.currentWorkflow.goals
    ?.map((goal, idx) => `${idx + 1}. ${goal.name}: ${goal.description}`)
    .join("\n") || "No goals defined"
}

You can help users understand the workflow, edit it, and answer questions about its structure and purpose.

When the user asks about the workflow, you have access to tools that let you:
- View the current workflow structure
- Add, edit, or delete goals
- Manage constraints, policies, tasks, and forms
- Analyze workflow patterns

Always be helpful and provide clear explanations about the workflow components.`;

    console.log("✅ [Chat DO] Generated system prompt", {
      promptLength: prompt.length,
      workflowName: this.currentWorkflow.name,
    });

    return prompt;
  }

  /**
   * Handle incoming chat messages. This is the core method required by AIChatAgent.
   * It processes user messages and returns an AI response stream.
   *
   * Expected flow:
   * 1. AIChatAgent base class receives WebSocket message
   * 2. Base class parses message and adds to this.messages
   * 3. Base class calls this method with onFinish callback
   * 4. We process messages and stream response
   * 5. We call onFinish when done
   */
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal }
  ) {
    console.log("💬 [Chat DO] ========== ONCHATMESSAGE ENTRY ==========");
    console.log("💬 [Chat DO] onChatMessage called with parameters:", {
      hasOnFinish: !!onFinish,
      onFinishType: typeof onFinish,
      hasOptions: !!options,
      hasAbortSignal: !!options?.abortSignal,
      timestamp: new Date().toISOString(),
    });

    // ASSERTION 1: Verify onFinish callback is provided
    console.assert(
      typeof onFinish === "function",
      "❌ ASSERTION FAILED: onFinish must be a function"
    );

    // ASSERTION 2: Verify critical components are initialized
    console.log("🔍 [Chat DO] Checking component initialization:", {
      hasModel: !!this.model,
      modelType: typeof this.model,
      hasCurrentWorkflow: !!this.currentWorkflow,
      workflowName: this.currentWorkflow?.name || "none",
      hasMessages: !!this.messages,
      messagesType: typeof this.messages,
      isMessagesArray: Array.isArray(this.messages),
      messageCount: Array.isArray(this.messages) ? this.messages.length : "N/A",
    });

    console.assert(
      this.model,
      "❌ ASSERTION FAILED: Model must be initialized"
    );

    // ASSERTION 3: Verify messages property exists and is an array
    console.assert(
      Array.isArray(this.messages),
      "❌ ASSERTION FAILED: this.messages must be an array"
    );

    // Log current messages
    if (Array.isArray(this.messages)) {
      console.log("📝 [Chat DO] Current message history:", {
        count: this.messages.length,
        messages: this.messages.map((msg, idx) => ({
          index: idx,
          role: msg.role,
          contentPreview: `${msg.content?.substring(0, 50)}...`,
        })),
      });

      // Store the latest user message if it hasn't been stored yet
      if (this.messages.length > 0 && this.currentTemplateId) {
        const latestMessage = this.messages[this.messages.length - 1];
        if (latestMessage.role === "user") {
          console.log(
            "💾 [Chat DO] Storing user message for template:",
            this.currentTemplateId
          );
          await this.storeMessage(this.currentTemplateId, latestMessage);
        }
      }
    }

    console.log("🔄 [Chat DO] Ensuring workflow is initialized...");
    // Ensure the workflow state is loaded before proceeding
    await this.ensureInitialized();
    console.log("✅ [Chat DO] Workflow initialization complete");

    // Create a streaming response that handles both text and tool outputs
    console.log("🌊 [Chat DO] Creating data stream response...");
    const dataStreamResponse = createDataStreamResponse({
      execute: async (dataStream) => {
        console.log(
          "🚀 [Chat DO] ========== EXECUTE FUNCTION START =========="
        );
        console.log("🚀 [Chat DO] DataStream execute function called", {
          hasDataStream: !!dataStream,
          dataStreamType: typeof dataStream,
        });

        try {
          // Get all tools
          console.log("🛠️ [Chat DO] Getting tools...");
          const allTools = this.getTools();
          console.log("🛠️ [Chat DO] Tools retrieved:", {
            toolCount: Object.keys(allTools).length,
            toolNames: Object.keys(allTools),
          });

          // ASSERTION 4: Verify tools are available
          console.assert(
            allTools && Object.keys(allTools).length > 0,
            "❌ ASSERTION FAILED: Tools must be available"
          );

          // Process any pending tool calls from previous messages
          console.log("🔧 [Chat DO] Processing tool calls...");
          console.log("🔧 [Chat DO] Using this.messages directly:", {
            messagesLength: this.messages?.length || 0,
            hasMessages: !!this.messages,
            firstMessage: this.messages?.[0],
          });

          // FIX: Use this.messages directly instead of calling getMessages()
          const processedMessages = await processToolCalls({
            messages: this.messages, // Direct property access
            dataStream,
            tools: allTools,
            executions,
          });

          console.log("✅ [Chat DO] Tool calls processed:", {
            processedMessageCount: processedMessages.length,
            originalMessageCount: this.messages.length,
          });

          // Get system prompt
          console.log("📋 [Chat DO] Getting system prompt...");
          const systemPrompt = await this.getSystemPrompt();
          console.log("📋 [Chat DO] System prompt retrieved:", {
            promptLength: systemPrompt.length,
            promptPreview: `${systemPrompt.substring(0, 100)}...`,
          });

          // Stream the AI response using the model
          console.log("🤖 [Chat DO] Starting streamText with parameters:", {
            hasModel: !!this.getModel(),
            messageCount: processedMessages.length,
            systemPromptLength: systemPrompt.length,
            toolCount: Object.keys(allTools).length,
          });

          const result = streamText({
            model: this.getModel(),
            system: systemPrompt,
            messages: processedMessages,
            tools: allTools,
            onFinish: async (args) => {
              console.log("🏁 [Chat DO] ========== STREAM ONFINISH ==========");
              console.log("✅ [Chat DO] streamText onFinish called:", {
                finishReason: args.finishReason,
                usage: args.usage,
                hasToolCalls: !!args.toolCalls && args.toolCalls.length > 0,
                toolCallCount: args.toolCalls?.length || 0,
                responseLength: args.text?.length || 0,
              });

              // Store the assistant message
              if (this.currentTemplateId && args.text) {
                const assistantMessage: Message = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: args.text,
                  createdAt: new Date(),
                };
                console.log(
                  "💾 [Chat DO] Storing assistant message for template:",
                  this.currentTemplateId
                );
                await this.storeMessage(
                  this.currentTemplateId,
                  assistantMessage
                );
              }

              // Call the provided onFinish callback
              console.log(
                "📞 [Chat DO] Calling framework onFinish callback..."
              );
              onFinish(
                args as Parameters<StreamTextOnFinishCallback<ToolSet>>[0]
              );
              console.log("✅ [Chat DO] Framework onFinish callback completed");

              // Also call our class-level onFinish to handle tool calls and updates
              if (this.onFinish) {
                console.log("📞 [Chat DO] Calling class-level onFinish...");
                await this.onFinish({
                  text: args.text,
                  finishReason: args.finishReason,
                  toolCalls: args.toolCalls,
                  toolResults: args.toolResults,
                  usage: args.usage,
                  warnings: args.warnings,
                });
                console.log("✅ [Chat DO] Class-level onFinish completed");
              }
            },
            onError: (error) => {
              console.error("❌ [Chat DO] ========== STREAM ERROR ==========");
              console.error("❌ [Chat DO] Error while streaming:", {
                errorType:
                  error instanceof Error
                    ? error.constructor.name
                    : typeof error,
                errorMessage:
                  error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
              });
            },
            maxSteps: 10,
            abortSignal: options?.abortSignal,
          });

          console.log("🔀 [Chat DO] Merging AI response into data stream...");
          // Merge the AI response stream with tool execution outputs
          result.mergeIntoDataStream(dataStream);
          console.log("✅ [Chat DO] AI response merged successfully");
        } catch (error) {
          console.error("❌ [Chat DO] ========== EXECUTE ERROR ==========");
          console.error("❌ [Chat DO] Critical error in execute function:", {
            errorType:
              error instanceof Error ? error.constructor.name : typeof error,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            errorDetails: error,
          });
          // Log the state at time of error
          console.error("❌ [Chat DO] State at error:", {
            hasModel: !!this.model,
            hasMessages: !!this.messages,
            messageCount: this.messages?.length || "error",
            hasCurrentWorkflow: !!this.currentWorkflow,
          });
          throw error;
        }

        console.log("🎉 [Chat DO] ========== EXECUTE FUNCTION END ==========");
      },
    });

    console.log("🔄 [Chat DO] Returning data stream response");
    console.log("💬 [Chat DO] ========== ONCHATMESSAGE EXIT ==========");
    return dataStreamResponse;
  }
}

interface Env extends WorkflowEditingEnv {
  ENVIRONMENT: string;
  OPENAI_API_KEY: string;
  // Updated to match wrangler.jsonc binding name
  Chat: DurableObjectNamespace;
  WORKFLOW_VERSIONS: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Enable verbose logging in development
    const isDev = env.ENVIRONMENT === "development";
    if (isDev) {
      console.log("🌐 [Server] Incoming request", {
        method: request.method,
        url: request.url,
        pathname: url.pathname,
        // biome-ignore lint/suspicious/noExplicitAny: Headers.entries() exists but TypeScript types are incomplete
        headers: Object.fromEntries((request.headers as any).entries()),
        hasOpenAIKey: !!env.OPENAI_API_KEY,
        keyLength: env.OPENAI_API_KEY?.length,
      });
    }

    // Handle check-open-ai-key endpoint
    if (url.pathname === "/check-open-ai-key") {
      // Add CORS headers
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      const hasKey = !!env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 0;

      return Response.json(
        { success: hasKey },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    // Handle debug endpoint to check Chat DO state
    if (url.pathname === "/debug/chat-state") {
      // Add CORS headers for debug endpoint
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      try {
        // Get the default Chat DO instance
        const doId = env.Chat.idFromName("default");
        const chatDO = env.Chat.get(doId);

        const debugResponse = await chatDO.fetch(
          new Request(`${new URL(request.url).origin}/_internal/debug-state`, {
            method: "GET",
          })
        );

        const debugData = (await debugResponse.json()) as Record<
          string,
          unknown
        >;

        // Add DO instance ID debugging
        debugData.doInstanceId = doId.toString();
        debugData.debugEndpointUsed = "/debug/chat-state";

        return Response.json(debugData);
      } catch (error) {
        return Response.json(
          {
            error: "Debug failed",
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        );
      }
    }

    // Handle clear chat history endpoint
    if (url.pathname === "/clear-chat-history") {
      // Add CORS headers
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        // Get the default Chat DO instance
        const doId = env.Chat.idFromName("default");
        const chatDO = env.Chat.get(doId);

        // Clear the chat history in the DO
        const clearResponse = await chatDO.fetch(
          new Request(
            `${new URL(request.url).origin}/_internal/clear-history`,
            {
              method: "POST",
              headers: {
                // Add required PartyKit headers
                "x-partykit-namespace": "chat",
                "x-partykit-room": "default",
              },
            }
          )
        );

        if (clearResponse.ok) {
          return Response.json(
            { success: true, message: "Chat history cleared" },
            {
              headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
              },
            }
          );
        }
        return Response.json(
          { success: false, message: "Failed to clear history" },
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          }
        );
      } catch (error) {
        console.error("Failed to clear chat history:", error);
        return Response.json(
          { success: false, message: "Internal Server Error" },
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          }
        );
      }
    }

    // Handle chat context setting endpoint
    if (url.pathname === "/api/chat/set-context") {
      // Add CORS headers
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const { agent, templateId, name } = (await request.json()) as {
          agent: string;
          templateId: string;
          name?: string; // DO instance name
        };

        console.log("🔧 [Server] Setting chat context", {
          agent,
          templateId,
          name,
          hasBinding: !!env.Chat,
          timestamp: new Date().toISOString(),
        });

        // Basic validation
        if (agent !== "chat" || !templateId) {
          return Response.json(
            {
              success: false,
              message:
                "Invalid request body - agent must be 'chat' and templateId is required",
            },
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

        // Get the Chat DO instance for this workflow (or default)
        const instanceName = name || templateId || "default";
        const doId = env.Chat.idFromName(instanceName);
        const chatDO = env.Chat.get(doId);

        // Send internal request to Chat DO to set context
        console.log("🔗 [Server] Calling Chat DO with context", {
          templateId,
          instanceName,
          doId: doId.toString(),
        });
        const contextResponse = await chatDO.fetch(
          new Request(`${new URL(request.url).origin}/_internal/set-context`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateId }),
          })
        );

        console.log("📡 [Server] Chat DO response", {
          status: contextResponse.status,
          ok: contextResponse.ok,
        });

        if (contextResponse.ok) {
          console.log("✅ [Server] Chat context set successfully", {
            templateId,
          });
          return Response.json(
            {
              success: true,
              message: `Context set to template: ${templateId}`,
            },
            {
              headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
              },
            }
          );
        }
        console.error(
          "❌ [Server] Failed to set chat context",
          await contextResponse.text()
        );
        return Response.json(
          { success: false, message: "Failed to set context" },
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          }
        );
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
            },
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
        const workflowResponse = await routeWorkflowEditingAPI(request, env);
        if (workflowResponse) return workflowResponse;
      } else {
        console.error("Workflow editing environment validation failed");
        return Response.json(
          {
            error: "Service unavailable",
            message: "Workflow editing is not properly configured",
          },
          { status: 503 }
        );
      }
    }

    // Handle API endpoint to list all available templates
    if (url.pathname === "/api/templates") {
      // Add CORS headers
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const templates = [];

        // Try to get templates from R2 first
        if (env.WORKFLOW_VERSIONS) {
          console.log("📚 [Server] Listing templates from R2");
          const list = await env.WORKFLOW_VERSIONS.list({
            prefix: "workflows/",
            limit: 100,
          });

          for (const object of list.objects) {
            // Extract template ID from key (workflows/template-id.json)
            const templateId = object.key
              .replace("workflows/", "")
              .replace(".json", "");

            // Get template metadata
            const r2Object = await env.WORKFLOW_VERSIONS.get(object.key);
            if (r2Object) {
              try {
                const workflow = await r2Object.json<WorkflowTemplateV2>();
                if (validateWorkflowV2(workflow)) {
                  // Filter out AI-generated workflows from templates list
                  const isAIGenerated =
                    templateId.startsWith("wf-") ||
                    workflow.metadata?.author === "AI Agent";

                  if (!isAIGenerated) {
                    templates.push({
                      id: templateId,
                      name: workflow.name,
                      version: workflow.version || "1.0",
                      last_modified: object.uploaded.toISOString(),
                      author: workflow.metadata?.author || "Unknown",
                      tags: workflow.metadata?.tags || [],
                      source: "r2" as const,
                    });
                  }
                }
              } catch (error) {
                console.error(`Failed to parse template ${templateId}:`, error);
              }
            }
          }
        }

        // Add local templates as fallback
        for (const [id, workflow] of Object.entries(LOCAL_TEMPLATES)) {
          // Check if this template is already in the list from R2
          if (!templates.find((t) => t.id === id)) {
            templates.push({
              id,
              name: workflow.name,
              version: workflow.version || "1.0",
              last_modified:
                workflow.metadata?.last_modified || new Date().toISOString(),
              author: workflow.metadata?.author || "Unknown",
              tags: workflow.metadata?.tags || [],
              source: "local" as const,
            });
          }
        }

        console.log(`✅ [Server] Found ${templates.length} templates`);

        return Response.json(
          {
            success: true,
            templates,
            count: templates.length,
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          }
        );
      } catch (error) {
        console.error("❌ [Server] Failed to list templates:", error);
        return Response.json(
          {
            success: false,
            message: "Failed to list templates",
            templates: [],
          },
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          }
        );
      }
    }

    // Handle API endpoint to save workflow template
    if (url.pathname === "/api/workflow/save") {
      // Add CORS headers
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const { workflow, sessionId } = (await request.json()) as {
          workflow: WorkflowTemplateV2;
          sessionId?: string;
        };

        if (!workflow || !workflow.id) {
          return Response.json(
            {
              success: false,
              message: "Invalid workflow data",
            },
            {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        // Validate workflow structure
        if (!validateWorkflowV2(workflow)) {
          return Response.json(
            {
              success: false,
              message: "Invalid workflow structure",
            },
            {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        // Save to R2 if available
        if (env.WORKFLOW_VERSIONS) {
          const r2Key = `workflows/${workflow.id}.json`;

          // Update metadata
          workflow.metadata = {
            ...workflow.metadata,
            last_modified: new Date().toISOString(),
          };

          await env.WORKFLOW_VERSIONS.put(
            r2Key,
            JSON.stringify(workflow, null, 2),
            {
              httpMetadata: {
                contentType: "application/json",
              },
              customMetadata: {
                workflowId: workflow.id,
                workflowName: workflow.name,
                version: workflow.version || "1.0",
                sessionId: sessionId || "unknown",
              },
            }
          );

          console.log(`✅ [Server] Saved workflow to R2: ${r2Key}`);

          // Also update the Chat DO if this is the current template
          if (sessionId) {
            const doId = env.Chat.idFromName(sessionId || "default");
            const chatDO = env.Chat.get(doId);

            // Notify the DO to reload the template
            await chatDO.fetch(
              new Request(
                `${new URL(request.url).origin}/_internal/set-context`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ templateId: workflow.id }),
                }
              )
            );
          }

          return Response.json(
            {
              success: true,
              message: "Workflow saved successfully",
              workflowId: workflow.id,
            },
            {
              headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
              },
            }
          );
        }
        return Response.json(
          {
            success: false,
            message: "Storage not configured",
          },
          {
            status: 503,
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (error) {
        console.error("❌ [Server] Failed to save workflow:", error);
        return Response.json(
          {
            success: false,
            message: "Failed to save workflow",
          },
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          }
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

// Export agents configuration for the agents package
export const agents = {
  chat: Chat,
};
