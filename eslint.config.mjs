// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/', 'node_modules/', 'playwright-report/', 'test-results/', 'blob-report/'],
  },
  {
    files: ['**/*.{js,mjs,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    // SPEC-001 §5: the rules engine is pure TypeScript and never touches the DOM.
    // checkGlobalObject also catches globalThis.document etc.; globalThis.crypto stays allowed.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          globals: ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'self'].map(
            (name) => ({ name, message: 'src/engine must not use DOM globals (SPEC-001 §5).' }),
          ),
          checkGlobalObject: true,
        },
      ],
    },
  },
  {
    // SPEC-001 §5: UI code reaches the engine only through src/engine/index.ts.
    files: ['src/ui/**/*.ts', 'src/main.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/engine/*', '!**/engine/index', '!**/engine/index.ts'],
              message: 'Import the engine from src/engine/index.ts only (SPEC-001 §5).',
            },
          ],
        },
      ],
    },
  },
);
