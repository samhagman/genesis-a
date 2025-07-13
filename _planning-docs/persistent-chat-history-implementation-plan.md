# Persistent Per-Template Chat History Implementation Plan

## Overview

Implement persistent chat history where each workflow template maintains its own isolated message storage in Cloudflare Durable Objects, with proper UX indicators for conversation continuity and template-specific clear functionality.

**Scope**: Core persistence + 2 critical UX fixes only
**Estimated Time**: 3.5 hours
**Risk Level**: Low (incremental changes, rollback possible)

## Current State Analysis

**Problem**: Chat messages don't persist when switching workflow templates. Users lose conversation context when switching between templates.

**Current Behavior**: 
- Template switching clears all chat messages
- Each template switch starts fresh conversation
- No message storage beyond session

**Desired Behavior**:
- Each template maintains isolated, persistent message history
- Template switching loads that template's previous messages
- Clear indicators when continuing vs starting new conversations
- Template-specific clear history options

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Chat DO       │    │   DO Storage    │
│   ChatPanel     │◄──►│   Server        │◄──►│   Messages      │
│                 │    │                 │    │                 │
│ getInitialMsgs  │    │ storeMessage()  │    │ msg:templateId: │
│ useAgentChat    │    │ getMessages()   │    │ {messageData}   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Key Design Decisions**:
- Use agents library's `getInitialMessages` pattern
- Store messages in DO storage with template-specific keys
- Minimal code changes (SLC principle)
- Template ID as agent name provides natural isolation

## Implementation Phases

### Phase 1: Foundation - Storage Layer

**Objective**: Implement core message storage in Chat Durable Object

**Files to Modify**: `/src/server.ts` (Chat class)

**Tasks**:

1. **Research Message Interface** (15 min)
   ```typescript
   // Examine: /node_modules/agents/dist/ai-react.d.ts
   // Document exact Message format:
   interface Message {
     id: string;
     role: "user" | "assistant" | "system";
     content: string;
     parts?: any[];
     timestamp?: string;
     // ... other fields
   }
   ```

2. **Add Storage Methods to Chat DO** (30 min)
   ```typescript
   export class Chat extends AIChatAgent<Env> {
     // Add these methods to Chat class
     
     async storeMessage(templateId: string, message: Message): Promise<void> {
       const key = `msg:${templateId}:${message.id}`;
       await this.doState.storage.put(key, JSON.stringify(message));
       console.log(`💾 [Chat DO] Stored message for template ${templateId}:`, message.id);
     }
     
     async getMessages(templateId: string): Promise<Message[]> {
       const prefix = `msg:${templateId}:`;
       const keys = await this.doState.storage.list({ prefix });
       const messages: Message[] = [];
       
       for (const [key, value] of keys) {
         try {
           const message = JSON.parse(value as string);
           messages.push(message);
         } catch (error) {
           console.error(`❌ [Chat DO] Failed to parse message ${key}:`, error);
         }
       }
       
       // Sort by timestamp or message creation order
       return messages.sort((a, b) => 
         new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
       );
     }
   }
   ```

3. **Test Storage Functionality**
   - Add console.log statements to verify storage works
   - Test with mock message data
   - Verify messages are stored and retrieved correctly

**Success Criteria**:
- ✅ `storeMessage()` saves messages to DO storage
- ✅ `getMessages()` retrieves messages for specific template
- ✅ Message format preserved exactly
- ✅ Console logs confirm storage operations

### Phase 2: API Layer - Message Retrieval

**Objective**: Create endpoint for fetching template-specific messages

**Files to Modify**: `/src/server.ts` (Chat class fetch method)

**Tasks**:

1. **Add Route Handling** (20 min)
   ```typescript
   // In Chat class fetch() method, add route handling:
   async fetch(request: Request): Promise<Response> {
     const url = new URL(request.url);
     
     // Handle message retrieval endpoint
     if (url.pathname.endsWith('/messages') && request.method === 'GET') {
       const templateId = url.searchParams.get('templateId');
       if (!templateId) {
         return new Response(JSON.stringify({ error: 'templateId required' }), {
           status: 400,
           headers: { 'Content-Type': 'application/json' }
         });
       }
       
       try {
         const messages = await this.getMessages(templateId);
         return new Response(JSON.stringify({ messages }), {
           headers: { 'Content-Type': 'application/json' }
         });
       } catch (error) {
         console.error(`❌ [Chat DO] Failed to get messages for ${templateId}:`, error);
         return new Response(JSON.stringify({ messages: [] }), {
           headers: { 'Content-Type': 'application/json' }
         });
       }
     }
     
     // Continue with existing fetch logic...
     return super.fetch(request);
   }
   ```

2. **Test API Endpoint**
   - Test with browser: `GET /agents/chat/template-id/messages?templateId=instawork-shift-filling`
   - Verify JSON response format
   - Test error handling for missing templateId

**Success Criteria**:
- ✅ GET endpoint returns messages for valid templateId
- ✅ Proper JSON format: `{ messages: Message[] }`
- ✅ Error handling for invalid requests
- ✅ Empty array for templates with no messages

### Phase 3: Frontend Integration - getInitialMessages

**Objective**: Load persisted messages when switching templates

**Files to Modify**: `/src/components/chat/ChatPanel.tsx`

**Tasks**:

1. **Add getInitialMessages Function** (25 min)
   ```typescript
   // In ChatPanel component, add getInitialMessages to useAgentChat:
   
   const getInitialMessages = useCallback(async (options: { agent: string, name: string, url: string }) => {
     const templateId = options.name;
     if (!templateId) return [];
     
     try {
       console.log(`📥 [ChatPanel] Loading messages for template: ${templateId}`);
       const response = await fetch(`${getApiUrl(`/agents/chat/${templateId}/messages`)}?templateId=${templateId}`);
       const data = await response.json();
       
       if (data.messages) {
         console.log(`✅ [ChatPanel] Loaded ${data.messages.length} messages for ${templateId}`);
         return data.messages;
       }
       return [];
     } catch (error) {
       console.error(`❌ [ChatPanel] Failed to load messages for ${templateId}:`, error);
       return [];
     }
   }, []);
   
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
   ```

2. **Test Template Switching**
   - Switch between templates
   - Verify messages load automatically
   - Check console logs for loading confirmation

**Success Criteria**:
- ✅ Template switching triggers message loading
- ✅ Loaded messages display in chat UI
- ✅ Console logs confirm loading process
- ✅ Error handling for failed loads

### Phase 4: Message Persistence - Storage Flow

**Objective**: Automatically store new messages as they're sent/received

**Files to Modify**: `/src/server.ts` (Chat class)

**Tasks**:

1. **Hook into Message Flow** (20 min)
   ```typescript
   // In Chat class, override message handling to store messages:
   
   // Find the existing streamText or chat completion method and add storage:
   
   async handleChatMessage(message: string, templateId: string): Promise<Response> {
     // Store user message
     const userMessage: Message = {
       id: crypto.randomUUID(),
       role: 'user',
       content: message,
       timestamp: new Date().toISOString(),
     };
     await this.storeMessage(templateId, userMessage);
     
     // Get AI response (existing logic)
     const response = await streamText({
       model: this.model,
       messages: [{ role: 'user', content: message }],
       tools: tools,
       maxSteps: 5,
       onFinish: async (result) => {
         // Store assistant message
         const assistantMessage: Message = {
           id: crypto.randomUUID(),
           role: 'assistant',
           content: result.text,
           timestamp: new Date().toISOString(),
         };
         await this.storeMessage(templateId, assistantMessage);
       },
     });
     
     return createDataStreamResponse(response.toDataStreamResponse());
   }
   ```

2. **Test End-to-End Storage**
   - Send messages in chat
   - Verify both user and AI messages are stored
   - Switch templates and verify messages persist

**Success Criteria**:
- ✅ User messages automatically stored
- ✅ AI response messages automatically stored
- ✅ Message ordering preserved
- ✅ Template isolation maintained

### Phase 5: UX Fixes

#### 5A: User Expectation Management (30 min)

**Objective**: Add UI indicators for conversation continuity

**Files to Modify**: `/src/components/chat/ChatPanel.tsx`

**Implementation**:
```typescript
// Add state for tracking if messages were loaded
const [hasLoadedMessages, setHasLoadedMessages] = useState(false);
const [lastMessageDate, setLastMessageDate] = useState<string | null>(null);

// Update getInitialMessages to track loaded state
const getInitialMessages = useCallback(async (options: { agent: string, name: string, url: string }) => {
  const templateId = options.name;
  if (!templateId) return [];
  
  try {
    const response = await fetch(`${getApiUrl(`/agents/chat/${templateId}/messages`)}?templateId=${templateId}`);
    const data = await response.json();
    
    if (data.messages && data.messages.length > 0) {
      setHasLoadedMessages(true);
      // Get last message timestamp
      const lastMsg = data.messages[data.messages.length - 1];
      setLastMessageDate(lastMsg.timestamp);
      return data.messages;
    } else {
      setHasLoadedMessages(false);
      setLastMessageDate(null);
    }
    return [];
  } catch (error) {
    console.error(`❌ [ChatPanel] Failed to load messages for ${templateId}:`, error);
    setHasLoadedMessages(false);
    return [];
  }
}, []);

// Add conversation continuation banner in JSX:
// In the messages area, before existing messages:
{hasLoadedMessages && lastMessageDate && (
  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
      <span>
        Continuing previous conversation from {new Date(lastMessageDate).toLocaleDateString()}
      </span>
    </div>
  </div>
)}
```

#### 5B: Clear History Button Redesign (30 min)

**Objective**: Template-specific clear with global option

**Files to Modify**: 
- `/src/components/chat/ChatPanel.tsx` 
- `/src/server.ts` (add clear endpoint)

**Implementation**:

1. **Add Clear Template Endpoint** (server.ts):
```typescript
// In Chat class fetch() method, add clear endpoint:
if (url.pathname.endsWith('/clear') && request.method === 'POST') {
  const body = await request.json();
  const { templateId, clearAll } = body;
  
  try {
    if (clearAll) {
      // Clear all messages for all templates
      const keys = await this.doState.storage.list({ prefix: 'msg:' });
      await Promise.all([...keys.keys()].map(key => this.doState.storage.delete(key)));
      console.log(`🧹 [Chat DO] Cleared all messages`);
    } else if (templateId) {
      // Clear messages for specific template
      const prefix = `msg:${templateId}:`;
      const keys = await this.doState.storage.list({ prefix });
      await Promise.all([...keys.keys()].map(key => this.doState.storage.delete(key)));
      console.log(`🧹 [Chat DO] Cleared messages for template ${templateId}`);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`❌ [Chat DO] Failed to clear messages:`, error);
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

2. **Update Clear Button UI** (ChatPanel.tsx):
```typescript
// Replace existing clear button with dropdown
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown/DropdownMenu";

// Add clear functions
const clearTemplateHistory = async () => {
  if (!selectedTemplateId) return;
  
  try {
    await fetch(getApiUrl(`/agents/chat/${selectedTemplateId}/clear`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: selectedTemplateId })
    });
    clearHistory(); // Clear frontend state
    setHasLoadedMessages(false);
  } catch (error) {
    console.error('Failed to clear template history:', error);
  }
};

const clearAllHistory = async () => {
  try {
    await fetch(getApiUrl(`/agents/chat/clear`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearAll: true })
    });
    clearHistory(); // Clear frontend state
    setHasLoadedMessages(false);
  } catch (error) {
    console.error('Failed to clear all history:', error);
  }
};

// Replace the existing clear button with:
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="md"
      shape="square"
      className="rounded-full h-9 w-9"
    >
      <Trash size={20} />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={clearTemplateHistory}>
      Clear {selectedTemplateId ? 'Current Template' : 'Template'} History
    </DropdownMenuItem>
    <DropdownMenuItem onClick={clearAllHistory}>
      Clear All History
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Phase 6: Testing & Validation (30 min)

**Objective**: Comprehensive testing of complete functionality

**Tasks**:

1. **Basic Functionality Testing**
   - Send messages in Template A
   - Switch to Template B, verify empty chat
   - Send messages in Template B
   - Switch back to Template A, verify original messages persist
   - Verify conversation continuation banner appears

2. **Clear History Testing**
   - Test template-specific clear
   - Test global clear all
   - Verify clear button dropdown works

3. **Edge Case Testing**
   - Template switching without messages
   - Network failure scenarios
   - Invalid template IDs
   - Browser refresh persistence

4. **Playwright Automation Test**
   ```typescript
   // Create test file: tests/chat-persistence.test.ts
   import { test, expect } from '@playwright/test';
   
   test('persistent chat history across templates', async ({ page }) => {
     await page.goto('http://localhost:5175/');
     
     // Send message in first template
     await page.fill('[data-testid="chat-input"]', 'Hello in template A');
     await page.click('[data-testid="send-button"]');
     await page.waitForTimeout(3000);
     
     // Switch to second template
     await page.click('button:has-text("📁 Template:")');
     await page.click('text=Employee Onboarding Process V2');
     
     // Verify chat is empty
     const messages = await page.locator('[data-testid="chat-messages"]');
     await expect(messages).toContainText('Welcome to AI Chat');
     
     // Send message in second template
     await page.fill('[data-testid="chat-input"]', 'Hello in template B');
     await page.click('[data-testid="send-button"]');
     await page.waitForTimeout(3000);
     
     // Switch back to first template
     await page.click('button:has-text("📁 Template:")');
     await page.click('text=InstaWork Shift Filling');
     
     // Verify original message persists and continuation banner appears
     await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Hello in template A');
     await expect(page.locator('text=Continuing previous conversation')).toBeVisible();
     
     await page.screenshot({ path: 'tests/screenshots/chat-persistence.png' });
   });
   ```

**Success Criteria**:
- ✅ Messages persist across template switches
- ✅ Each template maintains isolated history
- ✅ Continuation banner shows for existing conversations
- ✅ Clear history dropdown works correctly
- ✅ Template-specific and global clear functions work
- ✅ No existing functionality broken
- ✅ Playwright test passes

## Technical Specifications

### Message Storage Format
```typescript
interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string; // ISO string
  parts?: any[]; // For tool invocations
}

// Storage Key Format:
// msg:${templateId}:${messageId}
// Examples:
// "msg:instawork-shift-filling:msg_abc123"
// "msg:employee-onboarding-v2:msg_def456"
```

### API Endpoints
```
GET  /agents/chat/${templateId}/messages?templateId=${id}
POST /agents/chat/${templateId}/clear
```

### Error Handling Strategy
- **Storage failures**: Log error, continue with empty history
- **Network failures**: Return empty array, allow fresh conversation
- **Invalid template IDs**: Return empty array
- **Message parsing errors**: Skip corrupted messages, continue with valid ones

## Risk Mitigation

**Low Risk Factors**:
- Incremental implementation with rollback capability
- Each phase independently testable
- No breaking changes to existing API
- Template isolation prevents cross-contamination

**Monitoring Points**:
- Console logs for all storage operations
- Error rates for message loading
- Performance impact of message retrieval
- User feedback on new UX indicators

## Success Metrics

**Functional Requirements**:
- ✅ Messages persist when switching between templates
- ✅ Each template maintains isolated chat history
- ✅ New messages automatically stored to DO storage
- ✅ Template switching loads correct historical messages
- ✅ No existing functionality broken

**UX Requirements**:
- ✅ Clear indication when continuing previous conversations
- ✅ Template-specific clear history options
- ✅ Intuitive user experience without confusion

**Technical Requirements**:
- ✅ Follows SLC principles (Simple, Lovable, Complete)
- ✅ Uses Cloudflare DO storage best practices
- ✅ Leverages agents library patterns properly
- ✅ Comprehensive error handling
- ✅ Performance maintained

## Implementation Notes

**Dependencies**: None blocking - all resources available

**Rollback Strategy**: Each phase can be independently reverted without affecting others

**Performance Considerations**: 
- Message loading only on template switch (not every render)
- Storage operations are async and non-blocking
- Error handling prevents failures from breaking chat functionality

**Future Enhancements** (out of scope):
- Message pagination for large histories
- Message search functionality
- Export/import chat histories
- Message retention policies
- Advanced visual indicators

---

This plan provides a complete, actionable roadmap for implementing persistent per-template chat history with essential UX improvements while maintaining the SLC MVP approach.