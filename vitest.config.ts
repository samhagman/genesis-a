/**
 * Vitest Configuration for Cloudflare Workers Testing
 *
 * Official Cloudflare testing pattern with service binding mocks
 * This configuration enables testing of workflow agents with deterministic AI responses
 */

import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          // Essential for testing agents (official pattern)
          durableObjects: {
            AGENT: "Chat", // Maps binding name to class name in src/server.ts
          },

          // Define mock AI worker (official pattern)
          workers: [
            {
              name: "mock-ai",
              modules: true,
              scriptPath: "./tests/utils/mock-ai-worker.ts",
            },
          ],

          // Override AI binding to use mock (official pattern)
          serviceBindings: {
            AI: "mock-ai",
          },

          // Local R2 simulation for workflow storage
          r2Buckets: ["WORKFLOW_VERSIONS"],

          // KV and other bindings use local simulation by default
          // kvNamespaces: ["MY_KV"],

          // D1 databases for local testing if needed
          // d1Databases: ["DB"],

          // Enable compatibility flags for latest features
          compatibilityFlags: [
            "nodejs_compat",
            "streams_enable_constructors",
            "transformstream_enable_standard_constructor",
          ],

          // Additional bindings for comprehensive testing
          bindings: {
            // Environment variables for testing
            ENVIRONMENT: "test",
            OPENAI_API_KEY: "test-key",
            GATEWAY_BASE_URL: "http://test-gateway.local",
          },
        },

        // Enable isolated storage for proper test isolation
        isolatedStorage: true,
      },
    },

    // Setup file for all worker tests
    setupFiles: ["./tests/setup.ts"],

    // Increase timeout for integration tests that use real bindings
    testTimeout: 30000,

    // Allow console output for debugging real binding interactions
    disableConsoleIntercept: true,

    // Test file patterns
    include: [
      "test/**/*.test.ts",
      "test/**/*.integration.test.ts",
      "tests/**/*.test.ts",
      "tests/**/*.integration.test.ts",
    ],

    // Exclude component tests (they use jsdom in workspace)
    exclude: ["tests/components/**", "node_modules/**", "dist/**", ".next/**"],

    // Coverage disabled for Cloudflare Workers compatibility
    coverage: {
      enabled: false,
    },

    // Global test configuration
    globals: true,

    // Retry flaky tests
    retry: 2,

    // Fail fast on first error in CI
    bail: process.env.CI ? 1 : 0,
  },

  // Resolve aliases for imports
  resolve: {
    alias: {
      "@": "/src",
    },
  },

  // Cloudflare Workers-specific optimizations
  define: {
    __TEST__: true,
  },
});
