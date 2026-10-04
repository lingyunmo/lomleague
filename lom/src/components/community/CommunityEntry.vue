<template>
  <article class="community-entry">
    <RouterLink
      class="entry-link"
      :to="destination"
      :aria-label="`阅读${type === 'post' ? '帖子' : '文章'}：${item.title}`"
    >
      <UserFrame :userId="item.userId" :src="item.user?.avatar" :size="40" aria-hidden="true" />
      <div class="entry-content">
        <div class="entry-heading">
          <h2>{{ item.title }}</h2>
          <span aria-hidden="true">↗</span>
        </div>
        <p v-if="summary" class="entry-summary">{{ summary }}</p>
        <div class="entry-meta">
          <span>{{ item.user?.username || '匿名' }}</span>
          <span>{{ formatDate(item.updatedAt) }}</span>
          <span v-if="type === 'post'">{{ item._count?.replies || 0 }} 条回复</span>
          <span>{{ item.region || '未知地区' }}</span>
        </div>
      </div>
    </RouterLink>
    <div class="entry-actions">
      <LikeButton :entity-type="type" :entity-id="item.id" />
      <n-button
        v-if="canDelete"
        quaternary
        size="small"
        type="error"
        :aria-label="`删除${type === 'post' ? '帖子' : '文章'}：${item.title}`"
        @click="$emit('delete', item.id)"
        ><template #icon
          ><n-icon><Trash /></n-icon></template
      ></n-button>
    </div>
  </article>
</template>
<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { Trash } from '@vicons/ionicons5';
import { formatDate } from '../../utils/date.js';
import UserFrame from '../UserFrame.vue';
import LikeButton from '../LikeButton.vue';
const props = defineProps({
  item: { type: Object, required: true },
  type: { type: String, required: true, validator: (value) => ['post', 'article'].includes(value) },
  canDelete: { type: Boolean, default: false },
});
defineEmits(['delete']);
const destination = computed(() => ({
  name: props.type === 'post' ? 'Forum' : 'Article',
  params: { id: props.item.id },
}));
const summary = computed(() => {
  const characters = Array.from(typeof props.item.content === 'string' ? props.item.content : '');
  return characters.slice(0, 120).join('') + (characters.length > 120 ? '…' : '');
});
</script>
<style scoped>
.community-entry {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border: 1px solid var(--community-line);
  border-radius: 8px;
  background: var(--community-surface);
  transition:
    border-color 0.2s,
    background 0.2s;
}
.community-entry:focus-within,
.community-entry:hover {
  border-color: color-mix(in srgb, var(--color-portal-accent) 45%, transparent);
  background: color-mix(in srgb, var(--color-text-primary) 5%, var(--color-bg-dark));
}
.entry-link {
  display: flex;
  align-items: start;
  gap: 18px;
  flex: 1;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}
.entry-link:focus-visible {
  outline: 2px solid var(--color-portal-accent);
  outline-offset: 6px;
  border-radius: 3px;
}
.entry-content {
  min-width: 0;
  flex: 1;
}
.entry-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 20px;
}
.entry-heading h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.entry-heading > span {
  font-size: 16px;
  color: var(--color-portal-accent);
}
.entry-summary {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.9;
  margin: 8px 0 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow-wrap: anywhere;
}
.entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 16px;
  margin-top: 14px;
  font-size: 10px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.entry-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
@media (max-width: 600px) {
  .community-entry {
    padding: 18px;
    gap: 14px;
    flex-wrap: wrap;
  }
  .entry-link {
    flex-basis: 100%;
    gap: 12px;
  }
  .entry-heading h2 {
    font-size: 16px;
  }
  .entry-actions {
    margin-left: 52px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .community-entry {
    transition: none;
  }
}
</style>
