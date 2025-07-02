# Expensive Integration Tests

The tests in `integration-cost-money.test.ts` use **real Cloudflare services** and **external APIs** that incur actual costs.

## Quick Start

**Before running expensive tests, validate your setup:**

```bash
# Check if everything is configured correctly
npm run test:expensive:validate
```

If validation passes, you can safely run:

```bash
# Run the expensive tests (COSTS MONEY!)
npm run test:expensive
```

## Prerequisites

### 1. Environment Variables

Your `.dev.vars` file already exists and contains:

```bash
OPENAI_API_KEY=sk-your-openai-key-here
```

### 2. Cloudflare Account Setup

- Valid Cloudflare account with sufficient credits
- AI Workers usage allowance
- R2 storage bucket configured

### 3. Real Bindings Configuration

Your `wrangler.jsonc` already has real bindings configured:

- `AI` binding for Cloudflare AI inference
- `WORKFLOW_VERSIONS` R2 bucket for persistence
- `AGENT` Durable Object namespace for state management

## Running the Tests

```bash
# 1. Validate setup first (recommended)
npm run test:expensive:validate

# 2. If validation passes, run expensive tests
npm run test:expensive

# 3. Or run directly with vitest
npx vitest run tests/integration-cost-money.test.ts
```

## What These Tests Cover

The 11 expensive tests verify:

1. **Real AI Integration** - Actual OpenAI/Cloudflare AI calls
2. **Durable Object Persistence** - Real DO storage/retrieval
3. **R2 Storage** - Actual workflow version persistence
4. **End-to-End Workflows** - Complete user journeys
5. **Error Handling** - Real network failures
6. **Human-in-the-Loop** - Confirmation flows
7. **Multi-step Operations** - Complex workflow building
8. **State Management** - Cross-session persistence

## Cost Estimation

- ~$0.50-2.00 per full test run
- Mostly from OpenAI API calls
- Minimal Cloudflare service costs

## Setup Status

✅ **Credentials:** OpenAI API key already configured in `.dev.vars`
✅ **Bindings:** Real Cloudflare bindings already configured in `wrangler.jsonc`
✅ **Tests:** Updated to use real services (no mocking)
✅ **Validation:** Setup validation script available

## Next Steps

1. **Validate Setup:**

   ```bash
   npm run test:expensive:validate
   ```

2. **Upload Secrets (if running remotely):**

   ```bash
   wrangler secret bulk .dev.vars
   ```

3. **Test Bindings:**

   ```bash
   wrangler dev --local # Check for binding errors
   ```

4. **Run Expensive Tests:**
   ```bash
   npm run test:expensive
   ```

The tests are now ready to connect to real services and validate the complete workflow integration end-to-end.
