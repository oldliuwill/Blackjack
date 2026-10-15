import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest owns unit and acceptance tests only; tests/e2e belongs to Playwright.
    include: ['tests/unit/**/*.test.ts', 'tests/acceptance/**/*.test.ts'],
    environment: 'node',
  },
});
