import path from "node:path";
import { defineWorkspace } from "vitest/config";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkspace([
  // Component tests with jsdom
  {
    test: {
      name: "jsdom",
      include: ["tests/components/**/*.test.tsx"],
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      disableConsoleIntercept: true,
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
      include: [
        "tests/**/*.test.ts",
        "tests/**/*.integration.test.ts"
      ],
      exclude: ["tests/components/**"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          // Enable isolated storage for proper test isolation
          isolatedStorage: true,
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
