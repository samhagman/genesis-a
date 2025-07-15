# PM2 Log Debugging Update - Simplified Approach

## Problem Statement

Agentic coding tools (like Claude Code) struggle with traditional log tailing because they need commands to complete and return results. The current approach involves complex custom scripts to read and parse logs, which adds maintenance burden and potential failure points.

## Key Insight

PM2's native commands with the `--nostream` flag solve 90% of our needs without custom scripts. This flag makes log commands exit after displaying results instead of continuously streaming.

## Simplified Implementation

### 1. PM2 Native Commands for Agents

```bash
# Non-streaming commands (perfect for agents)
pm2 logs --nostream --lines 100          # Last 100 lines, then exit
pm2 logs frontend --nostream --lines 50  # Specific service logs
pm2 logs --err --nostream                # Error logs only
pm2 logs --out --nostream                # Stdout only
pm2 logs --json --nostream               # JSON format
pm2 jlist                                # JSON status (better than pm2 status)
```

### 2. Minimal NPM Script Wrappers

```json
// package.json
{
  "scripts": {
    // Process management
    "dev:start": "pm2 start ecosystem.config.cjs",
    "dev:stop": "pm2 stop all",
    "dev:restart": "pm2 restart all",

    // Status checking
    "dev:status": "pm2 jlist",

    // Log viewing (all non-streaming)
    "dev:logs": "pm2 logs --nostream --lines 100",
    "dev:logs:frontend": "pm2 logs frontend --nostream --lines 100",
    "dev:logs:backend": "pm2 logs backend --nostream --lines 100",
    "dev:errors": "pm2 logs --err --nostream --lines 200",

    // Error context (only custom command needed)
    "dev:errors:context": "pm2 logs --nostream --lines 500 | grep -B5 -A5 -iE 'error|exception|failed'",

    // Quick health check
    "dev:health": "pm2 jlist | jq '.[] | {name: .name, status: .pm2_env.status, restarts: .pm2_env.restart_time}'"
  }
}
```

### 3. Simple ecosystem.config.cjs

```javascript
module.exports = {
  apps: [
    {
      name: "frontend",
      script: "npm",
      args: "run dev:vite",
      cwd: "./",
      max_memory_restart: "500M",
      error_file: ".logs/frontend-error.log",
      out_file: ".logs/frontend-out.log",
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
    },
    {
      name: "backend",
      script: "npm",
      args: "run dev:node",
      cwd: "./",
      max_memory_restart: "300M",
      error_file: ".logs/backend-error.log",
      out_file: ".logs/backend-out.log",
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
    },
  ],
};
```

## What We DON'T Need Anymore

- ❌ Custom log reading scripts
- ❌ Complex file parsers
- ❌ Log rotation utilities (PM2 handles this)
- ❌ Status parsing scripts
- ❌ Most utility scripts in general

## Optional Minimal Scripts

Only if absolutely needed:

1. **Error Context Finder**

```bash
#!/bin/bash
# scripts/find-errors.sh
pm2 logs --nostream --lines 1000 | grep -B5 -A5 -iE "$1"
```

2. **Time-based Filter**

```bash
#!/bin/bash
# scripts/logs-since.sh
pm2 logs --nostream --lines 5000 | awk -v time="$1" '$0 >= time'
```

## Agent Workflow Instructions

Update CLAUDE.md with:

```markdown
## Development Process

### Starting Services

\`\`\`bash
npm run dev:start # Starts all services and exits immediately
\`\`\`

### Checking Status

\`\`\`bash
npm run dev:status # Returns JSON with service health
npm run dev:health # Quick health summary
\`\`\`

### Reading Logs

\`\`\`bash
npm run dev:logs # Last 100 lines from all services
npm run dev:logs:frontend # Frontend logs only
npm run dev:errors # Recent errors only
npm run dev:errors:context # Errors with surrounding context
\`\`\`

### Debugging Workflow

1. Start services: `npm run dev:start`
2. Check health: `npm run dev:health`
3. If errors, investigate: `npm run dev:errors:context`
4. For specific service: `npm run dev:logs:frontend`
```

## Benefits

1. **Simplicity**: 90% fewer custom scripts to maintain
2. **Reliability**: Using PM2's battle-tested commands
3. **Maintainability**: No custom parsing logic to break
4. **Performance**: PM2 handles log management efficiently
5. **Agent-friendly**: All commands exit cleanly

## Implementation Steps

1. Create ecosystem.config.cjs
2. Update package.json scripts
3. Create .logs directory with .gitignore
4. Test with agent workflow
5. Update CLAUDE.md instructions
6. Remove old custom scripts

## Notes

- The `--nostream` flag is the key - it makes PM2 commands exit after displaying results
- `pm2 jlist` provides JSON output that's easier for agents to parse than `pm2 status`
- Log rotation is handled automatically by PM2
- Consider installing `pm2-logrotate` module for advanced rotation features
