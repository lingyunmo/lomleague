<template>
  <div class="pagination-wrapper" v-if="total > 0">
    <n-pagination
      :page="page"
      :page-size="pageSize"
      :item-count="total"
      :page-sizes="[10, 20, 50]"
      show-size-picker
      :page-slot="7"
      @update:page="handlePageChange"
      @update:page-size="handleSizeChange"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
});

const emit = defineEmits(['update:page', 'update:pageSize', 'change']);

function handlePageChange(page) {
  emit('update:page', page);
  emit('change', page, props.pageSize);
}
function handleSizeChange(pageSize) {
  emit('update:pageSize', pageSize);
  emit('update:page', 1);
  emit('change', 1, pageSize);
}
</script>

<style scoped>
.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
}
</style>
