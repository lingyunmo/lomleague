/**
 * ESLint 平面配置 — 前后端共享
 * 解决 Issue #16: 无 ESLint
 */
import js from '@eslint/js';
import globals from 'globals';
import vue from 'eslint-plugin-vue';

export default [
  js.configs.recommended,
  ...vue.configs['flat/essential'],
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
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        __APP_VERSION__: 'readonly',
      },
    },
    rules: {
      // Existing route/component filenames are public maintenance conventions.
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-undef': 'error',
    },
  },
];
