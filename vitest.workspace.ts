import path from "node:path";
import { defineWorkspace } from "vitest/config";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkspace([
  // Component tests with jsdom
  {
    test: {
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
  // Server tests with workers (preserving original config)
  defineWorkersConfig({
    environments: {
      ssr: {
        keepProcessEnv: true,
      },
    },
    test: {
      include: ["tests/**/*.test.ts"],
      exclude: ["tests/components/**"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }),
]);
