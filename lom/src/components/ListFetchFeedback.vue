<template>
  <div v-if="message" class="list-fetch-feedback" role="alert">
    <p>{{ message }}</p>
    <button type="button" @click="$emit('retry')">重新加载</button>
  </div>
</template>
<script setup>
defineProps({ message: { type: String, default: null } });
defineEmits(['retry']);
</script>
<style scoped>
.list-fetch-feedback {
  padding: 16px;
  margin: 12px 0;
  border: 1px solid var(--color-brand-primary);
  border-radius: 10px;
  color: var(--color-text-primary);
}
.list-fetch-feedback p {
  margin: 0 0 12px;
}
.list-fetch-feedback button {
  padding: 8px 14px;
  background: var(--glass-bg-inner);
  color: var(--color-text-primary);
  border: 1px solid var(--color-brand-primary);
  border-radius: 6px;
  cursor: pointer;
}
.list-fetch-feedback button:focus-visible {
  outline: 2px solid var(--color-text-primary);
  outline-offset: 3px;
}
</style>
