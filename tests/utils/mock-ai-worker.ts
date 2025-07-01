/**
 * Mock AI Worker for Testing - Official Cloudflare Pattern
 *
 * This mock provides deterministic AI responses for testing workflow tools
 * without requiring actual OpenAI API calls. It follows the official
 * Cloudflare testing patterns for service binding mocks.
 */

export default {
  async fetch(request: Request): Promise<Response> {
    interface Message {
      role: string;
      content: string;
    }

    const body = (await request.json()) as { messages?: Message[] };
    const { messages = [] } = body;
    const userMessages = messages.filter((m: Message) => m.role === "user");
    const lastUserMessage =
      userMessages[userMessages.length - 1]?.content || "";

    console.log(`Mock AI received: "${lastUserMessage.slice(0, 100)}..."`);

    // Workflow creation patterns
    if (
      lastUserMessage.toLowerCase().includes("create") &&
      lastUserMessage.toLowerCase().includes("workflow")
    ) {
      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "createWorkflow",
              arguments: JSON.stringify({
                name:
                  this.extractWorkflowName(lastUserMessage) || "New Workflow",
                description:
                  this.extractWorkflowDescription(lastUserMessage) ||
                  "Workflow created via AI assistant",
              }),
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // View workflow patterns
    if (
      lastUserMessage.toLowerCase().includes("show") ||
      lastUserMessage.toLowerCase().includes("view") ||
      lastUserMessage.toLowerCase().includes("current workflow")
    ) {
      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_2",
            type: "function",
            function: {
              name: "viewCurrentWorkflow",
              arguments: "{}",
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // Add goal patterns
    if (
      lastUserMessage.toLowerCase().includes("add") &&
      lastUserMessage.toLowerCase().includes("goal")
    ) {
      const goalName = this.extractGoalName(lastUserMessage) || "New Goal";
      const goalDescription =
        this.extractGoalDescription(lastUserMessage) ||
        "Goal added via AI assistant";

      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_3",
            type: "function",
            function: {
              name: "addGoal",
              arguments: JSON.stringify({
                name: goalName,
                description: goalDescription,
              }),
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // Add task patterns
    if (
      lastUserMessage.toLowerCase().includes("add") &&
      lastUserMessage.toLowerCase().includes("task")
    ) {
      const taskDescription =
        this.extractTaskDescription(lastUserMessage) ||
        "Task added via AI assistant";
      const assigneeType = lastUserMessage.toLowerCase().includes("human")
        ? "human"
        : "ai_agent";

      // Mock goal ID - in real tests this would be extracted from workflow state
      const goalId = "goal-1";

      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_4",
            type: "function",
            function: {
              name: "addTask",
              arguments: JSON.stringify({
                goalId,
                description: taskDescription,
                assigneeType,
              }),
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // Add constraint patterns
    if (
      lastUserMessage.toLowerCase().includes("add") &&
      lastUserMessage.toLowerCase().includes("constraint")
    ) {
      const constraintDescription =
        this.extractConstraintDescription(lastUserMessage) ||
        "Constraint added via AI assistant";
      const constraintType =
        this.extractConstraintType(lastUserMessage) || "business_rule";
      const enforcement = this.extractEnforcement(lastUserMessage) || "warn";

      // Mock goal ID - in real tests this would be extracted from workflow state
      const goalId = "goal-1";

      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_5",
            type: "function",
            function: {
              name: "addConstraint",
              arguments: JSON.stringify({
                goalId,
                description: constraintDescription,
                type: constraintType,
                enforcement,
              }),
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // Delete goal patterns (human-in-the-loop)
    if (
      lastUserMessage.toLowerCase().includes("delete") &&
      lastUserMessage.toLowerCase().includes("goal")
    ) {
      const goalId = this.extractGoalId(lastUserMessage) || "goal-1";

      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_6",
            type: "function",
            function: {
              name: "deleteGoal",
              arguments: JSON.stringify({
                goalId,
                confirmationPhrase: "DELETE GOAL",
              }),
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // Delete task patterns (human-in-the-loop)
    if (
      lastUserMessage.toLowerCase().includes("delete") &&
      lastUserMessage.toLowerCase().includes("task")
    ) {
      const taskId = this.extractTaskId(lastUserMessage) || "task-1";

      const toolCallResponse = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_7",
            type: "function",
            function: {
              name: "deleteTask",
              arguments: JSON.stringify({
                taskId,
                confirmationPhrase: "DELETE TASK",
              }),
            },
          },
        ],
      };
      return new Response(JSON.stringify({ response: toolCallResponse }));
    }

    // Default conversational response
    const defaultResponse = {
      role: "assistant",
      content:
        "I can help you create and modify workflows. Try asking me to 'create a new workflow' or 'add a goal' to get started.",
    };
    return new Response(JSON.stringify({ response: defaultResponse }));
  },

  // Helper methods for extracting information from user messages
  extractWorkflowName(message: string): string | null {
    // Simple pattern matching - in production this would be more sophisticated
    const match =
      message.match(/create.*workflow.*["']([^"']+)["']/i) ||
      message.match(/workflow.*called.*["']([^"']+)["']/i) ||
      message.match(/["']([^"']+)["'].*workflow/i);
    return match ? match[1] : null;
  },

  extractWorkflowDescription(message: string): string | null {
    const match = message.match(/for (.+?)(?:\.|$)/i);
    return match ? match[1] : null;
  },

  extractGoalName(message: string): string | null {
    const match =
      message.match(/goal.*["']([^"']+)["']/i) ||
      message.match(/add.*["']([^"']+)["'].*goal/i);
    return match ? match[1] : null;
  },

  extractGoalDescription(message: string): string | null {
    const match = message.match(/goal.*for (.+?)(?:\.|$)/i);
    return match ? match[1] : null;
  },

  extractTaskDescription(message: string): string | null {
    const match =
      message.match(/task.*["']([^"']+)["']/i) ||
      message.match(/add.*["']([^"']+)["'].*task/i);
    return match ? match[1] : null;
  },

  extractConstraintDescription(message: string): string | null {
    const match =
      message.match(/constraint.*["']([^"']+)["']/i) ||
      message.match(/add.*["']([^"']+)["'].*constraint/i);
    return match ? match[1] : null;
  },

  extractConstraintType(message: string): string | null {
    const types = [
      "time_limit",
      "data_validation",
      "business_rule",
      "rate_limit",
      "access_control",
    ];
    for (const type of types) {
      if (message.toLowerCase().includes(type.replace("_", " "))) {
        return type;
      }
    }
    return null;
  },

  extractEnforcement(message: string): string | null {
    const enforcements = [
      "hard_stop",
      "block_progression",
      "require_approval",
      "warn",
    ];
    for (const enforcement of enforcements) {
      if (message.toLowerCase().includes(enforcement.replace("_", " "))) {
        return enforcement;
      }
    }
    return null;
  },

  extractGoalId(message: string): string | null {
    const match = message.match(/goal[- ]?(?:id[- ]?)?([a-zA-Z0-9-]+)/i);
    return match ? match[1] : null;
  },

  extractTaskId(message: string): string | null {
    const match = message.match(/task[- ]?(?:id[- ]?)?([a-zA-Z0-9-]+)/i);
    return match ? match[1] : null;
  },
};
