import type { Message } from "@ai-sdk/react";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { tools } from "../../tools";

import type {
  ToolCall,
  WorkflowEditRequest,
  WorkflowEditResponse,
} from "@/agents/workflowEditingAgent";
// Workflow editing imports
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import { loadWorkflowSafe } from "@/utils/workflowApi";
import { getApiUrl, getWsUrl, getApiHost } from "@/config";

import { Avatar } from "@/components/avatar/Avatar";
// Component imports
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { DropdownMenu } from "@/components/dropdown/DropdownMenu";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { Textarea } from "@/components/textarea/Textarea";
import { Toggle } from "@/components/toggle/Toggle";
import { ToolInvocationCard } from "@/components/tool-invocation-card/ToolInvocationCard";
import { type AgentStatus, AgentStatusDisplay } from "./AgentStatusDisplay";

// Icon imports
import {
  Bug,
  Moon,
  PaperPlaneTilt,
  Robot,
  Stop,
  Sun,
  Trash,
} from "@phosphor-icons/react";

// List of tools that require human confirmation
const toolsRequiringConfirmation: (keyof typeof tools)[] = [
  "getWeatherInformation",
  "deleteGoal",
  "deleteTask",
  "deleteConstraint",
  "addPolicy",
];

export interface ChatPanelProps {
  theme: "dark" | "light";
  onThemeToggle: () => void;
  workflow?: WorkflowTemplateV2 | null;
  selectedTemplateId?: string;
  onWorkflowUpdate?: (workflow: WorkflowTemplateV2) => void;
  viewMode?: "edit" | "instance";
}

export function ChatPanel({
  theme,
  onThemeToggle,
  workflow,
  selectedTemplateId,
  onWorkflowUpdate,
  viewMode = "edit",
}: ChatPanelProps) {
  const [showDebug, setShowDebug] = useState(false);
  const editMode = false;
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [textareaHeight, setTextareaHeight] = useState("auto");
  const [editHistory, setEditHistory] = useState<
    Array<{
      id: string;
      request: string;
      response: WorkflowEditResponse;
      timestamp: Date;
    }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false);
  const [lastMessageDate, setLastMessageDate] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Initialize chat context when selectedTemplateId changes
  useEffect(() => {
    if (selectedTemplateId) {
      console.log(
        "🔧 [ChatPanel] Initializing chat context with template:",
        selectedTemplateId
      );

      fetch(getApiUrl("/api/chat/set-context"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent: "chat",
          templateId: selectedTemplateId,
          name: selectedTemplateId, // Add name for DO instance routing
        }),
      })
        .then(
          (response) =>
            response.json() as Promise<{ success: boolean; message?: string }>
        )
        .then((result) => {
          if (result.success) {
            console.log(
              "✅ [ChatPanel] Chat context set successfully:",
              result.message
            );
          } else {
            console.error(
              "❌ [ChatPanel] Failed to set chat context:",
              result.message
            );
          }
        })
        .catch((error) => {
          console.error("❌ [ChatPanel] Error setting chat context:", error);
        });
    }
  }, [selectedTemplateId]);

  // Listen for workflow update notifications via WebSocket
  useEffect(() => {
    if (!selectedTemplateId || !onWorkflowUpdate) {
      return;
    }

    console.log(
      "🔌 [ChatPanel] Setting up WebSocket listener for workflow updates"
    );

    // Create WebSocket connection to listen for workflow updates
    const wsUrl = getWsUrl(`/agents/chat/${selectedTemplateId || "default"}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ [ChatPanel] WebSocket connected for workflow updates");
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "workflow_updated") {
          console.log(
            "📨 [ChatPanel] Received workflow_updated notification, reloading workflow"
          );

          // Reload the current workflow
          const { workflow: updatedWorkflow } =
            await loadWorkflowSafe(selectedTemplateId);

          // Update the main UI via callback
          onWorkflowUpdate(updatedWorkflow);

          console.log("✅ [ChatPanel] Workflow updated successfully", {
            workflowName: updatedWorkflow.name,
            goalsCount: updatedWorkflow.goals?.length || 0,
          });
        }
      } catch (error) {
        console.error(
          "❌ [ChatPanel] Error handling WebSocket message:",
          error
        );
      }
    };

    ws.onerror = (error) => {
      console.error("❌ [ChatPanel] WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("🔌 [ChatPanel] WebSocket connection closed");
    };

    // Cleanup function
    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
        console.log("🧹 [ChatPanel] WebSocket connection cleaned up");
      }
    };
  }, [selectedTemplateId, onWorkflowUpdate]);

  const agent = useAgent({
    agent: "chat",
    name: selectedTemplateId || "default", // Use workflow ID as agent name
    host: getApiHost(),
  });

  // Monitor workflow switches for debugging
  useEffect(() => {
    console.log("[ChatPanel] Workflow switched to:", selectedTemplateId);
    // The useAgent hook should handle WebSocket reconnection automatically
    // Messages will be loaded from the new DO instance
  }, [selectedTemplateId]);

  // Add getInitialMessages function to load persisted messages
  const getInitialMessages = useCallback(
    async (options: { agent: string; name: string; url: string }) => {
      const templateId = options.name;
      if (!templateId || templateId === "default") return [];

      try {
        console.log(
          `📥 [ChatPanel] Loading messages for template: ${templateId}`
        );
        const response = await fetch(
          `${getApiUrl(
            `/agents/chat/${templateId}/messages`
          )}?templateId=${templateId}`
        );
        const data = (await response.json()) as { messages: Message[] };

        if (data.messages && data.messages.length > 0) {
          console.log(
            `✅ [ChatPanel] Loaded ${data.messages.length} messages for ${templateId}`
          );
          setHasLoadedMessages(true);
          // Get last message timestamp
          const lastMsg = data.messages[data.messages.length - 1];
          setLastMessageDate(
            lastMsg.createdAt ? new Date(lastMsg.createdAt).toISOString() : null
          );
          return data.messages;
        }
        setHasLoadedMessages(false);
        setLastMessageDate(null);
        return [];
      } catch (error) {
        console.error(
          `❌ [ChatPanel] Failed to load messages for ${templateId}:`,
          error
        );
        setHasLoadedMessages(false);
        return [];
      }
    },
    []
  );

  const {
    messages: agentMessages,
    input: agentInput,
    handleInputChange: handleAgentInputChange,
    handleSubmit: handleAgentSubmit,
    addToolResult,
    clearHistory,
    isLoading,
    stop,
  } = useAgentChat({
    agent,
    maxSteps: 5,
    getInitialMessages, // Add this option
  });

  // Add clear functions
  const clearTemplateHistory = async () => {
    if (!selectedTemplateId) return;

    try {
      await fetch(getApiUrl(`/agents/chat/${selectedTemplateId}/clear`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });
      clearHistory(); // Clear frontend state
      setHasLoadedMessages(false);
      setLastMessageDate(null);
    } catch (error) {
      console.error("Failed to clear template history:", error);
    }
  };

  const clearAllHistory = async () => {
    try {
      await fetch(
        getApiUrl(`/agents/chat/${selectedTemplateId || "default"}/clear`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clearAll: true }),
        }
      );
      clearHistory(); // Clear frontend state
      setHasLoadedMessages(false);
      setLastMessageDate(null);
    } catch (error) {
      console.error("Failed to clear all history:", error);
    }
  };

  // Handle workflow editing submission
  const handleWorkflowEdit = async (userMessage: string) => {
    if (!workflow) {
      console.warn("No workflow available for editing");
      return;
    }

    try {
      setAgentStatus("thinking");

      const request: WorkflowEditRequest = {
        workflowId: workflow.id,
        currentWorkflow: workflow,
        userMessage,
        userId: "user", // In a real app, this would come from authentication
        sessionId: crypto.randomUUID(),
      };

      setAgentStatus("executing");

      const response = await fetch("/api/workflow/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      setAgentStatus("validating");

      const result: WorkflowEditResponse = await response.json();

      // Add to edit history
      const editRecord = {
        id: crypto.randomUUID(),
        request: userMessage,
        response: result,
        timestamp: new Date(),
      };
      setEditHistory((prev: typeof editHistory) => [...prev, editRecord]);

      if (result.success && result.updatedWorkflow) {
        setAgentStatus("success");
        onWorkflowUpdate?.(result.updatedWorkflow);

        // Clear success status after 2 seconds
        setTimeout(() => setAgentStatus("idle"), 2000);
      } else {
        setAgentStatus("error");
        // Clear error status after 3 seconds
        setTimeout(() => setAgentStatus("idle"), 3000);
      }
    } catch (error) {
      console.error("Workflow edit error:", error);
      setAgentStatus("error");
      setTimeout(() => setAgentStatus("idle"), 3000);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    agentMessages.length > 0 && scrollToBottom();
  }, [agentMessages, scrollToBottom]);

  const pendingToolCallConfirmation = agentMessages.some((m: Message) =>
    m.parts?.some(
      (part) =>
        part.type === "tool-invocation" &&
        part.toolInvocation.state === "call" &&
        toolsRequiringConfirmation.includes(
          part.toolInvocation.toolName as keyof typeof tools
        )
    )
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-full flex flex-col" data-testid="chat-panel">
      {/* Show disabled state in instance mode */}
      {viewMode === "instance" ? (
        <div className="h-full flex items-center justify-center">
          <Card className="p-6 max-w-md mx-auto bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
            <div className="text-center space-y-4">
              <div className="bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-full p-3 inline-flex">
                <Robot size={24} />
              </div>
              <h3 className="font-semibold text-lg text-neutral-700 dark:text-neutral-300">
                Chat Disabled in Preview Mode
              </h3>
              <p className="text-muted-foreground text-sm">
                Chat functionality is disabled while previewing workflow
                instances. Switch back to edit mode to use the AI assistant.
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center justify-center h-8 w-8">
              <svg
                width="28px"
                height="28px"
                className="text-[#F48120]"
                data-icon="agents"
              >
                <title>Cloudflare Agents</title>
                <symbol id="ai:local:agents" viewBox="0 0 80 79">
                  <path
                    fill="currentColor"
                    d="M69.3 39.7c-3.1 0-5.8 2.1-6.7 5H48.3V34h4.6l4.5-2.5c1.1.8 2.5 1.2 3.9 1.2 3.8 0 7-3.1 7-7s-3.1-7-7-7-7 3.1-7 7c0 .9.2 1.8.5 2.6L51.9 30h-3.5V18.8h-.1c-1.3-1-2.9-1.6-4.5-1.9h-.2c-1.9-.3-3.9-.1-5.8.6-.4.1-.8.3-1.2.5h-.1c-.1.1-.2.1-.3.2-1.7 1-3 2.4-4 4 0 .1-.1.2-.1.2l-.3.6c0 .1-.1.1-.1.2v.1h-.6c-2.9 0-5.7 1.2-7.7 3.2-2.1 2-3.2 4.8-3.2 7.7 0 .7.1 1.4.2 2.1-1.3.9-2.4 2.1-3.2 3.5s-1.2 2.9-1.4 4.5c-.1 1.6.1 3.2.7 4.7s1.5 2.9 2.6 4c-.8 1.8-1.2 3.7-1.1 5.6 0 1.9.5 3.8 1.4 5.6s2.1 3.2 3.6 4.4c1.3 1 2.7 1.7 4.3 2.2v-.1q2.25.75 4.8.6h.1c0 .1.1.1.1.1.9 1.7 2.3 3 4 4 .1.1.2.1.3.2h.1c.4.2.8.4 1.2.5 1.4.6 3 .8 4.5.7.4 0 .8-.1 1.3-.1h.1c1.6-.3 3.1-.9 4.5-1.9V62.9h3.5l3.1 1.7c-.3.8-.5 1.7-.5 2.6 0 3.8 3.1 7 7 7s7-3.1 7-7-3.1-7-7-7c-1.5 0-2.8.5-3.9 1.2l-4.6-2.5h-4.6V48.7h14.3c.9 2.9 3.5 5 6.7 5 3.8 0 7-3.1 7-7s-3.1-7-7-7m-7.9-16.9c1.6 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.4-3 3-3m0 41.4c1.6 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.4-3 3-3M44.3 72c-.4.2-.7.3-1.1.3-.2 0-.4.1-.5.1h-.2c-.9.1-1.7 0-2.6-.3-1-.3-1.9-.9-2.7-1.7-.7-.8-1.3-1.7-1.6-2.7l-.3-1.5v-.7q0-.75.3-1.5c.1-.2.1-.4.2-.7s.3-.6.5-.9c0-.1.1-.1.1-.2.1-.1.1-.2.2-.3s.1-.2.2-.3c0 0 0-.1.1-.1l.6-.6-2.7-3.5c-1.3 1.1-2.3 2.4-2.9 3.9-.2.4-.4.9-.5 1.3v.1c-.1.2-.1.4-.1.6-.3 1.1-.4 2.3-.3 3.4-.3 0-.7 0-1-.1-2.2-.4-4.2-1.5-5.5-3.2-1.4-1.7-2-3.9-1.8-6.1q.15-1.2.6-2.4l.3-.6c.1-.2.2-.4.3-.5 0 0 0-.1.1-.1.4-.7.9-1.3 1.5-1.9 1.6-1.5 3.8-2.3 6-2.3q1.05 0 2.1.3v-4.5c-.7-.1-1.4-.2-2.1-.2-1.8 0-3.5.4-5.2 1.1-.7.3-1.3.6-1.9 1s-1.1.8-1.7 1.3c-.3.2-.5.5-.8.8-.6-.8-1-1.6-1.3-2.6-.2-1-.2-2 0-2.9.2-1 .6-1.9 1.3-2.6.6-.8 1.4-1.4 2.3-1.8l1.8-.9-.7-1.9c-.4-1-.5-2.1-.4-3.1s.5-2.1 1.1-2.9q.9-1.35 2.4-2.1c.9-.5 2-.8 3-.7.5 0 1 .1 1.5.2 1 .2 1.8.7 2.6 1.3s1.4 1.4 1.8 2.3l4.1-1.5c-.9-2-2.3-3.7-4.2-4.9q-.6-.3-.9-.6c.4-.7 1-1.4 1.6-1.9.8-.7 1.8-1.1 2.9-1.3.9-.2 1.7-.1 2.6 0 .4.1.7.2 1.1.3V72zm25-22.3c-1.6 0-3-1.3-3-3 0-1.6 1.3-3 3-3s3 1.3 3 3c0 1.6-1.3 3-3 3"
                  />
                </symbol>
                <use href="#ai:local:agents" />
              </svg>
            </div>

            <div className="flex-1">
              <h2 className="font-semibold text-base">AI Assistant</h2>
            </div>

            <div className="flex items-center gap-3 mr-2">
              <div className="flex items-center gap-2">
                <Bug size={16} />
                <Toggle
                  toggled={showDebug}
                  aria-label="Toggle debug mode"
                  onClick={() => setShowDebug((prev) => !prev)}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="md"
              shape="square"
              className="rounded-full h-9 w-9"
              onClick={onThemeToggle}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            <DropdownMenu
              align="end"
              side="bottom"
              MenuItems={[
                {
                  type: "button",
                  label: `Clear ${
                    selectedTemplateId ? "Current Template" : "Template"
                  } History`,
                  onClick: clearTemplateHistory,
                },
                {
                  type: "button",
                  label: "Clear All History",
                  onClick: clearAllHistory,
                },
              ]}
            >
              <Button
                variant="ghost"
                size="md"
                shape="square"
                className="rounded-full h-9 w-9"
              >
                <Trash size={20} />
              </Button>
            </DropdownMenu>
          </div>

          {/* Agent Status */}
          {agentStatus !== "idle" && (
            <div className="px-4 pt-3">
              <AgentStatusDisplay status={agentStatus} />
            </div>
          )}

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            data-testid="chat-messages"
          >
            {/* Conversation continuation banner */}
            {hasLoadedMessages && lastMessageDate && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>
                    Continuing previous conversation from{" "}
                    {new Date(lastMessageDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
            {agentMessages.length === 0 && editHistory.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <Card className="p-6 max-w-md mx-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <div className="text-center space-y-4">
                    <div className="bg-[#F48120]/10 text-[#F48120] rounded-full p-3 inline-flex">
                      <Robot size={24} />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {editMode ? "Workflow Editor" : "Welcome to AI Chat"}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {editMode
                        ? "Edit your workflow template through natural language. Try commands like:"
                        : "Start a conversation with your AI assistant. Try asking about:"}
                    </p>
                    <ul className="text-sm text-left space-y-2">
                      {editMode ? (
                        <>
                          <li className="flex items-center gap-2">
                            <span className="text-[#F48120]">•</span>
                            <span>
                              "Add a background check task to employee
                              onboarding"
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-[#F48120]">•</span>
                            <span>
                              "Update the time limit for shift categorization to
                              30 minutes"
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-[#F48120]">•</span>
                            <span>
                              "Add a customer satisfaction survey form"
                            </span>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-2">
                            <span className="text-[#F48120]">•</span>
                            <span>Weather information for any city</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-[#F48120]">•</span>
                            <span>Local time in different locations</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </Card>
              </div>
            )}

            {/* Render edit history when in edit mode */}
            {editMode &&
              editHistory.map((edit: (typeof editHistory)[0]) => (
                <div key={edit.id} className="space-y-3">
                  {/* User request */}
                  <div className="flex justify-end">
                    <div className="flex gap-2 max-w-[85%] flex-row-reverse">
                      <div>
                        <Card className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-br-none">
                          <MemoizedMarkdown
                            id={`edit-request-${edit.id}`}
                            content={edit.request}
                          />
                        </Card>
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {formatTime(edit.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Agent response */}
                  <div className="flex justify-start">
                    <div className="flex gap-2 max-w-[85%] flex-row">
                      <Avatar username={"AI"} />
                      <div>
                        <Card
                          className={`p-3 rounded-md ${
                            edit.response.success
                              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                          } rounded-bl-none`}
                        >
                          <MemoizedMarkdown
                            id={`edit-response-${edit.id}`}
                            content={edit.response.message}
                          />

                          {/* Show tool calls if available */}
                          {edit.response.toolCalls &&
                            edit.response.toolCalls.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs text-muted-foreground mb-2">
                                  Tool calls:
                                </p>
                                <div className="space-y-1">
                                  {edit.response.toolCalls.map(
                                    (call: ToolCall, idx: number) => (
                                      <div
                                        key={`${call.tool}-${idx}`}
                                        className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 p-2 rounded"
                                      >
                                        <span
                                          className={
                                            call.result === "success"
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }
                                        >
                                          {call.result === "success"
                                            ? "✓"
                                            : "✗"}
                                        </span>{" "}
                                        {call.tool}(
                                        {Object.keys(call.params).join(", ")})
                                        {call.errorMessage && (
                                          <div className="text-red-600 mt-1">
                                            {call.errorMessage}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </Card>
                        <p className="text-xs text-muted-foreground mt-1 text-left">
                          {formatTime(edit.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Render regular chat messages when not in edit mode */}
            {!editMode &&
              agentMessages.map((m: Message, index) => {
                const isUser = m.role === "user";
                const showAvatar =
                  index === 0 || agentMessages[index - 1]?.role !== m.role;

                return (
                  <div key={m.id}>
                    {showDebug && (
                      <pre className="text-xs text-muted-foreground overflow-scroll">
                        {JSON.stringify(m, null, 2)}
                      </pre>
                    )}
                    <div
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-2 max-w-[85%] ${
                          isUser ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {showAvatar && !isUser ? (
                          <Avatar username={"AI"} />
                        ) : (
                          !isUser && <div className="w-8" />
                        )}

                        <div>
                          <div>
                            {m.parts?.map((part, i) => {
                              if (part.type === "text") {
                                return (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: immutable index
                                  <div key={i}>
                                    <Card
                                      className={`p-3 rounded-md ${
                                        isUser
                                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-br-none"
                                          : "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-bl-none"
                                      } ${
                                        part.text.startsWith(
                                          "scheduled message"
                                        )
                                          ? "border-accent/50"
                                          : ""
                                      } relative`}
                                    >
                                      {part.text.startsWith(
                                        "scheduled message"
                                      ) && (
                                        <span className="absolute -top-3 -left-2 text-base">
                                          🕒
                                        </span>
                                      )}
                                      <MemoizedMarkdown
                                        id={`${m.id}-${i}`}
                                        content={part.text.replace(
                                          /^scheduled message: /,
                                          ""
                                        )}
                                      />
                                    </Card>
                                    <p
                                      className={`text-xs text-muted-foreground mt-1 ${
                                        isUser ? "text-right" : "text-left"
                                      }`}
                                    >
                                      {formatTime(
                                        new Date(
                                          m.createdAt as unknown as string
                                        )
                                      )}
                                    </p>
                                  </div>
                                );
                              }

                              if (part.type === "tool-invocation") {
                                const toolInvocation = part.toolInvocation;
                                const toolCallId = toolInvocation.toolCallId;
                                const needsConfirmation =
                                  toolsRequiringConfirmation.includes(
                                    toolInvocation.toolName as keyof typeof tools
                                  );

                                // Skip rendering the card in debug mode
                                if (showDebug) return null;

                                return (
                                  <ToolInvocationCard
                                    // biome-ignore lint/suspicious/noArrayIndexKey: using index is safe here as the array is static
                                    key={`${toolCallId}-${i}`}
                                    toolInvocation={toolInvocation}
                                    toolCallId={toolCallId}
                                    needsConfirmation={needsConfirmation}
                                    addToolResult={addToolResult}
                                  />
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              console.log("🚀 [ChatPanel] Form submitted", {
                editMode,
                agentInput:
                  agentInput.substring(0, 50) +
                  (agentInput.length > 50 ? "..." : ""),
                selectedTemplateId,
                hasTemplateId: !!selectedTemplateId,
                isLoading,
                agentStatus,
                timestamp: new Date().toISOString(),
              });

              if (editMode) {
                console.log(
                  "📝 [ChatPanel] Edit mode - handling workflow edit"
                );
                // Handle workflow editing
                if (agentInput.trim()) {
                  handleWorkflowEdit(agentInput.trim());
                  handleAgentInputChange({
                    target: { value: "" },
                  } as React.ChangeEvent<HTMLInputElement>);
                }
              } else {
                console.log(
                  "💬 [ChatPanel] Chat mode - calling handleAgentSubmit",
                  {
                    messageLength: agentInput.length,
                    hasHandleAgentSubmit:
                      typeof handleAgentSubmit === "function",
                    contextAlreadySet: !!selectedTemplateId,
                  }
                );

                // Assert critical conditions
                console.assert(
                  typeof handleAgentSubmit === "function",
                  "❌ handleAgentSubmit should be a function"
                );

                // Handle regular chat - no need to pass templateId as it's already set via initialization endpoint
                handleAgentSubmit(e);

                console.log(
                  "✅ [ChatPanel] handleAgentSubmit called successfully"
                );
              }
              setTextareaHeight("auto");
            }}
            className="p-3 bg-white border-t border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Textarea
                  data-testid="chat-input"
                  disabled={
                    pendingToolCallConfirmation ||
                    (editMode && !workflow) ||
                    agentStatus !== "idle"
                  }
                  placeholder={
                    pendingToolCallConfirmation
                      ? "Please respond to the tool confirmation above..."
                      : editMode
                        ? workflow
                          ? "Describe how you want to edit the workflow..."
                          : "No workflow loaded for editing"
                        : "Send a message..."
                  }
                  className="flex w-full border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-base ring-offset-background placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-neutral-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base pb-10 bg-neutral-50 dark:bg-neutral-800"
                  value={agentInput}
                  onChange={(e) => {
                    handleAgentInputChange(e);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                    setTextareaHeight(`${e.target.scrollHeight}px`);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      console.log(
                        "⌨️ [ChatPanel] Enter key pressed - submitting form"
                      );
                      e.preventDefault();
                      // Trigger the form's onSubmit handler to ensure consistent behavior
                      e.currentTarget.form?.requestSubmit();
                      setTextareaHeight("auto");
                    }
                  }}
                  rows={2}
                  style={{ height: textareaHeight }}
                />
                <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
                  {isLoading ? (
                    <button
                      type="button"
                      onClick={stop}
                      className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full p-1.5 h-fit border border-neutral-200 dark:border-neutral-800"
                      aria-label="Stop generation"
                    >
                      <Stop size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      data-testid="send-button"
                      className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full p-1.5 h-fit border border-neutral-200 dark:border-neutral-800"
                      disabled={
                        pendingToolCallConfirmation ||
                        !agentInput.trim() ||
                        (editMode && !workflow) ||
                        agentStatus !== "idle"
                      }
                      aria-label="Send message"
                    >
                      <PaperPlaneTilt size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
