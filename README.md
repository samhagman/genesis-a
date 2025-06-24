# Genesis - Workflow Visualization Platform

A modern workflow visualization application built on Cloudflare Workers, designed to help teams visualize, track, and manage complex workflows with comprehensive business logic, AI agent integration, and interactive progress monitoring.

## Features

### V2 Workflow Schema

- 🏗️ **Goals with Rich Business Logic**: Enhanced goals containing constraints, policies, tasks, and forms
- 🛡️ **Constraints**: Declarative rules and guardrails (time limits, data validation, business rules, rate limits)
- 🧠 **Policies**: If-then logic for automated decision-making and workflow routing
- 🤖 **Tasks**: Work assignments for AI agents and humans with dependency management
- 📝 **Forms**: Structured, conversational, and automated data collection mechanisms

### Visualization & Interaction

- 📊 Interactive workflow visualization with comprehensive element inspection
- 🎯 Real-time progress tracking with enhanced status indicators
- 🔍 Multi-tabbed inspector panels for detailed element examination
- 🌓 Dark/Light theme support with consistent design language
- ⚡️ Fast, responsive UI built with React 19 and TypeScript
- 🏗️ Built on Cloudflare Workers for global performance

## Prerequisites

- Cloudflare account (for deployment)
- Node.js and npm

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run locally:

```bash
npm start
```

3. Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Project Structure

```
├── src/
│   ├── app.tsx                    # Main application component
│   ├── components/                # React components
│   │   ├── workflow/              # V2 workflow visualization components
│   │   │   ├── GoalCardV2.tsx     # Enhanced goal cards with collapsible sections
│   │   │   ├── ConstraintList.tsx # Constraint display with type-specific styling
│   │   │   ├── PolicyList.tsx     # Policy visualization with if-then logic
│   │   │   ├── TaskList.tsx       # Task assignments with assignee types
│   │   │   └── FormList.tsx       # Form collection with complexity indicators
│   │   ├── inspector/             # Enhanced detail inspector panels
│   │   └── layout/                # Layout components
│   ├── types/                     # TypeScript type definitions
│   │   ├── workflow-v2.ts         # Complete V2 schema types
│   │   └── components.ts          # Component prop interfaces
│   ├── workflows/                 # V2 workflow data and templates
│   │   ├── instawork-shift-filling.json    # Complex example workflow
│   │   ├── employee-onboarding-v2.json     # Converted V2 workflow
│   │   └── index.ts               # Enhanced workflow loader with error handling
│   ├── utils/                     # Utility functions
│   │   ├── schema-validation.ts   # Runtime V2 schema validation
│   │   └── error-handling.ts      # Comprehensive error handling
│   └── state/                     # State management for workflow instances
├── tests/                         # Comprehensive test suites
│   ├── components/workflow/       # Component tests for V2 elements
│   ├── integration/               # Workflow loading integration tests
│   └── utils/                     # Utility function tests
└── _planning-docs/                # V2 development planning documentation
```

## Architecture

This application is built on Cloudflare Workers and uses:

- **Frontend**: React 19 with TypeScript for modern component-based UI
- **Styling**: Tailwind CSS v4.1 for responsive design and theming
- **State Management**: Zustand for workflow instance state management
- **Testing**: Vitest with dual environments (jsdom for components, workers for server)
- **Validation**: Runtime schema validation with comprehensive error handling
- **Deployment**: Cloudflare Workers with Durable Objects for persistent state
- **AI Integration**: OpenAI SDK and Cloudflare Agents SDK for AI task assignments

## Workflow Features

### V2 Schema Capabilities

#### Enhanced Goal Structure

- **Rich Business Logic**: Goals contain constraints, policies, tasks, and forms
- **Declarative Constraints**: Time limits, data validation, business rules, access control
- **Automated Policies**: If-then logic for dynamic workflow routing and decision-making
- **Task Assignment**: Support for both AI agents and human workers with dependency management
- **Data Collection**: Structured forms, conversational agents, and automated data gathering

#### Comprehensive Visualization

- **Multi-layered Display**: Goals with expandable sections for each element type
- **Type-specific Styling**: Color-coded visualization for constraints (red), policies (green), tasks (purple), forms (orange)
- **Status Indicators**: Enhanced status system for each workflow element type
- **Complexity Metrics**: Visual indicators for goal complexity and execution requirements

#### Advanced Inspection

- **Tabbed Inspector**: Detailed views for goals, constraints, policies, tasks, and forms
- **Constraint Analysis**: Type-specific displays with enforcement level indicators
- **Policy Logic**: If-then condition visualization with action outcome previews
- **Task Details**: Assignee information, capabilities, dependencies, and SLA tracking
- **Form Structure**: Schema visualization, field definitions, and completion tracking

#### Workflow Intelligence

- **AI Agent Integration**: Task assignments to AI models with capability matching
- **Human Task Routing**: Role-based task assignment with skill requirements
- **Automated Decision Making**: Policy-driven workflow progression
- **Data Validation**: Real-time constraint checking and enforcement

### Interactive Navigation

- **Hierarchical Selection**: Click to inspect goals, then drill down to specific elements
- **Dynamic Panel Updates**: Inspector panel adapts to selected element type
- **Three-panel Layout**: Chat interface, workflow visualization, and detailed inspection
- **Collapsible Sections**: Organized display of complex workflow elements

## Development

### Running Tests

```bash
npm test              # Run all tests (component + integration + unit)
npm test -- --watch   # Run tests in watch mode
```

The test suite includes:

- **Component Tests**: React Testing Library tests for all V2 workflow components
- **Integration Tests**: Workflow loading and validation tests
- **Unit Tests**: Schema validation, error handling, and utility function tests
- **Dual Test Environments**: jsdom for component tests, Cloudflare Workers for server tests

### Type Checking

```bash
npm run types         # Generate Cloudflare Workers types
npm run check         # Full linting and type checking
```

### Code Quality

```bash
npm run format        # Format code with Prettier
npm run check         # Lint with Biome + type check with TypeScript
```

## Cloudflare Deployment

This application is optimized for Cloudflare Workers with advanced features:

- **Edge Computing**: Global performance with edge-side rendering
- **Durable Objects**: Persistent state for chat functionality and workflow instances
- **WebSocket Support**: Real-time updates with hibernation API
- **Serverless Architecture**: Instant scaling with zero cold starts
- **Built-in Observability**: Comprehensive monitoring and logging
- **AI Integration**: Native support for Cloudflare AI and external AI services

### Deployment Configuration

The application includes:

- **Durable Objects**: Chat class for persistent WebSocket connections
- **Static Assets**: Frontend application hosting
- **Environment Variables**: Secure configuration management
- **Compatibility Flags**: Node.js compatibility for AI SDK integration

To deploy:

1. Configure your Cloudflare account and zone
2. Update `wrangler.jsonc` with your project settings
3. Set required environment variables (AI API keys, etc.)
4. Run `npm run deploy`

### Production Considerations

- **Performance**: Edge-side workflow visualization with sub-100ms response times
- **Scalability**: Automatic scaling for concurrent workflow processing
- **Reliability**: Built-in error handling and retry logic for workflow operations
- **Security**: Secure AI API integration with environment-based secrets

## V2 Workflow Schema

Genesis V2 introduces a sophisticated workflow schema that moves beyond simple goal-subtask hierarchies to support complex business workflows with AI integration.

### Schema Elements

#### Goals

Enhanced workflow objectives that contain:

- **Constraints**: Declarative rules and guardrails
- **Policies**: If-then logic for automated decision-making
- **Tasks**: Work assignments for AI agents and humans
- **Forms**: Data collection mechanisms

#### Constraints

Boundaries and rules that govern workflow execution:

- `time_limit`: Execution time boundaries
- `data_validation`: Input/output validation rules
- `business_rule`: Domain-specific requirements
- `rate_limit`: Frequency and volume controls
- `access_control`: Permission and security rules

#### Policies

Automated decision-making logic:

- **Condition Evaluation**: Complex if-then-else logic
- **Action Triggering**: Automated responses to workflow state
- **Routing Logic**: Dynamic workflow path selection
- **Integration Points**: External system interactions

#### Tasks

Work assignments with intelligent routing:

- **AI Agent Tasks**: Assignments to AI models with capability matching
- **Human Tasks**: Role-based assignments with skill requirements
- **Dependencies**: Task ordering and prerequisite management
- **SLA Tracking**: Timeout and escalation management

#### Forms

Data collection with multiple interaction modes:

- **Structured Forms**: Traditional form-based data collection
- **Conversational Forms**: AI-powered chat-based data gathering
- **Automated Forms**: System-generated data collection

### Example Workflows

- **InstaWork Shift Filling**: Complex 3-goal workflow with 13 constraints, 13 policies, 13 tasks, and 7 forms
- **Employee Onboarding V2**: Comprehensive onboarding process with automated task routing

## Contributing

This project follows TypeScript best practices and includes comprehensive testing for the V2 workflow schema:

1. **Schema Compliance**: All workflow data must validate against the V2 schema
2. **Component Testing**: New components require comprehensive test coverage
3. **Error Handling**: Robust error handling for malformed workflow data
4. **Type Safety**: Strong typing throughout the application

Please ensure all tests pass, types compile, and the linter is satisfied before submitting changes:

```bash
npm test && npm run check
```
