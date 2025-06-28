import { useEffect, useState, useRef, useCallback } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "agents/ai-react";
import type { Message } from "@ai-sdk/react";
import type { tools } from "../../tools";

// Workflow editing imports
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import type {
  WorkflowEditRequest,
  WorkflowEditResponse,
} from "@/agents/workflowEditingAgent";

// Component imports
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { Avatar } from "@/components/avatar/Avatar";
import { Toggle } from "@/components/toggle/Toggle";
import { Textarea } from "@/components/textarea/Textarea";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { ToolInvocationCard } from "@/components/tool-invocation-card/ToolInvocationCard";
import { EditModeToggle } from "./EditModeToggle";
import { AgentStatusDisplay, type AgentStatus } from "./AgentStatusDisplay";

// Icon imports
import {
  Bug,
  Moon,
  Robot,
  Sun,
  Trash,
  PaperPlaneTilt,
  Stop,
} from "@phosphor-icons/react";

// List of tools that require human confirmation
const toolsRequiringConfirmation: (keyof typeof tools)[] = [
  "getWeatherInformation",
];

export interface ChatPanelProps {
  theme: "dark" | "light";
  onThemeToggle: () => void;
  workflow?: WorkflowTemplateV2 | null;
  onWorkflowUpdate?: (workflow: WorkflowTemplateV2) => void;
}

export function ChatPanel({
  theme,
  onThemeToggle,
  workflow,
  onWorkflowUpdate,
}: ChatPanelProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [editMode, setEditMode] = useState(false);
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const agent = useAgent({
    agent: "chat",
  });

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
  });

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
    <div className="h-full flex flex-col">
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
          <EditModeToggle
            editMode={editMode}
            onToggle={setEditMode}
            disabled={!workflow}
          />

          <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600" />

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

        <Button
          variant="ghost"
          size="md"
          shape="square"
          className="rounded-full h-9 w-9"
          onClick={clearHistory}
        >
          <Trash size={20} />
        </Button>
      </div>

      {/* Agent Status */}
      {agentStatus !== "idle" && (
        <div className="px-4 pt-3">
          <AgentStatusDisplay status={agentStatus} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                          "Add a background check task to employee onboarding"
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[#F48120]">•</span>
                        <span>
                          "Update the time limit for shift categorization to 30
                          minutes"
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[#F48120]">•</span>
                        <span>"Add a customer satisfaction survey form"</span>
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
                                (call: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 p-2 rounded"
                                  >
                                    <span
                                      className={
                                        call.result === "success"
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }
                                    >
                                      {call.result === "success" ? "✓" : "✗"}
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
                                    part.text.startsWith("scheduled message")
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
                                    new Date(m.createdAt as unknown as string)
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
          if (editMode) {
            // Handle workflow editing
            if (agentInput.trim()) {
              handleWorkflowEdit(agentInput.trim());
              handleAgentInputChange({ target: { value: "" } } as any);
            }
          } else {
            // Handle regular chat
            handleAgentSubmit(e, {
              data: {
                annotations: {
                  hello: "world",
                },
              },
            });
          }
          setTextareaHeight("auto");
        }}
        className="p-3 bg-white border-t border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Textarea
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
                  e.preventDefault();
                  handleAgentSubmit(e as unknown as React.FormEvent);
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
    </div>
  );
}
