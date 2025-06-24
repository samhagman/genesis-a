# Suggested Commands

## Development Commands

- **Start Development**: `npm start` - Runs Vite dev server
- **Build**: `npm run deploy` - Builds and deploys to Cloudflare Workers
- **Type Check**: `npm run types` - Generates Wrangler types
- **Format Code**: `npm run format` - Formats code with Prettier
- **Check All**: `npm run check` - Runs Prettier check, Biome lint, and TypeScript compilation

## Testing Commands

- **Run Tests**: `npm test` - Runs Vitest test suite
- **Watch Tests**: `npm test -- --watch` - Runs tests in watch mode
- **Debug Tests**: `npm test -- --silent=false` - Shows console.warn debug messages

## Cloudflare Workers Commands

- **Deploy**: `npm run deploy` - Builds and deploys to Cloudflare Workers
- **Generate Types**: `npm run types` - Generates Wrangler types for bindings
- **Local Development**: `npm start` - Runs local development server with Vite

## Useful System Commands (macOS/Darwin)

- **List Files**: `ls -la`
- **Find Files**: `find . -name "*.ts" -o -name "*.tsx"`
- **Search Code**: `grep -r "pattern" src/`
- **Git Status**: `git status`
- **Git Diff**: `git diff`

## Test Debugging

- Use `console.warn()` for debug statements in tests
- Run with `--silent=false` to see console output
- Component tests run in jsdom environment
- Server tests run in workers environment
