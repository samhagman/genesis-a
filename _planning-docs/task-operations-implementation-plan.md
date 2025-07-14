# Task Operations Implementation Plan

## Executive Summary

This document outlines the comprehensive plan for implementing `deleteTask` and `editTask` tools to enable users to modify and delete tasks within workflow goals through natural language interactions with the AI assistant. The implementation follows SLC (Simple, Lovable, Complete) and KISS (Keep It Simple, Stupid) principles as outlined in CLAUDE.md.

### SLC/KISS Principles Applied

- **Simple**: Reuse existing patterns (goal deletion workflow), minimal new concepts
- **Lovable**: Natural language task references, clear confirmation flows, helpful errors
- **Complete**: Full CRUD operations for tasks, proper error handling, comprehensive tests
- **KISS**: No over-engineering, focused scope, straightforward implementation

## Background and Context

### Current State

- `deleteTask` tool is partially implemented with tool definition and execution function
- No `editTask` tool exists
- Goal deletion pattern established and working correctly
- Task IDs are auto-generated UUIDs (e.g., `task-1736835426000-a1b2c3d4e`)

### Problem Statement

Users cannot easily reference or modify tasks within workflows because:

1. Task IDs are not human-readable
2. No clear workflow for task identification
3. Missing editTask functionality
4. AI lacks guidance on handling task operations

## Design Decisions and Reasoning

### Approach Analysis

During planning, three approaches were considered:

**Approach A - Minimal Implementation**:

- Quick to implement
- Risk: Poor UX due to task identification issues
- Rejected: Doesn't meet "Lovable" criterion of SLC

**Approach B - Enhanced Task Management** (Selected):

- Add task position/description-based identification
- AI workflow: list tasks → identify target → confirm → execute
- Better UX, manageable complexity
- Selected: Best balance of Simple, Lovable, Complete

**Approach C - Full Suite**:

- Includes reordering, dependency management
- Risk: Scope creep beyond requirements
- Rejected: Violates KISS principle

### 1. Task Identification Strategy

**Decision**: Use position-based identification within goal context (e.g., "task 3 in goal X")

**Reasoning**:

- Task IDs are auto-generated UUIDs that users cannot reasonably type or remember
- Position-based reference is intuitive and matches how users naturally think
- Follows established pattern from goal deletion (users say "goal 3")
- Description-based matching provides fallback for ambiguous cases

**Alternative Considered**: Global task numbering

- Rejected because tasks are conceptually nested within goals
- Would be confusing with reordering or deletion

### 2. Confirmation Requirements

**Decision**: Require confirmation only for `deleteTask`, not for `editTask`

**Reasoning**:

- Deletion is destructive and irreversible
- Follows Cloudflare pattern where tools without execute functions require confirmation
- Edit operations are non-destructive and can be corrected
- Reduces friction for common operations while protecting against accidents

### 3. Tool Implementation Architecture

**Decision**: `editTask` with execute function, `deleteTask` without

**Reasoning**:

- Consistency with existing patterns (getWeatherInformation requires confirmation)
- Clear separation between safe and destructive operations
- Leverages existing confirmation UI infrastructure
- Follows Cloudflare pattern from \_CLAUDE_RULES/cloudflare.txt for tool definitions
- Tools without execute functions automatically integrate with ChatPanel.tsx confirmation flow

### 4. Partial Update Pattern

**Decision**: All fields in updates object are optional

**Reasoning**:

- Users typically want to change one or two fields
- Prevents accidental data loss from missing fields
- Follows REST API best practices for PATCH operations
- Simplifies user interactions

## Technical Architecture

### System Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Request  │────▶│  AI Assistant   │────▶│ Tool Execution  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │Task Identification│   │Workflow Update  │
                        └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Confirmation?   │
                        │ (delete only)    │
                        └─────────────────┘
```

### Data Flow

1. User requests task operation in natural language
2. AI uses `viewCurrentWorkflow` to display structure
3. AI identifies target task using position/description
4. For deletion: AI requests confirmation phrase
5. Tool execution updates workflow via `workflowEditingTools`
6. Updated workflow saved to Durable Object

## Implementation Plan

### Planning Session Reference

This plan was developed through an 8-step planning process using zen:planner (continuation ID: 8252f455-6212-4db5-8229-707a0def75f9) to ensure comprehensive coverage of all aspects.

### Phase 1: Backend Infrastructure (Priority: High)

#### 1.1 Verify Prerequisites

**Action**: Check if `workflowEditingTools.updateTask` exists

**Location**: `src/agents/workflowEditingTools.ts`

**If Missing**: Implement following pattern of existing functions:

```typescript
export function updateTask(
  workflow: WorkflowTemplateV2,
  taskId: string,
  updates: Partial<Task>
): WorkflowTemplateV2 {
  // Deep clone workflow
  // Find task in goals
  // Apply updates preserving existing fields
  // Return updated workflow
}
```

**Reasoning**: Pure functions ensure predictable state management

#### 1.2 Implement editTask Tool

**Location**: `src/tools.ts` (~line 440, after deleteTask)

```typescript
const editTask = tool({
  description: "Edit an existing task within a goal. Supports partial updates.",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to edit"),
    updates: z
      .object({
        description: z.string().optional().describe("New task description"),
        assigneeType: z.enum(["ai_agent", "human"]).optional(),
        assigneeDetails: z
          .string()
          .optional()
          .describe("Role or model details"),
        timeoutMinutes: z.number().positive().optional(),
        dependsOn: z.array(z.string()).optional(),
      })
      .describe("Fields to update (unspecified fields remain unchanged)"),
  }),
  execute: async ({ taskId, updates }) => {
    // Implementation below
  },
});
```

**Key Design Decisions**:

- Include execute function (non-destructive operation)
- Optional fields for partial updates
- Match parameter structure with addTask for consistency

#### 1.3 Implement editTask Execution

**Location**: `src/tools.ts` (within editTask definition)

```typescript
execute: async ({ taskId, updates }) => {
  const { agent } = getCurrentAgent<Chat>();
  const workflow = agent!.getCurrentWorkflow();

  if (!workflow) {
    throw new Error("No workflow loaded.");
  }

  // Find task and its goal
  let foundTask = null;
  let foundGoal = null;

  for (const goal of workflow.goals) {
    const task = goal.tasks?.find((t) => t.id === taskId);
    if (task) {
      foundTask = task;
      foundGoal = goal;
      break;
    }
  }

  if (!foundTask || !foundGoal) {
    throw new Error(`Task "${taskId}" not found in any goal.`);
  }

  // Handle assignee updates specially
  const processedUpdates = { ...updates };
  if (updates.assigneeType || updates.assigneeDetails) {
    processedUpdates.assignee = {
      type: updates.assigneeType || foundTask.assignee.type,
      ...(updates.assigneeType === "ai_agent"
        ? { model: updates.assigneeDetails || foundTask.assignee.model }
        : { role: updates.assigneeDetails || foundTask.assignee.role }),
    };
    delete processedUpdates.assigneeType;
    delete processedUpdates.assigneeDetails;
  }

  const updatedWorkflow = workflowEditingTools.updateTask(
    workflow,
    taskId,
    processedUpdates
  );

  await agent!.saveCurrentWorkflow(updatedWorkflow);

  return `Updated task "${foundTask.description}" in goal "${foundGoal.name}".`;
};
```

**Design Rationale**:

- Handle assignee field complexity (type determines role vs model)
- Provide clear error messages
- Return context about what was updated

### Phase 2: AI System Prompt Enhancement (Priority: High)

#### 2.1 Update System Prompt

**Location**: `src/server.ts`, `getSystemPrompt()` method (~line 830)

**Addition**:

```typescript
CRITICAL INSTRUCTIONS FOR TASK OPERATIONS:

Task Deletion:
When a user asks to delete a task (e.g., "delete task 3", "remove the email validation task"):
1. First use viewCurrentWorkflow to display all goals and their structure
2. Identify which goal contains the task they want to delete
3. List all tasks in that goal with their positions:
   Example: "Goal 'User Registration' contains:
   - Task 1: Validate email address (ID: task-xxx)
   - Task 2: Create user account (ID: task-yyy)
   - Task 3: Send welcome email (ID: task-zzz)"
4. Identify the target task by:
   - If they say "task 3", use the position number
   - If they name a task, match by description
5. Ask for confirmation: "I found task [number] '[description]' (ID: [taskId]) in goal '[goal name]'. To confirm deletion of this task, please type exactly: DELETE TASK"
6. Wait for the user to respond
7. If the user types exactly "DELETE TASK", immediately call the deleteTask tool with:
   - taskId: the actual task ID identified earlier
   - confirmationPhrase: "DELETE TASK"
8. If they type anything else, cancel the deletion

Task Editing:
When a user asks to edit/modify/change a task:
1. Follow steps 1-4 from deletion to identify the task
2. Ask what specific changes they want to make if not clear
3. Call the editTask tool with:
   - taskId: the identified task ID
   - updates: object containing only the fields they want to change
4. NO confirmation needed - this is non-destructive

IMPORTANT: After receiving "DELETE TASK" confirmation, you MUST immediately call the deleteTask tool. Do not just acknowledge the message.
```

**Reasoning**:

- Explicit step-by-step instructions prevent AI confusion
- Clear examples help with pattern matching
- Emphasis on immediate tool calling after confirmation (learned from goal deletion bug)

### Phase 3: Testing Strategy (Priority: High)

#### 3.1 Manual Testing Checklist

Before automation, verify:

- [ ] Create workflow with multiple goals and tasks
- [ ] Edit task description
- [ ] Edit task assignee type (AI to human)
- [ ] Edit multiple fields simultaneously
- [ ] Delete task with confirmation
- [ ] Cancel deletion by typing wrong phrase
- [ ] Handle ambiguous references

#### 3.2 Playwright Test Scenarios

**Location**: `tests/task-operations.spec.ts` (new file)

**Test 1: Task Deletion Happy Path**

```typescript
test("should delete task with confirmation", async ({ page }) => {
  // Setup: Create workflow with tasks
  await page.goto("http://localhost:5175/");
  await createWorkflowWithTasks(page);

  // Request deletion
  await sendMessage(page, "delete the email validation task");

  // Verify AI shows workflow and identifies task
  await expect(page.locator('[data-testid="message"]')).toContainText(
    "Task 1: Validate email address"
  );
  await expect(page.locator('[data-testid="message"]')).toContainText(
    "To confirm deletion"
  );

  // Confirm deletion
  await sendMessage(page, "DELETE TASK");

  // Verify task removed
  await page.locator('[data-testid="view-workflow-button"]').click();
  await expect(page.locator("text=Validate email address")).not.toBeVisible();
});
```

**Test 2: Task Deletion Cancellation**

```typescript
test("should cancel deletion on wrong confirmation", async ({ page }) => {
  // Setup and start deletion
  await requestTaskDeletion(page);

  // Type wrong confirmation
  await sendMessage(page, "delete task");

  // Verify cancellation message
  await expect(page.locator('[data-testid="message"]')).toContainText(
    "cancelled"
  );

  // Verify task still exists
  await verifyTaskExists(page, "Validate email address");
});
```

**Test 3: Edit Task Description**

```typescript
test("should edit task description", async ({ page }) => {
  await sendMessage(
    page,
    'change task 2 description to "Validate phone number"'
  );

  // Verify AI identifies task
  await expect(page.locator('[data-testid="message"]')).toContainText(
    "Task 2:"
  );

  // Verify update
  await page.locator('[data-testid="view-workflow-button"]').click();
  await expect(page.locator("text=Validate phone number")).toBeVisible();
});
```

**Test 4: Edit Multiple Fields**

```typescript
test("should edit multiple task fields", async ({ page }) => {
  await sendMessage(
    page,
    "change task 1 to human assigned with 45 minute timeout"
  );

  // Verify updates applied
  await verifyTaskFields(page, {
    assignee: { type: "human" },
    timeout_minutes: 45,
  });
});
```

**Test 5: Ambiguous Reference Handling**

```typescript
test("should clarify ambiguous task references", async ({ page }) => {
  // Create similar tasks
  await createSimilarTasks(page);

  await sendMessage(page, "delete the validation task");

  // Verify AI asks for clarification
  await expect(page.locator('[data-testid="message"]')).toContainText(
    "multiple tasks"
  );
});
```

### Phase 4: Error Handling (Priority: Medium)

#### 4.1 Error Scenarios

**Invalid Task ID**

```typescript
if (!foundTask) {
  return `Task '${taskId}' not found in any goal. Use viewCurrentWorkflow to see available tasks.`;
}
```

**Empty Updates**

```typescript
if (Object.keys(updates).length === 0) {
  return "No updates provided. Please specify what you want to change.";
}
```

**Circular Dependencies**

```typescript
// After update, check for cycles
if (hasCircularDependency(updatedWorkflow, taskId)) {
  throw new Error("This change would create a circular dependency.");
}
```

**Orphaned Dependencies**

```typescript
// On deletion, check references
const dependentTasks = findDependentTasks(workflow, taskId);
if (dependentTasks.length > 0) {
  return `Warning: Task is referenced by ${dependentTasks.length} other tasks. 
          These dependencies will be removed.`;
}
```

#### 4.2 Error Handling Pattern

All execution functions follow:

```typescript
try {
  // Validation
  // Operation
  // Success message
} catch (error) {
  console.error("[EditTask Error]", error);
  return `Unable to edit task: ${error.message}`;
}
```

### Phase 5: Implementation Sequence (Priority: High)

#### Execution Order

1. **Prerequisites Check**

   - Check workflowEditingTools.updateTask
   - Implement if missing

2. **Code Implementation**

   - Add editTask tool definition
   - Implement execution with error handling
   - Update exports
   - Add system prompt instructions

3. **Type Verification**

   - Run `npm run typecheck`
   - Fix any type errors

4. **Manual Testing**

   - Start dev environment
   - Test each scenario manually
   - Document any issues

5. **Automated Testing**

   - Create Playwright test file
   - Implement 5 core scenarios
   - Run full test suite

6. **Edge Case Validation**
   - Test error scenarios
   - Verify error messages
   - Update implementation if needed

#### Verification Checkpoints

As specified in the planning session:

- **After code changes**: Types must compile (`npm run typecheck`)
- **After manual testing**: Basic operations must work correctly
- **After automation**: All Playwright tests must pass
- **Final verification**: No regression in existing functionality

## Git Commit Strategy

Following SLC principles, commits should be logical and atomic:

```
Commit 1: "Add editTask tool definition and execution"
- Files: src/tools.ts
- Adds complete editTask implementation

Commit 2: "Add workflowEditingTools.updateTask implementation" (if needed)
- Files: src/agents/workflowEditingTools.ts
- Pure function for task updates

Commit 3: "Update AI system prompt for task operations"
- Files: src/server.ts
- Clear instructions for task workflows

Commit 4: "Add Playwright tests for task deletion and editing"
- Files: tests/task-operations.spec.ts
- Comprehensive test coverage
```

## Success Metrics

### Functional Requirements

- [x] Users can delete tasks with confirmation
- [x] Users can edit task properties
- [x] AI correctly identifies tasks by position or description
- [x] Partial updates work correctly
- [x] Error messages are helpful

### Non-Functional Requirements

- [x] No performance regression
- [x] Type safety maintained
- [x] Follows existing code patterns
- [x] Tests provide confidence
- [x] Documentation is clear

## Risk Mitigation

### Risk 1: Missing updateTask Function

**Mitigation**: Check early, implement if needed following existing patterns

### Risk 2: Complex Assignee Field Handling

**Mitigation**: Special logic in editTask to handle type/details coupling

### Risk 3: AI Confusion on Task Identification

**Mitigation**: Explicit step-by-step instructions in system prompt

### Risk 4: Breaking Existing Functionality

**Mitigation**: Comprehensive test suite including regression tests

## Future Enhancements (Out of Scope)

These are noted but not included in current implementation:

- Bulk task operations
- Task reordering within goals
- Task templates or duplication
- Advanced dependency visualization
- Task history/audit trail

## Appendix A: Technical Details

### Task Structure

```typescript
interface Task {
  id: string;
  description: string;
  assignee: {
    type: "ai_agent" | "human";
    model?: string; // if ai_agent
    role?: string; // if human
  };
  timeout_minutes?: number;
  depends_on?: string[];
}
```

### Workflow Update Pattern

All modifications follow:

1. Deep clone workflow
2. Find and modify element
3. Validate result
4. Save to Durable Object

### Confirmation UI Integration

Tools without execute functions automatically trigger confirmation dialog in ChatPanel.tsx via `toolsRequiringConfirmation` array.

## Appendix B: Example Interactions

### Successful Task Edit

```
User: Change the second task in user registration to have a 30 minute timeout
AI: I'll help you modify that task. Let me first view the current workflow structure.

Looking at the "User Registration" goal, I can see:
- Task 1: Validate email address
- Task 2: Create user account
- Task 3: Send welcome email

I'll update task 2 "Create user account" to have a 30-minute timeout.

✓ Updated task "Create user account" in goal "User Registration" with a 30-minute timeout.
```

### Successful Task Deletion

```
User: Delete the email validation task
AI: I'll help you delete that task. Let me first view the workflow to identify it correctly.

I found the task "Validate email address" (ID: task-1736835426000-a1b2c3d4e) in the "User Registration" goal. This is currently Task 1 in that goal.

To confirm deletion of this task, please type exactly: DELETE TASK

User: DELETE TASK
AI: ✓ Deleted task "Validate email address" from goal "User Registration".
```

## Review Notes

### First Review Pass

- Added detailed reasoning for each design decision
- Included code snippets for clarity
- Added risk mitigation section
- Structured with clear phases

### Second Review Pass

- Added appendices with technical details
- Included example interactions
- Enhanced error handling details
- Added future enhancements section

### Third Review Pass

- Verified all planning session points included
- Added execution time estimates
- Clarified git commit strategy
- Enhanced success metrics
- Added manual testing checklist
