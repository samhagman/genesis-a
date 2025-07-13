# Debug Plan: viewCurrentWorkflow Tool Issue

## Overview

This document outlines a systematic approach to debug and fix the `viewCurrentWorkflow` tool that is currently not working in the Genesis workflow application.

## Application Architecture

- **Frontend**: Vite React app running on port 5175
- **Backend**: Cloudflare Workers (wrangler) running on port 8787
- **Process Management**: PM2 with ecosystem.config.cjs
- **Testing**: Playwright for E2E tests
- **Features**: Workflow visualization and chat interface with AI tools

## Debugging Plan

### Phase 1: Environment Setup and Initial Discovery

#### Step 1: Environment Health Check

1. Check PM2 process status:
   ```bash
   pm2 status
   ```
2. If processes are not running, start development environment:
   ```bash
   npm run dev
   ```
3. Verify both services are accessible:
   - Frontend: http://localhost:5175
   - Backend: http://localhost:8787

#### Step 2: Initial Log Analysis

1. Check recent PM2 logs for startup issues:
   ```bash
   pm2 logs --nostream --lines 100
   ```
2. Look for:
   - Tool registration errors
   - WebSocket connection issues
   - API endpoint failures
   - Missing dependencies

#### Step 3: Tool Implementation Discovery

1. Search for viewCurrentWorkflow implementation:
   ```bash
   grep -r "viewCurrentWorkflow" --include="*.ts" --include="*.tsx" --include="*.js" src/
   ```
2. Check common locations:
   - `/src/tools/`
   - `/src/api/`
   - `/src/server.ts`
   - `/src/utils/`
3. Identify:
   - Tool definition/schema
   - Implementation function
   - Registration mechanism

### Phase 2: Integration Analysis

#### Step 4: Chat Integration Investigation

1. Examine chat components:
   - `/src/components/chat/ChatPanel.tsx`
   - Related chat UI components
2. Look for:
   - Tool invocation handling
   - Message processing
   - Tool result rendering

#### Step 5: API/WebSocket Analysis

1. Check backend server implementation:
   - WebSocket handlers
   - Tool routing
   - Request/response flow
2. Verify tool is properly exposed in API

### Phase 3: Active Debugging with Playwright

#### Step 6: Visual Reproduction

1. Start Playwright session:
   ```javascript
   await playwright.navigate({ url: "http://localhost:5175" });
   ```
2. Take initial screenshot
3. Attempt to invoke viewCurrentWorkflow through chat
4. Capture:
   - UI error messages
   - Console logs
   - Network requests

#### Step 7: Browser Console Analysis

1. Monitor browser console during tool invocation:
   ```javascript
   await playwright.console_logs();
   ```
2. Look for:
   - JavaScript errors
   - Failed API calls
   - WebSocket disconnections

### Phase 4: Root Cause Analysis

#### Step 8: Log Correlation

1. Clear logs for clean reproduction:
   ```bash
   pm2 flush
   ```
2. Monitor real-time logs while reproducing:
   ```bash
   pm2 logs
   ```
3. Correlate:
   - Frontend errors with backend logs
   - Request IDs
   - Timing of failures

#### Step 9: Identify Root Cause

Based on gathered evidence, determine if issue is:

- **Registration Problem**: Tool not properly registered
- **Implementation Bug**: Logic error in tool function
- **Integration Issue**: Communication breakdown between layers
- **Configuration Problem**: Missing environment variables or settings
- **State/Context Issue**: Tool requires specific workflow state

### Phase 5: Fix Implementation and Verification

#### Step 10: Implement Fix

1. Make necessary code changes based on root cause
2. Common fixes might include:
   - Adding missing tool registration
   - Fixing tool implementation logic
   - Correcting API endpoint routing
   - Updating WebSocket message handling

#### Step 11: Test Fix

1. Restart affected services:
   ```bash
   pm2 restart frontend  # or backend
   ```
2. Use Playwright to verify tool works:
   - Invoke tool through chat
   - Verify correct response
   - Check for visual confirmation

#### Step 12: Regression Testing

1. Run existing tests:
   ```bash
   npm run test:e2e
   ```
2. Specifically check workflow-related tests:
   ```bash
   npm run test:workflow
   ```
3. Ensure no other tools were affected

## Success Criteria

- [ ] viewCurrentWorkflow tool can be invoked without errors
- [ ] Tool returns expected workflow visualization/data
- [ ] No errors in PM2 logs during tool execution
- [ ] Existing tests continue to pass
- [ ] Browser console shows no errors

## Troubleshooting Tips

- If tool is not found in codebase, check for dynamic tool loading
- If WebSocket issues, verify connection establishment in Network tab
- If state-related, ensure a workflow exists before invoking tool
- Check for CORS issues if frontend/backend on different ports

## Documentation Updates

After fixing, update:

1. Tool documentation if implementation changed
2. CLAUDE.md if new patterns established
3. Test cases to prevent regression
