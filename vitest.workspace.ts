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
      // Component tests now run in parallel (socket listener issue fixed by process.setMaxListeners(0) above)
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },
  // Workers unit tests (fast, no real bindings)
  defineWorkersConfig({
    test: {
      name: "workers-unit",
      include: ["tests/**/*.test.ts"],
      exclude: [
        "tests/components/**",
        "**/*.integration.test.ts",
        "**/integration-cost-money.test.ts",
      ],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          isolatedStorage: true,
        },
      },
      setupFiles: ["./tests/workers-setup.ts"],
      testTimeout: 30000,
      disableConsoleIntercept: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }),
  // Workers integration tests (slow, uses real bindings)
  defineWorkersConfig({
    test: {
      name: "workers-integration",
      include: ["tests/**/*.integration.test.ts"],
      exclude: ["**/integration-cost-money.test.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          isolatedStorage: true,
        },
      },
      setupFiles: ["./tests/workers-setup.ts"],
      testTimeout: 90000, // Longer timeout for integration tests
      disableConsoleIntercept: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }),
]);
