<template>
  <div class="pagination-wrapper" v-if="total > 0">
    <n-pagination
        v-model:page="currentPage"
        v-model:page-size="currentPageSize"
        :item-count="total"
        :page-sizes="[10, 20, 50]"
        show-size-picker
        :page-slot="7"
        @update:page="$emit('update:page', $event); $emit('change')"
        @update:page-size="$emit('update:pageSize', $event); $emit('change')"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
});

const emit = defineEmits(['update:page', 'update:pageSize', 'change']);

const currentPage = computed({
  get: () => props.page,
  set: (val) => emit('update:page', val),
});

const currentPageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit('update:pageSize', val),
});
</script>

<style scoped>
.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
}
</style>
