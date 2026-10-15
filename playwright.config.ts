import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  // Playwright owns tests/e2e only; Vitest owns tests/unit and tests/acceptance.
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Runs against the production build; verify.ps1 runs `vite build` first.
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
  },
});
