<template>
  <n-drawer v-model:show="visible" :width="400" placement="right">
    <n-drawer-content title="通知中心" closable>
      <template #header>
        <n-space align="center" justify="space-between">
          <span>通知中心</span>
          <n-button v-if="notifications.length > 0" text size="small" @click="markAllRead">全部已读</n-button>
        </n-space>
      </template>

      <n-spin :show="loading" />
      <n-empty v-if="!loading && notifications.length === 0" description="暂无通知" />

      <n-list v-else>
        <n-list-item
          v-for="item in notifications"
          :key="item.id"
          :style="{ background: item.isRead ? 'transparent' : 'rgba(78,204,163,0.08)' }"
          clickable
          @click="handleClick(item)"
        >
          <template #prefix>
            <n-icon :color="item.isRead ? '#888' : 'var(--color-brand-primary)'" :size="18">
              <Notifications v-if="item.type === 'reply'" />
              <Heart v-else-if="item.type === 'like'" />
              <InformationCircle v-else />
            </n-icon>
          </template>
          <n-text :depth="item.isRead ? 3 : 1">{{ item.content }}</n-text>
          <template #suffix>
            <n-text depth="3" class="notif-time">{{ formatRelativeDate(item.createdAt) }}</n-text>
          </template>
        </n-list-item>
      </n-list>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { notificationApi } from '../api/notification.js';
import { useAuthStore } from '../stores/authStore.js';
import { formatRelativeDate } from '../utils/date.js';
import { Notifications, Heart, InformationCircle } from '@vicons/ionicons5';

const props = defineProps({ show: Boolean });
const emit = defineEmits(['update:show']);

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const notifications = ref([]);

const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val),
});

const fetchNotifications = async () => {
  if (!authStore.token) return;
  loading.value = true;
  try {
    const res = await notificationApi.getNotifications({ page: 1, pageSize: 50 });
    notifications.value = res.data.notifications;
  } catch { /* ignore */ }
  loading.value = false;
};

const handleClick = async (item) => {
  if (!item.isRead) {
    await notificationApi.markAsRead(item.id);
    item.isRead = true;
  }
  if (item.entityType === 'post' && item.entityId) {
    visible.value = false;
    router.push(`/forum/${item.entityId}`);
  } else if (item.entityType === 'reply' && item.entityId) {
    visible.value = false;
    // 回复通知跳到对应帖子
    router.push(`/forum/${item.entityId}`);
  } else if (item.entityType === 'article' && item.entityId) {
    visible.value = false;
    router.push(`/article/${item.entityId}`);
  }
};

const markAllRead = async () => {
  await notificationApi.markAllAsRead();
  notifications.value.forEach(n => n.isRead = true);
};

watch(visible, (val) => {
  if (val) fetchNotifications();
});
</script>

<style scoped>
.notif-time {
  font-size: 11px;
}
</style>
