# Per-Workflow Chat History Implementation Plan

## Executive Summary

Implement workflow-scoped chat history by using the workflow template ID as the agent name in the useAgent hook. This leverages Cloudflare's Durable Object isolation to provide natural message separation with minimal code changes, following CLAUDE.md's SLC/KISS principles perfectly.

## Architecture Visualization

### Current State (Shared Chat)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Workflow A    │     │   Workflow B    │     │   Workflow C    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────┬───────────┴───────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  DO: "default"        │
         │  ┌─────────────────┐  │
         │  │ SQL: messages   │  │ ◄── All workflows share
         │  │ - Message 1     │  │     the same messages
         │  │ - Message 2     │  │
         │  │ - Message 3     │  │
         │  └─────────────────┘  │
         └───────────────────────┘
```

### New State (Isolated Chat)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Workflow A    │     │   Workflow B    │     │   Workflow C    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ DO: "workflow-a"  │   │ DO: "workflow-b"  │   │ DO: "workflow-c"  │
│ ┌───────────────┐ │   │ ┌───────────────┐ │   │ ┌───────────────┐ │
│ │SQL: messages  │ │   │ │SQL: messages  │ │   │ │SQL: messages  │ │
│ │- Message A1   │ │   │ │- Message B1   │ │   │ │- Message C1   │ │
│ │- Message A2   │ │   │ │- Message B2   │ │   │ │- Message C2   │ │
│ └───────────────┘ │   │ └───────────────┘ │   │ └───────────────┘ │
└───────────────────┘   └───────────────────┘   └───────────────────┘
      Isolated ✓            Isolated ✓            Isolated ✓
```

## Architecture Decision

### Chosen Approach: DO Instance Per Workflow

- **Implementation**: Pass `selectedTemplateId` as the `name` parameter to `useAgent`
- **Result**: Each workflow gets its own Durable Object instance
- **Storage**: Each DO has isolated SQL table for messages
- **Benefits**:
  - Single line of code change
  - Natural isolation via Cloudflare architecture
  - No complex filtering logic needed
  - Clean separation of concerns

### Why This Approach?

1. **Simplicity**: Leverages existing infrastructure
2. **Reliability**: DO isolation is battle-tested
3. **Maintainability**: No custom code to maintain
4. **Performance**: Minimal overhead, linear scaling

## Implementation Plan

### Phase 1: Core Implementation

#### 1.1 Update ChatPanel Component

```typescript
// In src/components/chat/ChatPanel.tsx, line ~193-196
// Change from:
const agent = useAgent({
  agent: "chat",
  host: getApiHost(),
});

// To:
const agent = useAgent({
  agent: "chat",
  name: selectedTemplateId || "default", // Use workflow ID as agent name
  host: getApiHost(),
});
```

#### 1.2 Add Workflow Switch Handler

```typescript
// Add after the agent initialization (line ~197)
// Monitor workflow switches for debugging
useEffect(() => {
  console.log("[ChatPanel] Workflow switched to:", selectedTemplateId);
  // The useAgent hook should handle WebSocket reconnection automatically
  // Messages will be loaded from the new DO instance
}, [selectedTemplateId]);
```

#### 1.3 Initial Testing

1. Start the development server
2. Open browser DevTools (Network tab)
3. Switch between workflows
4. Verify new WebSocket connection is created
5. Confirm messages are isolated

### Phase 2: Edge Case Handling

#### 2.1 Message State Management

If messages don't refresh automatically on workflow switch:

```typescript
// Enhanced workflow switch handler with explicit state management
useEffect(() => {
  console.log("[ChatPanel] Workflow switched to:", selectedTemplateId);

  // The new agent instance should have empty/different messages
  // If not, we can access the clearHistory function from useAgentChat
  // But this should not be necessary with proper DO isolation

  return () => {
    // Cleanup logging for debugging
    console.log("[ChatPanel] Cleaning up workflow:", selectedTemplateId);
  };
}, [selectedTemplateId]);
```

#### 2.2 Connection State Tracking (Optional for MVP)

```typescript
// Only add if users report connection issues
const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>('connecting');

// Add connection state UI feedback
{connectionState === 'connecting' && (
  <div className="p-4 text-center text-muted-foreground">
    Connecting to workflow chat...
  </div>
)}
```

#### 2.3 Rapid Switching Protection

- For MVP: Rely on React's built-in batching
- If issues arise: Add debouncing to template selector
- Monitor for "too many connections" errors

### Phase 3: Comprehensive Testing with Playwright MCP

#### 3.1 Visual UX Verification with Playwright

**Setup Playwright Session**

```typescript
// Start Playwright MCP session
await mcp__playwright__start_codegen_session({
  options: {
    outputPath: "./tests/e2e/generated",
    includeComments: true,
    testNamePrefix: "WorkflowChatIsolation",
  },
});

// Navigate to application
await mcp__playwright__playwright_navigate({
  url: "http://localhost:3000",
  browserType: "chromium",
  headless: false,
  width: 1280,
  height: 720,
});
```

**Test 1: Basic Workflow Isolation - Visual Verification**

```typescript
// Step 1: Take initial screenshot
await mcp__playwright__playwright_screenshot({
  name: "initial-state",
  fullPage: true,
  savePng: true,
});

// Step 2: Verify initial chat state
const initialChatContent = await mcp__playwright__playwright_get_visible_text();
expect(initialChatContent).toContain("Welcome to AI Chat");

// Step 3: Send message in workflow A
await mcp__playwright__playwright_fill({
  selector: '[data-testid="chat-input"]',
  value: "Hello from InstaWork workflow",
});
await mcp__playwright__playwright_click({
  selector: '[data-testid="send-button"]',
});

// Step 4: Wait for message to appear and screenshot
await page.waitForTimeout(1000); // Allow message to render
await mcp__playwright__playwright_screenshot({
  name: "workflow-a-with-message",
  selector: '[data-testid="chat-messages"]',
  savePng: true,
});

// Step 5: Check console for WebSocket connection
const consoleLogs1 = await mcp__playwright__playwright_console_logs({
  type: "log",
  search: "WebSocket",
});
expect(consoleLogs1).toContain("WebSocket connected");

// Step 6: Switch to workflow B
await mcp__playwright__playwright_select({
  selector: '[data-testid="template-selector"]',
  value: "employee-onboarding-v2",
});

// Step 7: Verify chat is empty after switch
await page.waitForTimeout(500); // Allow for switch animation
const workflowBContent = await mcp__playwright__playwright_get_visible_text();
expect(workflowBContent).not.toContain("Hello from InstaWork");
await mcp__playwright__playwright_screenshot({
  name: "workflow-b-empty-chat",
  fullPage: true,
  savePng: true,
});

// Step 8: Verify new WebSocket connection
const consoleLogs2 = await mcp__playwright__playwright_console_logs({
  type: "log",
  search: "Workflow switched to",
});
expect(consoleLogs2).toContain("employee-onboarding-v2");
```

**Test 2: Clear History Visual Verification**

```typescript
// Ensure we're in workflow A with messages
await mcp__playwright__playwright_select({
  selector: '[data-testid="template-selector"]',
  value: "instawork-shift-filling",
});

// Take before screenshot
await mcp__playwright__playwright_screenshot({
  name: "before-clear-history",
  selector: '[data-testid="chat-panel"]',
  savePng: true,
});

// Click clear history button
await mcp__playwright__playwright_click({
  selector: '[data-testid="clear-history-button"]', // Assuming this data-testid
});

// Wait and verify UI updates
await page.waitForTimeout(500);
await mcp__playwright__playwright_screenshot({
  name: "after-clear-history",
  selector: '[data-testid="chat-panel"]',
  savePng: true,
});

// Verify welcome message reappears
const clearedContent = await mcp__playwright__playwright_get_visible_text();
expect(clearedContent).toContain("Welcome to AI Chat");
```

**Test 3: WebSocket Connection Monitoring**

```typescript
// Enable network monitoring
await mcp__playwright__playwright_evaluate({
  script: `
    window.wsConnections = [];
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(...args) {
      const ws = new originalWebSocket(...args);
      window.wsConnections.push({
        url: args[0],
        readyState: ws.readyState,
        timestamp: Date.now()
      });
      return ws;
    };
  `,
});

// Perform workflow switches
for (const workflow of ["instawork-shift-filling", "employee-onboarding-v2"]) {
  await mcp__playwright__playwright_select({
    selector: '[data-testid="template-selector"]',
    value: workflow,
  });
  await page.waitForTimeout(1000);

  // Check WebSocket connections
  const connections = await mcp__playwright__playwright_evaluate({
    script: "window.wsConnections",
  });

  console.log(`WebSocket connections for ${workflow}:`, connections);
}
```

**Test 4: Loading States and Transitions**

```typescript
// Test rapid switching with loading state verification
const workflows = ["instawork-shift-filling", "employee-onboarding-v2"];
const screenshots = [];

for (let i = 0; i < 5; i++) {
  const workflow = workflows[i % 2];

  // Switch workflow
  await mcp__playwright__playwright_select({
    selector: '[data-testid="template-selector"]',
    value: workflow,
  });

  // Immediate screenshot to catch loading state
  screenshots.push(
    await mcp__playwright__playwright_screenshot({
      name: `rapid-switch-${i}`,
      selector: '[data-testid="chat-panel"]',
      savePng: true,
    })
  );

  // Check for loading indicators
  const visibleText = await mcp__playwright__playwright_get_visible_text();
  if (visibleText.includes("Connecting to workflow chat")) {
    console.log(`Loading state detected at switch ${i}`);
  }

  await page.waitForTimeout(200);
}
```

**Test 5: Error State Handling**

```typescript
// Simulate network issues
await mcp__playwright__playwright_evaluate({
  script: `
    // Override fetch to simulate network errors
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      if (args[0].includes('set-context')) {
        return Promise.reject(new Error('Network error'));
      }
      return originalFetch(...args);
    };
  `,
});

// Try to switch workflow
await mcp__playwright__playwright_select({
  selector: '[data-testid="template-selector"]',
  value: "employee-onboarding-v2",
});

// Screenshot error state
await page.waitForTimeout(1000);
await mcp__playwright__playwright_screenshot({
  name: "network-error-state",
  fullPage: true,
  savePng: true,
});

// Check console for error handling
const errorLogs = await mcp__playwright__playwright_console_logs({
  type: "error",
  search: "Failed to set chat context",
});
```

#### 3.2 Manual Testing Checklist

**Visual Verification Points**

- [ ] Screenshot comparison: Empty chat vs populated chat
- [ ] Loading indicator appears during workflow switch
- [ ] No flash of wrong content during transitions
- [ ] Clear button visual feedback (hover, click states)
- [ ] Chat input disabled state during transitions
- [ ] Message timestamps are preserved correctly

**Console Verification**

- [ ] Check for "[ChatPanel] Workflow switched to:" logs
- [ ] Verify WebSocket connection logs
- [ ] No error messages during normal operation
- [ ] Proper cleanup logs when switching

**Network Verification**

- [ ] WebSocket URL changes with workflow ID
- [ ] Old WebSocket closes before new one opens
- [ ] set-context API calls succeed
- [ ] No duplicate connections

#### 3.2 Automated Test Updates

```typescript
// Add to tests/e2e/workflow-chat.spec.ts
test.describe("Per-Workflow Chat Isolation", () => {
  test("maintains separate chat history per workflow", async ({ page }) => {
    // Navigate to app
    await page.goto("/");

    // Send message in workflow A
    await page.selectOption(
      '[data-testid="template-selector"]',
      "instawork-shift-filling"
    );
    await page.fill('[data-testid="chat-input"]', "Message in workflow A");
    await page.click('[data-testid="send-button"]');

    // Switch to workflow B
    await page.selectOption(
      '[data-testid="template-selector"]',
      "employee-onboarding-v2"
    );

    // Verify empty chat
    const messages = await page
      .locator('[data-testid="chat-messages"]')
      .textContent();
    expect(messages).not.toContain("Message in workflow A");

    // Send message in workflow B
    await page.fill('[data-testid="chat-input"]', "Message in workflow B");
    await page.click('[data-testid="send-button"]');

    // Switch back to workflow A
    await page.selectOption(
      '[data-testid="template-selector"]',
      "instawork-shift-filling"
    );

    // Verify workflow A message is preserved
    const messagesA = await page
      .locator('[data-testid="chat-messages"]')
      .textContent();
    expect(messagesA).toContain("Message in workflow A");
    expect(messagesA).not.toContain("Message in workflow B");
  });

  test("clear history only affects current workflow", async ({ page }) => {
    // Implementation similar to above
  });
});
```

### Phase 4: Monitoring & Rollback

#### 4.1 Monitoring Plan

1. **Cloudflare Dashboard**

   - Monitor Durable Objects count
   - Check for unusual DO creation patterns
   - Watch WebSocket connection metrics

2. **Application Logs**

   - Track workflow switch events
   - Monitor WebSocket errors
   - Log connection timing

3. **User Feedback**
   - Watch for chat continuity issues
   - Monitor for lost messages reports
   - Track performance complaints

#### 4.2 Rollback Strategy

**Quick Rollback** (if critical issues):

```typescript
// Simply comment out the name parameter
const agent = useAgent({
  agent: "chat",
  // name: selectedTemplateId || "default",  // ROLLBACK: Comment this line
  host: getApiHost(),
});
```

**Gradual Rollout** (if needed):

```typescript
// Feature flag approach
const usePerWorkflowChat = process.env.ENABLE_PER_WORKFLOW_CHAT === "true";

const agent = useAgent({
  agent: "chat",
  name: usePerWorkflowChat ? selectedTemplateId || "default" : undefined,
  host: getApiHost(),
});
```

#### 4.3 Success Metrics

- **Functional**: Zero message contamination between workflows
- **Performance**: WebSocket reconnection < 1 second
- **Reliability**: No increase in connection error rate
- **UX**: Positive user feedback on chat isolation

## Migration Considerations

### Existing Chat History

- Current messages exist in DO instance named "default"
- No migration needed - old messages remain accessible
- Users starting fresh with each workflow is acceptable for MVP

### Future Enhancement Options

1. Add "Import history from default" button
2. Implement chat history export/import
3. Add visual indicator for active workflow in chat

## Code Review Checklist

Before deployment:

- [ ] Core change implemented (1 line)
- [ ] Workflow switch handler added
- [ ] Console logs added for debugging
- [ ] Manual testing completed
- [ ] E2E tests updated and passing
- [ ] No TypeScript errors
- [ ] No console errors during switching
- [ ] Performance acceptable (< 1s switch time)

## Architectural Notes

### Why This Works

1. **Durable Object Architecture**: Each DO instance is completely isolated
2. **SQL Storage**: Each DO has its own SQL database
3. **WebSocket Routing**: Connections route to specific DO based on name
4. **Agent SDK**: Handles reconnection when name changes

### Potential Future Optimizations

1. **DO Cleanup**: Implement cleanup for unused workflow DOs
2. **Connection Pooling**: Reuse connections if switching back quickly
3. **Message Pagination**: Add pagination for long chat histories
4. **Bulk Operations**: Batch clear across workflows if needed

## Troubleshooting Guide

### Issue: Messages don't clear when switching

**Solution**: Check that selectedTemplateId is actually changing. Add more logging.

### Issue: WebSocket doesn't reconnect

**Solution**: Verify the useAgent hook dependencies. May need to force reconnection.

### Issue: Old messages appear briefly

**Solution**: Add loading state during workflow switch to prevent flash of old content.

### Issue: Connection errors during rapid switching

**Solution**: Implement debouncing on the template selector component.

## Summary

This implementation provides workflow-isolated chat history with minimal code changes, leveraging Cloudflare's robust Durable Object architecture. The solution is:

- **Simple**: One line of code change
- **Reliable**: Uses proven DO isolation
- **Performant**: No additional overhead
- **Maintainable**: No custom logic to maintain

Perfect for an SLC MVP approach while providing a solid foundation for future enhancements.
