import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { registerMarkdown } from './components/markdown/registerMarkdown.js';
import './assets/global.css';
import { initTheme } from './composables/useTheme.js';

// 主题初始化（在挂载前同步执行，避免 FOUC）
initTheme();
import 'vfonts/Lato.css';

const app = createApp(App).use(createPinia()).use(router);
registerMarkdown(app);
app.mount('#app');
