import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import naive from 'naive-ui';
import './assets/global.css';
import { initTheme } from './composables/useTheme.js';

// 主题初始化（在挂载前同步执行，避免 FOUC）
initTheme();
import 'vfonts/Lato.css';

// === Markdown 编辑器 ===
import VueMarkdownEditor from '@kangc/v-md-editor';
import '@kangc/v-md-editor/lib/style/base-editor.css';

// === Markdown 预览组件 ===
import VMdPreview from '@kangc/v-md-editor/lib/preview';
import '@kangc/v-md-editor/lib/style/preview.css';

// === 主题 ===
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js';
import '@kangc/v-md-editor/lib/theme/style/github.css';

// === Highlight.js 语法高亮 ===
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // 选择你喜欢的样式

// === 注册主题，使用 highlight.js ===
VueMarkdownEditor.use(githubTheme, { Hljs: hljs });
VMdPreview.use(githubTheme, { Hljs: hljs });

createApp(App)
    .use(createPinia())
    .use(naive)
    .use(router)
    .use(VueMarkdownEditor) // 注册编辑器
    .use(VMdPreview)        // 注册预览组件
    .mount('#app');
