# Task Completion Checklist

## After Each Milestone

1. **Write Unit Tests**: Create small unit tests for new functionality
2. **Run Tests**: Execute `npm test` and ensure all tests pass
3. **Type Check**: Run `npm run types` to verify TypeScript compilation
4. **Visual Testing**: Open app and check for console errors using Playwright
5. **Code Quality**: Run `npm run check` for linting and formatting

## Before Completing Any Task

1. **Format & Lint**: `npm run format` and ensure `npm run check` passes
2. **Test Coverage**: Ensure new code has appropriate test coverage
3. **Type Safety**: Verify all TypeScript types compile without errors
4. **Console Clean**: Check browser console for any runtime errors
5. **Functionality Verification**: Test that implemented features work as expected

## Pre-Commit Requirements

- All tests must pass (`npm test`)
- Code must be properly formatted (`npm run format`)
- Linting must pass (`npm run check`)
- TypeScript must compile without errors
- No console errors in browser

## Important Notes

- **Never remove "problematic tests"** - debug and fix instead
- **Use console.warn** for debug statements in tests
- **Ask for help** if stuck rather than removing functionality
- **Only commit functional code** - no stubs or half-implementations
- **Follow SLC MVP approach** - simple but complete implementations

## Debugging Resources

- Use Gemini or OpenAI tools for complex debugging assistance
- Check Vitest documentation for testing issues
- Refer to Cloudflare Workers documentation for platform-specific issues
