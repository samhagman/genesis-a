import path from "node:path";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import { defineWorkspace } from "vitest/config";

// Fix Node EventEmitter memory leak warnings from tinypool workers
if (typeof process !== "undefined" && process.setMaxListeners) {
  process.setMaxListeners(0); // Unlimited listeners for main process
}

export default defineWorkspace([
  // Component tests with jsdom
  {
    test: {
      name: "jsdom",
      include: ["tests/components/**/*.test.tsx"],
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      disableConsoleIntercept: true,
      // Limit workers to prevent socket listener accumulation
      pool: "threads",
      poolOptions: {
        threads: {
          minThreads: 1,
          maxThreads: 4,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },
  // Unified Workers runtime tests (unit + integration)
  defineWorkersConfig({
    test: {
      name: "workers",
      include: ["tests/**/*.test.ts", "tests/**/*.integration.test.ts"],
      exclude: ["tests/components/**"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          // Enable isolated storage for proper test isolation
          isolatedStorage: true,
          // Limit workers to prevent socket listener accumulation
          minWorkers: 1,
          maxWorkers: 4,
        },
      },
      // Setup file for all worker tests
      setupFiles: ["./tests/workers-setup.ts"],
      // Increase timeout for integration tests that use real bindings
      testTimeout: 30000,
      // Allow console output for debugging real binding interactions
      disableConsoleIntercept: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }),
]);
