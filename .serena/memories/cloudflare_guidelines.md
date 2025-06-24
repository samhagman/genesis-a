# Cloudflare Workers Guidelines

## Configuration

- **Main Entry**: `src/server.ts`
- **Compatibility Date**: 2025-05-07
- **Compatibility Flags**: `nodejs_compat`, `nodejs_compat_populate_process_env`
- **Assets Directory**: `public/`
- **Observability**: Enabled

## Durable Objects

- **Chat Class**: Configured as Durable Object for AI chat functionality
- **Migrations**: V1 migration with Chat as new SQLite class

## Development Guidelines

1. **Check Cloudflare Rules**: Always refer to `_CLAUDE_RULES/cloudflare.txt` first
2. **ES Modules Only**: Never use Service Worker format
3. **TypeScript Default**: Use TypeScript unless JavaScript specifically requested
4. **Single File Preference**: Keep code in single file unless otherwise specified
5. **Minimal Dependencies**: Avoid libraries with FFI/native/C bindings
6. **Security**: Never bake secrets into code, use environment variables

## Architecture Patterns

- **Agent SDK**: Uses Cloudflare agents SDK for AI functionality
- **State Management**: Leverages Durable Objects for persistent state
- **WebSocket Support**: Uses hibernatable WebSocket API
- **Static Assets**: Serves frontend from Workers Static Assets

## Key Bindings

- **Chat**: Durable Object binding for chat functionality
- **Environment Variables**: Configure via wrangler.jsonc vars section

## Best Practices

- Include proper error handling and logging
- Add appropriate TypeScript types and interfaces
- Follow Cloudflare Workers security best practices
- Use appropriate caching strategies
- Consider Workers limits and quotas
