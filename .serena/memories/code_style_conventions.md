# Code Style & Conventions

## TypeScript Configuration

- **Target**: ES2021
- **Module**: ES2022 with Bundler resolution
- **JSX**: react-jsx
- **Strict Mode**: Enabled
- **Path Aliases**: `@/*` maps to `./src/*`
- **No Emit**: true (build handled by Vite)
- **No Unused Locals**: true

## Code Formatting & Linting

### Prettier Configuration

- **Trailing Commas**: ES5 style
- **Quote Style**: Double quotes (via Biome)

### Biome Configuration

- **Linter**: Enabled with recommended rules
- **Organizer**: Auto-organize imports enabled
- **Formatter**: Disabled (Prettier handles formatting)
- **Quote Style**: Double quotes
- **Indent Style**: Tabs
- **Non-null assertion**: Disabled

## Project Structure Conventions

- **Components**: Organized by feature/domain in `src/components/`
- **Types**: Separate type files in `src/types/`
- **State**: Centralized in `src/state/` with Zustand
- **Utils**: Helper functions in `src/utils/`
- **Workflows**: Workflow definitions in `src/workflows/`

## File Naming

- **Components**: PascalCase (e.g., `GoalCard.tsx`)
- **Utilities**: camelCase (e.g., `status.ts`)
- **Types**: descriptive names (e.g., `workflow-v2.ts`)
- **Tests**: `.test.tsx` or `.test.ts` suffix

## Import Conventions

- Use absolute imports with `@/` alias
- Organize imports automatically via Biome
- ES modules format exclusively

## Cloudflare Workers Specific

- Use ES modules format (never Service Worker format)
- TypeScript by default
- Proper error handling and logging
- Include appropriate TypeScript types
- Follow Cloudflare Workers security best practices
