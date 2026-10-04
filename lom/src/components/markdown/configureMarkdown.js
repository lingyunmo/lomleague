import { config } from 'md-editor-v3';
import hljs from 'highlight.js/lib/common';
import screenfull from 'screenfull';
import lightCss from 'highlight.js/styles/github.css?url';
import darkCss from 'highlight.js/styles/github-dark.css?url';

// Use local bundled assets instead of runtime third-party script injection.
config({
  markdownItConfig: (md) => md.set({ html: true }),
  editorExtensions: {
    highlight: { instance: hljs, css: { lom: { light: lightCss, dark: darkCss } } },
    screenfull: { instance: screenfull },
  },
});
