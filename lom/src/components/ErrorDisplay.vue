<template>
  <n-result
    status="500"
    title="加载失败"
    :description="error || '请求出错，请稍后重试'"
  >
    <template #footer>
      <n-button v-if="showRetry" @click="$emit('retry')">重试</n-button>
    </template>
  </n-result>
</template>

<script setup>
defineProps({
  error: { type: String, default: '' },
  showRetry: { type: Boolean, default: true },
});

defineEmits(['retry']);
</script>
