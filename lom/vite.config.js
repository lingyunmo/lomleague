import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from "node:path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        allowedHosts: ["frp-can.com"],
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                xfwd: true,
                rewrite: (path) => path,
                secure: false,  // 允许代理到非 HTTPS 服务
            },
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
})