import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

const uiImports = {
  group: ['react', 'react/*', 'react-dom', 'react-dom/*', '@overseer/web', '@overseer/web/*'],
  message: 'Keep the core independent of the user interface.',
};

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    'fixtures/**',
    'artifacts/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['packages/core/src/ai/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [uiImports] }],
    },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    ignores: ['packages/core/src/ai/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            uiImports,
            {
              group: [
                'node:http',
                'node:https',
                'node:http2',
                'node:net',
                'node:tls',
                'http',
                'https',
                'http2',
                'net',
                'tls',
                'axios',
                'undici',
                'node-fetch',
              ],
              message: 'Network clients belong only in src/ai/ and require explicit API mode.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Network calls belong only in src/ai/.' },
        { name: 'WebSocket', message: 'Network calls belong only in src/ai/.' },
      ],
    },
  },
);
