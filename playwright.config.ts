import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Genesis Workflow App
 *
 * This configuration sets up end-to-end testing for the workflow chat interface,
 * testing both the Vite frontend and Cloudflare Workers backend.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Generate HTML report but don't auto-open in browser to avoid tab spam during development
  reporter: [["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:5175",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  webServer: [
    {
      command: "npm run dev:frontend",
      port: 5175,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: "npm run dev:backend",
      port: 8787,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
