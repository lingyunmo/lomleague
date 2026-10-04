<template>
  <MdPreview
    :model-value="text"
    :theme="darkMode ? 'dark' : 'light'"
    :sanitize="sanitizeHtml"
    code-theme="lom"
    no-katex
    no-mermaid
    no-echarts
  />
</template>
<script setup>
import { MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';
import './configureMarkdown.js';
import { useTheme } from '../../composables/useTheme.js';
import { sanitizeHtml } from './sanitize.js';
defineProps({ text: { type: String, default: '' } });
const { darkMode } = useTheme();
</script>
