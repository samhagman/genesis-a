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

### Phase 3: Comprehensive Testing

#### 3.1 Manual Testing Checklist

**Basic Workflow Isolation**

- [ ] Start with "instawork-shift-filling" workflow
- [ ] Send messages: "Hello from InstaWork", "Testing workflow A"
- [ ] Switch to "employee-onboarding-v2" workflow
- [ ] Verify chat panel shows empty history
- [ ] Send messages: "Hello from Onboarding", "Testing workflow B"
- [ ] Switch back to "instawork-shift-filling"
- [ ] Verify original messages are preserved
- [ ] Check no message contamination

**Clear History Isolation**

- [ ] In InstaWork workflow, click clear history button
- [ ] Verify all messages are cleared
- [ ] Switch to Onboarding workflow
- [ ] Verify Onboarding messages still exist
- [ ] Switch back to InstaWork
- [ ] Verify InstaWork remains empty

**WebSocket Connection Stability**

- [ ] Open DevTools > Network > WS tab
- [ ] Switch workflows multiple times
- [ ] Verify for each switch:
  - [ ] Old WebSocket closes cleanly
  - [ ] New WebSocket opens to different endpoint
  - [ ] Connection establishes within 1 second
  - [ ] No connection errors in console

**Edge Case Testing**

- [ ] Rapid switching: Click between workflows 5 times quickly
- [ ] Mid-message switch: Type message, switch before sending
- [ ] During AI response: Send message, switch during streaming
- [ ] Network issues: Enable DevTools throttling, test switching
- [ ] Long messages: Send paragraph, switch, verify isolation

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
