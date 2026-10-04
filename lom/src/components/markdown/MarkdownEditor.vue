<template>
  <MdEditor
    :model-value="modelValue"
    :theme="darkMode ? 'dark' : 'light'"
    :placeholder="placeholder"
    :style="{ height, width: '100%' }"
    :toolbars="toolbars"
    :sanitize="sanitizeHtml"
    code-theme="lom"
    no-katex
    no-mermaid
    no-echarts
    no-prettier
    no-upload-img
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
<script setup>
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import './configureMarkdown.js';
import { useTheme } from '../../composables/useTheme.js';
import { sanitizeHtml } from './sanitize.js';
defineProps({
  modelValue: { type: String, default: '' },
  height: { type: String, default: '360px' },
  placeholder: { type: String, default: '写下你的想法，支持 Markdown…' },
});
defineEmits(['update:modelValue']);
const { darkMode } = useTheme();
const toolbars = [
  'bold',
  'italic',
  'strikeThrough',
  'title',
  'quote',
  'unorderedList',
  'orderedList',
  'codeRow',
  'code',
  'link',
  'table',
  'revoke',
  'next',
  'preview',
  'fullscreen',
];
</script>
