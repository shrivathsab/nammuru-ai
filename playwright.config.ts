import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'smoke/**/*.spec.ts'],
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Playwright owns the dev server in every environment — it starts it, waits
  // for it to respond, and shuts it down. This is far more reliable in CI than
  // backgrounding `npm run dev &` across separate workflow steps.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000, // cold Turbopack compile of the first route can be slow in CI
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
