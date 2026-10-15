import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the game at https://oldliuwill.github.io/Blackjack/ (SPEC-001 §10.4).
  base: '/Blackjack/',
  test: {
    // Vitest owns unit and acceptance tests only; tests/e2e belongs to Playwright.
    include: ['tests/unit/**/*.test.ts', 'tests/acceptance/**/*.test.ts'],
    environment: 'node',
  },
});
