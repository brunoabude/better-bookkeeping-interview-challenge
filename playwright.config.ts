import { defineConfig, devices } from "@playwright/test";

// When DATABASE_URL_TEST is set (test isolation mode), the app starts locally on port 3902
// (vite's internal port). In Docker mode without DATABASE_URL_TEST, the app is exposed on 3000.
const appPort = process.env.DATABASE_URL_TEST ? 3902 : 3000;
const appURL = `http://localhost:${appPort}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: appURL,
    storageState: "./e2e/.auth/user.json",
    trace: "on-first-retry",
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.DATABASE_URL_TEST
      ? `DATABASE_URL=${process.env.DATABASE_URL_TEST} COOKIE_SECRET=${process.env.COOKIE_SECRET ?? "test-secret"} node_modules/.bin/vite dev`
      : "bun run dev",
    url: appURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
