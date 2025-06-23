# Genesis - Workflow Visualization Platform

A modern workflow visualization application built on Cloudflare Workers, designed to help teams visualize, track, and manage complex workflows with interactive progress monitoring.

## Features

- 📊 Interactive workflow visualization with goal and subtask mapping
- 🎯 Real-time progress tracking and status indicators
- 🔍 Detailed inspector panels for workflow elements
- 🌓 Dark/Light theme support
- ⚡️ Fast, responsive UI built with React and TypeScript
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
│   ├── app.tsx              # Main application component
│   ├── components/          # React components
│   │   ├── workflow/        # Workflow visualization components
│   │   ├── inspector/       # Detail inspector panels
│   │   └── layout/          # Layout components
│   ├── types/               # TypeScript type definitions
│   ├── workflows/           # Workflow data and templates
│   └── utils/               # Utility functions
├── tests/                   # Test suites
└── _planning-docs/          # Project planning documentation
```

## Architecture

This application is built on Cloudflare Workers and uses:

- **Frontend**: React with TypeScript for component-based UI
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React hooks for workflow state
- **Testing**: Vitest and React Testing Library
- **Deployment**: Cloudflare Workers for edge computing

## Workflow Features

### Visualization

- Multi-goal workflow representation
- Hierarchical goal and subtask structure
- Progress flow indicators between workflow stages
- Color-coded status highlighting

### Progress Tracking

- Real-time status updates (Completed, In Progress, Pending)
- Visual progress indicators and completion metrics
- Detailed progress summaries in inspector panels

### Interactive Navigation

- Click-to-select goals and subtasks
- Dynamic inspector panel updates
- Three-panel layout for optimal workflow viewing

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run types
```

### Linting and Formatting

```bash
npm run check
npm run format
```

## Cloudflare Deployment

This application is optimized for Cloudflare Workers:

- Edge computing for global performance
- Serverless architecture with instant scaling
- Built-in observability and monitoring
- Integrated with Cloudflare's development tools

To deploy:

1. Configure your Cloudflare account
2. Update `wrangler.jsonc` with your project settings
3. Run `npm run deploy`

## Contributing

This project follows TypeScript best practices and includes comprehensive testing. Please ensure all tests pass and types compile before submitting changes.
