# Comprehensive npm Scripts Cleanup Plan

## Project Architecture Analysis

After reviewing the entire codebase, this is a sophisticated Cloudflare Workers + React application with:

- **Frontend**: Vite + React 19 + TypeScript (served on 5175)
- **Backend**: Cloudflare Workers with Durable Objects (served on 8787)
- **Testing**: Complex vitest workspace (jsdom + workers-unit + workers-integration) + Playwright E2E
- **Deployment**: Multi-environment Cloudflare deployment (dev/staging/production)
- **AI Integration**: OpenAI + Cloudflare AI bindings

## Current Problems

1. **Process Management Chaos**: Mix of concurrently + manual pm2 + orphaned processes
2. **Script Redundancy**: `dev`, `start`, `debug` doing similar things with inconsistent behavior
3. **Poor AI Assistant UX**: No easy way to inspect running processes, view logs, or clean up
4. **Inconsistent Development Workflow**: README says `npm start` but current setup needs `npm run dev`

## Proposed Solution

### 1. Create PM2 Ecosystem Config

**New file**: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: "frontend",
      script: "vite",
      args: "dev --port 5175",
      cwd: process.cwd(),
      env: { NODE_ENV: "development" },
    },
    {
      name: "backend",
      script: "wrangler",
      args: "dev --local --port 8787",
      cwd: process.cwd(),
      env: { NODE_ENV: "development" },
    },
  ],
};
```

### 2. Clean Package.json Scripts

**Replace existing messy scripts with organized categories:**

```json
{
  "scripts": {
    // === DEVELOPMENT (Primary Workflow) ===
    "dev": "pm2 start ecosystem.config.js",
    "dev:stop": "pm2 stop ecosystem.config.js",
    "dev:restart": "pm2 restart ecosystem.config.js",
    "dev:logs": "pm2 logs",
    "dev:status": "pm2 status",
    "dev:clean": "pm2 kill && pkill -f 'vite|wrangler' || true",

    // === INDIVIDUAL SERVICES (For Playwright/Testing) ===
    "dev:frontend": "vite dev --port 5175",
    "dev:backend": "wrangler dev --local --port 8787",
    "dev:backend:remote": "wrangler dev --remote --port 8787",
    "dev:backend:mock-ai": "wrangler dev --local --binding AI=mock-ai --port 8787",

    // === TESTING ===
    "test": "vitest",
    "test:unit": "vitest run --workspace tests",
    "test:components": "vitest run --project jsdom",
    "test:workers": "vitest run --project workers-unit",
    "test:integration": "vitest run --project workers-integration",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:expensive": "vitest run tests/integration-cost-money.test.ts",
    "test:all": "npm run test && npm run test:e2e",

    // === BUILD & DEPLOY ===
    "build": "wrangler deploy --dry-run",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",

    // === UTILITIES ===
    "clean": "npm run dev:clean && rm -rf node_modules/.vite dist coverage test-results",
    "types": "wrangler types",
    "format": "prettier --write .",
    "check": "prettier . --check && biome lint && tsc"
  }
}
```

### 3. Update Dependencies

**Add to devDependencies:**

- `pm2: ^5.3.0` (for process management)

**Remove from devDependencies:**

- `concurrently` (replaced by pm2)

### 4. Maintain Playwright Compatibility

**No changes needed** - Playwright config already uses `dev:frontend` and `dev:backend` which work perfectly with the new structure.

### 5. Update README Development Section

**Replace current instructions:**

````markdown
## Getting Started

1. Install dependencies:

```bash
npm install
```
````

2. Start development environment:

```bash
npm run dev
```

3. View logs and status:

```bash
npm run dev:logs    # View live logs
npm run dev:status  # Check running services
```

4. Stop development:

```bash
npm run dev:stop    # Graceful stop
npm run dev:clean   # Nuclear cleanup
```

```

## Benefits for Claude Code

✅ **Non-blocking Commands**: `pm2 start` returns immediately, no hanging terminals
✅ **Easy Process Inspection**: `npm run dev:status` shows what's running
✅ **Live Logging**: `npm run dev:logs` for real-time debugging
✅ **Clean Shutdown**: `npm run dev:stop` kills processes properly
✅ **Nuclear Option**: `npm run dev:clean` for complete cleanup
✅ **No Orphaned Processes**: PM2 manages full lifecycle
✅ **Clear Organization**: Commands grouped by purpose and complexity

## Backward Compatibility

- ✅ Playwright tests continue working (uses individual service commands)
- ✅ Vitest workspace unchanged (comprehensive test architecture preserved)
- ✅ Deployment workflow unchanged (wrangler-based)
- ✅ All existing development patterns maintained

## Key Improvements

1. **Single Source of Truth**: `ecosystem.config.js` defines all development services
2. **AI-Friendly Process Management**: Easy inspection, logging, and cleanup
3. **Consistent Development Experience**: `npm run dev` always works
4. **Clear Command Categories**: Development, testing, deployment, utilities
5. **No More Process Leaks**: PM2 ensures clean process lifecycle
6. **Simplified Debugging**: Centralized logging and status checking

This plan transforms a chaotic script setup into a professional, AI-assistant-friendly development environment while preserving all existing functionality and deployment patterns.

## Implementation Steps

1. Create `ecosystem.config.js` file
2. Install `pm2` dependency and remove `concurrently`
3. Replace package.json scripts with organized structure
4. Update README.md development section
5. Test the new workflow to ensure everything works
6. Commit the changes

## Notes

- This maintains the existing dual-server architecture (frontend on 5175, backend on 8787)
- Playwright tests will continue to work without modification
- All existing test and deployment workflows are preserved
- The new structure is much more maintainable and AI-assistant friendly
```
