# Tool Call Build Guide for AI Agent

This guide documents the complete process for building, testing, and debugging tools for the AI agent in the Genesis-A project. It includes all learnings from real-world tool development, particularly from fixing the deleteTask functionality.

## Prerequisites

Before building tools, ensure you understand:

- Basic TypeScript and async/await
- Zod schema validation
- Cloudflare Workers architecture
- How the AI SDK works with tool definitions
- The project's file structure (especially `src/tools.ts`, `src/server.ts`)

## Key Principle: Data Visibility

**The #1 cause of tool failures: The AI can't see the data it needs.**

Always verify the AI has access to:

- IDs (not just counts or summaries)
- Descriptions (for matching user intent)
- Current state (through tools like `viewCurrentWorkflow`)

## Quick Start Example

```typescript
// 1. Define tool in src/tools.ts
const greetUser = tool({
  description: "Greet a user by name",
  parameters: z.object({
    name: z.string().describe("User's name"),
  }),
  execute: async ({ name }) => {
    return `Hello, ${name}!`;
  },
});

// 2. Export it
export const tools = {
  // ... existing tools
  greetUser,
};

// 3. Test it
// User: "Greet me as Sam"
// AI: "I'll greet you as Sam" [calls greetUser with name="Sam"]
// Result: "Hello, Sam!"
```

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Key Principle: Data Visibility](#key-principle-data-visibility)
3. [Understanding Tool Architecture](#understanding-tool-architecture)
4. [Types of Tools](#types-of-tools)
5. [Building Tools Step-by-Step](#building-tools-step-by-step)
6. [Testing Tools](#testing-tools)
7. [Common Issues and Solutions](#common-issues-and-solutions)
8. [Best Practices](#best-practices)
9. [Critical: System Prompt and Tool Coordination](#critical-system-prompt-and-tool-coordination)
10. [Real Example: deleteTask Fix](#real-example-deletetask-fix)
11. [Tool Naming Conventions](#tool-naming-conventions)
12. [Troubleshooting Flowchart](#troubleshooting-flowchart)
13. [How the AI Chooses Tools](#how-the-ai-chooses-tools)
14. [Performance Considerations](#performance-considerations)
15. [Security Notes](#security-notes)
16. [Version Control Best Practices](#version-control-best-practices)
17. [Advanced Debugging Techniques](#advanced-debugging-techniques)
18. [Tool Development Checklist](#tool-development-checklist)
19. [Summary](#summary)

## Understanding Tool Architecture

### Core Components

1. **Tool Definition** (`src/tools.ts`)

   - Tool object with description and parameters
   - Optional execute function
   - Zod schema for parameter validation

2. **Executions Object** (`src/tools.ts`)

   - Contains actual implementation for confirmation-required tools
   - Maps tool names to their execution logic

3. **Frontend Integration** (`src/components/chat/ChatPanel.tsx`)

   - `toolsRequiringConfirmation` array
   - UI components for approve/reject buttons

4. **System Prompt** (`src/server.ts`)

   - Instructions for AI on how to use tools
   - Critical for correct tool usage

5. **Tool Processing** (`src/utils.ts`)
   - `processToolCalls` function handles execution

## Types of Tools

### 1. Immediate Execution Tools

Tools that execute without user confirmation.

```typescript
const getLocalTime = tool({
  description: "get the local time for a specified location",
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    console.log(`Getting local time for ${location}`);
    return "10am";
  },
});
```

**When to use:**

- Low-risk operations
- Read-only operations
- No side effects

### 2. Confirmation-Required Tools

Tools that require user approval before execution.

```typescript
const deleteTask = tool({
  description:
    "Remove a specific task from the workflow. This action requires your approval.",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to delete"),
  }),
  // NO execute function - handled by executions object
});
```

**When to use:**

- Destructive operations
- Operations with side effects
- High-impact changes

## Building Tools Step-by-Step

### Step 1: Define the Tool

1. Add tool definition in `src/tools.ts`:

```typescript
const myNewTool = tool({
  description: "Clear, action-oriented description for the AI",
  parameters: z.object({
    param1: z.string().describe("What this parameter does"),
    param2: z.number().optional().describe("Optional parameter"),
  }),
  // Include execute ONLY for immediate execution
});
```

### Step 2: Implement Tool Logic

For confirmation-required tools, add to executions object:

```typescript
export const executions = {
  // ... existing executions
  myNewTool: async ({
    param1,
    param2,
  }: {
    param1: string;
    param2?: number;
  }) => {
    const { agent } = getCurrentAgent<Chat>();

    // Tool implementation
    // Access current workflow: agent!.getCurrentWorkflow()
    // Save changes: agent!.saveCurrentWorkflow(updatedWorkflow)

    return `Success message describing what happened`;
  },
};
```

### Step 3: Export the Tool

Add to the tools export:

```typescript
export const tools = {
  // ... existing tools
  myNewTool,
};
```

### Step 4: Configure Frontend (if confirmation required)

Add tool name to `toolsRequiringConfirmation` in `ChatPanel.tsx`:

```typescript
const toolsRequiringConfirmation: (keyof typeof tools)[] = [
  "getWeatherInformation",
  "deleteGoal",
  "deleteTask",
  "myNewTool", // Add here
];
```

### Step 5: Update System Prompt

Add clear instructions in `generateSystemPrompt()` in `src/server.ts`:

```typescript
MyNewTool Usage:
When a user asks to [action]:
1. First [preparation step if needed]
2. Call the myNewTool with these parameters:
   - param1: [how to determine this]
   - param2: [when to include this]
3. The system will show approval buttons
4. After approval, confirm the action completed
```

### Step 6: Ensure AI Has Required Data

**CRITICAL**: The AI can only use data it can access!

Example: For deleteTask, the AI needed actual task IDs, so we updated viewCurrentWorkflow:

```typescript
// BAD: AI can't see task IDs
`Tasks: ${g.tasks?.length || 0}` // GOOD: AI can see and use task IDs
`${g.tasks
  ?.map((task, i) => `${i + 1}. ${task.description} (ID: ${task.id})`)
  .join("\n")}`;
```

## Testing Tools

### 1. Unit Testing the Tool Logic

Test the execution function directly:

```typescript
// For immediate execution tools
const result = await myNewTool.execute({ param1: "test" });

// For confirmation tools
const result = await executions.myNewTool({ param1: "test" });
```

### 2. Integration Testing with PM2

```bash
# Start the backend
pm2 start backend

# Monitor logs in real-time
pm2 logs backend

# Check specific error logs
pm2 logs backend --nostream --lines 50
```

### 3. End-to-End Testing with Playwright

```typescript
// Navigate to app
await playwright_navigate({ url: "http://localhost:5175" });

// Test tool invocation
await playwright_fill({
  selector: "textarea",
  value: "Use myNewTool with param1='test'",
});
await playwright_press_key({ key: "Enter" });

// Wait and screenshot
await sleep(3);
await playwright_screenshot({ name: "tool_test" });

// For confirmation tools, approve
await playwright_click({ selector: "[data-testid='confirm-button']" });
```

### 4. Verification Checklist

- [ ] Tool appears in AI response
- [ ] Correct parameters shown in tool invocation
- [ ] Confirmation dialog appears (if applicable)
- [ ] Approve/Reject buttons work
- [ ] Success message after execution
- [ ] Data actually changed (check logs/state)
- [ ] No errors in pm2 logs

## Common Issues and Solutions

### Issue 1: AI Not Calling the Tool

**Symptoms:** AI explains what it would do instead of calling tool

**Solutions:**

1. Make system prompt more explicit
2. Add "IMMEDIATELY call the tool" instructions
3. Provide clear examples in prompt

### Issue 2: AI Using Wrong IDs/Parameters

**Symptoms:** Errors like "Task 'task-1' not found"

**Root Cause:** AI doesn't have access to real data

**Solution:** Update data-providing tools:

```typescript
// Ensure tools like viewCurrentWorkflow provide actual IDs
const summary = `
Goals:
${workflow.goals
  .map(
    (g) =>
      `${g.name} (ID: ${g.id})
   Tasks: ${g.tasks.map((t) => `- ${t.description} (ID: ${t.id})`).join("\n")}`
  )
  .join("\n")}`;
```

### Issue 3: Tool Not Requiring Confirmation When It Should

**Symptom:** Destructive action happens immediately

**Solution:**

1. Remove execute function from tool definition
2. Add to executions object
3. Add to toolsRequiringConfirmation array

### Issue 4: Execution Errors

**Debugging Steps:**

1. Check pm2 error logs for stack trace
2. Verify all required data exists
3. Check parameter types match schema
4. Ensure agent context is available

## Best Practices

### 1. Tool Descriptions

- Use action-oriented language
- Be specific about what the tool does
- Include "requires your approval" for confirmation tools

### 2. Parameter Schemas

- Use descriptive parameter names
- Add `.describe()` to all parameters
- Make optional parameters actually optional
- Use appropriate types (string, number, enum)

### 3. Error Handling

```typescript
try {
  const workflow = agent!.getCurrentWorkflow();
  if (!workflow) {
    throw new Error("No workflow loaded");
  }
  // ... tool logic
} catch (error) {
  console.error("Tool error:", error);
  return `Error: ${error.message}`;
}
```

### 4. Success Messages

- Be specific about what changed
- Include relevant IDs or names
- Confirm the action completed

### 5. System Prompt Instructions

- Number steps clearly
- Show example IDs/values
- Distinguish between correct and incorrect usage
- Use CRITICAL/IMPORTANT for key points

## Critical: System Prompt and Tool Coordination

The system prompt is the **most important** part of tool implementation. Without proper instructions, even perfectly coded tools will fail.

### System Prompt Must Include:

1. **When to use the tool**

   ```
   When user asks to delete a task (e.g., "remove task 3"):
   ```

2. **How to prepare data**

   ```
   1. First use viewCurrentWorkflow to see all tasks
   2. Identify the task by position or description
   3. Note the ACTUAL task ID (like "task_analyze_shift")
   ```

3. **Exact parameter mapping**

   ```
   4. Call deleteTask with:
      - taskId: the ACTUAL ID from the workflow
      NOT generic IDs like "task-1"
   ```

4. **What happens next**
   ```
   5. System shows approve/reject buttons
   6. After user clicks, confirm the result
   ```

### Common System Prompt Mistakes:

❌ **Too vague**: "Use deleteTask to remove tasks"

❌ **Missing data access**: Not telling AI to call viewCurrentWorkflow first

❌ **No examples**: Not showing correct vs incorrect IDs

❌ **No flow**: Not explaining the confirmation process

✅ **Good pattern**: Number steps, show examples, be explicit about data sources

## Real Example: deleteTask Fix

### The Problem

AI was using generic IDs like "task-1" instead of real IDs like "task_analyze_shift".

### Investigation Process

1. **Check logs**: Found "Task 'task-1' not found" errors
2. **Examine AI's data access**: Discovered viewCurrentWorkflow didn't show task IDs
3. **Test with Playwright**: Confirmed UI worked but wrong IDs used
4. **Fix data access**: Updated viewCurrentWorkflow to show real IDs
5. **Update system prompt**: Added explicit examples of correct vs incorrect IDs
6. **Verify fix**: Tested end-to-end with real task deletion

### Key Learnings

1. **AI needs data access**: Can't use IDs it can't see
2. **Explicit examples help**: Show correct vs incorrect usage
3. **Test the full flow**: From user input to actual data change
4. **Check logs thoroughly**: Don't grep, read full context

## Testing Workflow Summary

1. **Plan the tool**: Define purpose and parameters
2. **Implement tool**: Follow the step-by-step guide
3. **Write test scenarios**: Cover happy path and edge cases
4. **Test locally**: Use pm2 and check logs
5. **Test UI**: Use Playwright for end-to-end testing
6. **Debug issues**: Follow common issues guide
7. **Verify fix**: Test multiple times with variations

## Quick Reference

### File Locations

- Tool definitions: `src/tools.ts`
- System prompt: `src/server.ts` (generateSystemPrompt function)
- Frontend config: `src/components/chat/ChatPanel.tsx`
- Tool processing: `src/utils.ts`

### Debug Commands

```bash
# View logs
pm2 logs backend --nostream --lines 100

# Test in browser
# Navigate to http://localhost:5175

# Check if tool called
# Look for tool name in AI response UI

# Verify execution
# Check logs for success/error messages
```

### Common Patterns

```typescript
// Get agent context
const { agent } = getCurrentAgent<Chat>();

// Get current workflow
const workflow = agent!.getCurrentWorkflow();

// Save changes
await agent!.saveCurrentWorkflow(updatedWorkflow);

// Find items in workflow
const goal = workflow.goals.find((g) => g.id === goalId);
const task = goal.tasks?.find((t) => t.id === taskId);
```

## Tool Naming Conventions

### DO:

- Use camelCase: `deleteTask`, `viewCurrentWorkflow`
- Start with a verb: `add`, `delete`, `view`, `update`, `get`
- Be specific: `deleteTask` not `remove`
- Match the description: Tool name should align with its description

### DON'T:

- Use underscores: ~~`delete_task`~~
- Be vague: ~~`processItem`~~
- Use abbreviations: ~~`delTsk`~~

## Troubleshooting Flowchart

```
AI not using tool correctly?
│
├─> Is the tool being called at all?
│   ├─> NO: Check system prompt instructions
│   └─> YES: Continue
│
├─> Are the parameters correct?
│   ├─> NO: Check if AI has access to required data
│   │        (e.g., viewCurrentWorkflow shows IDs?)
│   └─> YES: Continue
│
├─> Is confirmation dialog showing (if needed)?
│   ├─> NO: Check toolsRequiringConfirmation array
│   └─> YES: Continue
│
├─> Does execution work?
│   ├─> NO: Check pm2 logs for errors
│   └─> YES: Success!
```

## How the AI Chooses Tools

The AI selects tools based on:

1. **User Intent**: Parsed from natural language
2. **Tool Descriptions**: Must be clear and action-oriented
3. **System Prompt**: Provides explicit mappings
4. **Available Data**: Can only use tools with accessible parameters

Example system prompt pattern:

```
When user says "remove task 3" → use deleteTask
When user says "show me the workflow" → use viewCurrentWorkflow
When user says "add a new goal" → use addGoal
```

## Performance Considerations

1. **Tool Execution Time**: Add timeout handling for long operations
2. **Data Size**: Large workflows may need pagination
3. **Error Recovery**: Implement retry logic for transient failures
4. **Logging**: Use console.log sparingly in production

## Security Notes

While the CLAUDE.md specifies not to focus on security, these are critical for tools:

1. **Never expose sensitive data** in tool responses
2. **Validate all inputs** with Zod schemas
3. **Use confirmation for destructive operations**
4. **Log tool usage** for audit trails
5. **Sanitize error messages** shown to users

## Version Control Best Practices

When modifying tools:

1. **Test in isolation first**: Create test file if needed
2. **Keep backward compatibility**: Don't break existing workflows
3. **Document changes**: Update this guide
4. **Update system prompt**: If tool behavior changes
5. **Test all related tools**: Changes may have side effects

## Advanced Debugging Techniques

### Reading PM2 Logs Effectively

```bash
# Don't grep - read full context!
pm2 logs backend --nostream --lines 100

# Look for patterns:
# 1. "Task 'task-1' not found" → AI using wrong IDs
# 2. "Cannot read property" → Missing data
# 3. "Tool error:" → Execution failure
```

### Using Console Logs Strategically

```typescript
// In tool execution
console.log("🔧 [ToolName] Starting with params:", params);
console.log("✅ [ToolName] Success:", result);
console.error("❌ [ToolName] Error:", error);

// In system prompt generation
console.log("📋 System prompt length:", prompt.length);
```

### Testing Data Visibility

Create a temporary debug tool:

```typescript
const debugWorkflow = tool({
  description: "Debug: Show raw workflow data",
  parameters: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();
    const workflow = agent!.getCurrentWorkflow();
    return JSON.stringify(workflow, null, 2);
  },
});
```

## Tool Development Checklist

Use this checklist when creating a new tool:

### Planning

- [ ] Define clear purpose and scope
- [ ] Decide: immediate execution or confirmation required?
- [ ] List required parameters and their types
- [ ] Identify what data the AI needs access to

### Implementation

- [ ] Create tool definition in `src/tools.ts`
- [ ] Add Zod schema with descriptions
- [ ] Implement execute function OR add to executions object
- [ ] Export tool in tools object
- [ ] Add to `toolsRequiringConfirmation` if needed

### System Prompt

- [ ] Add clear instructions in `generateSystemPrompt()`
- [ ] Include numbered steps
- [ ] Show examples of correct usage
- [ ] Explain confirmation flow if applicable
- [ ] Specify exact parameter sources

### Data Access

- [ ] Verify AI can see required IDs/data
- [ ] Update data-providing tools if needed
- [ ] Test with actual workflow data

### Testing

- [ ] Unit test the tool logic
- [ ] Test with pm2 and check logs
- [ ] End-to-end test with Playwright
- [ ] Verify AI calls tool correctly
- [ ] Test error cases
- [ ] Confirm success messages

### Documentation

- [ ] Update this guide if needed
- [ ] Document any new patterns discovered
- [ ] Add to relevant code comments

## Summary

Successful tool development requires:

1. **Clear tool definition** with good descriptions
2. **Proper system prompt** instructions
3. **Data visibility** for the AI
4. **Thorough testing** at all levels
5. **Good error handling** and user feedback

Remember: The key to successful tool development is ensuring the AI has access to all necessary data and clear instructions on how to use the tool correctly.
