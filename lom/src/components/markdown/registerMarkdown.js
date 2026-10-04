import { defineAsyncComponent } from 'vue';

export function registerMarkdown(app) {
  app.component(
    'v-md-editor',
    defineAsyncComponent(() => import('./MarkdownEditor.vue')),
  );
  app.component(
    'v-md-preview',
    defineAsyncComponent(() => import('./MarkdownPreview.vue')),
  );
}
