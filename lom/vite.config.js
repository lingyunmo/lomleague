import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import * as path from 'node:path';
import packageInfo from '../package.json' with { type: 'json' };

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), Components({ resolvers: [NaiveUiResolver()], dts: false })],
  define: {
    __APP_VERSION__: JSON.stringify(packageInfo.version),
  },
  server: {
    allowedHosts: ['frp-can.com'],
    host: '0.0.0.0',
    port: 5173,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        xfwd: false,
        rewrite: (path) => path,
        secure: false, // 允许代理到非 HTTPS 服务
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
