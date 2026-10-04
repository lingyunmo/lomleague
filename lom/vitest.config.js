import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Public-root assets remain HTTP paths, not Windows file:/// imports in tests.
  plugins: [vue({ template: { transformAssetUrls: { includeAbsolute: false } } })],
  server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  test: { environment: 'jsdom', include: ['src/**/*.test.js'] },
});
