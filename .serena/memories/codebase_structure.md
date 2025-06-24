# Codebase Structure

## Directory Layout

```
├── src/
│   ├── app.tsx              # Main application component
│   ├── client.tsx           # Client-side entry point
│   ├── server.ts            # Cloudflare Workers server entry
│   ├── components/          # React components
│   │   ├── workflow/        # Workflow visualization components
│   │   ├── inspector/       # Detail inspector panels
│   │   ├── layout/          # Layout components
│   │   ├── chat/            # AI chat functionality
│   │   ├── development/     # Development tools (scenario switcher)
│   │   └── ui/              # Generic UI components (buttons, inputs, etc.)
│   ├── state/               # State management
│   │   ├── workflowStore.ts # Zustand workflow store
│   │   ├── instanceFactory.ts # Workflow instance creation
│   │   ├── hooks.ts         # Custom React hooks
│   │   └── mockScenarios.ts # Test scenarios
│   ├── types/               # TypeScript type definitions
│   │   ├── workflow-v2.ts   # V2 workflow types
│   │   ├── workflow-instance.ts # Runtime instance types
│   │   ├── components.ts    # Component prop types
│   │   └── state.ts         # State types
│   ├── utils/               # Utility functions
│   │   ├── status.ts        # Status styling utilities
│   │   └── selection.ts     # Selection handling
│   ├── workflows/           # Workflow data and templates
│   ├── providers/           # React context providers
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Library utilities
├── tests/                   # Test suites
│   ├── components/          # Component tests (jsdom)
│   └── server/              # Server tests (workers)
├── public/                  # Static assets
├── _planning-docs/          # Project planning documentation
└── _CLAUDE_RULES/           # Development guidelines
```

## Key Files

- **app.tsx**: Main React application with three-panel layout
- **server.ts**: Cloudflare Workers entry point with Durable Objects
- **workflowStore.ts**: Central state management with Zustand
- **workflow-v2.ts**: Core workflow type definitions
- **vitest.workspace.ts**: Test configuration for components and workers

## Component Architecture

- **Three-panel layout**: Workflow panel, inspector panel, chat panel
- **Goal-based workflows**: Goals contain tasks, forms, policies, constraints
- **State-driven UI**: Components react to workflow state changes
- **Theme support**: Dark/light mode throughout

## State Management Pattern

- **Zustand store**: Central workflow state
- **Instance factory**: Creates workflow instances from templates
- **Mock scenarios**: Different execution states for development
- **React hooks**: Custom hooks for accessing specific state slices
