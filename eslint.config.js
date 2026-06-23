/**
 * ESLint 平面配置 — 前后端共享
 * 解决 Issue #16: 无 ESLint
 */
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/upload/**',
      '**/logs/**',
      '**/public/**',
      '**/prisma/migrations/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-undef': 'error',
    },
  },
];
