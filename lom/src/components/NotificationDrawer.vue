<template>
  <n-drawer v-model:show="visible" width="min(400px, 100vw)" placement="right">
    <n-drawer-content title="通知中心" closable>
      <template #header>
        <n-space align="center" justify="space-between">
          <span>通知中心</span>
          <n-button
            v-if="notifications.length > 0"
            text
            size="small"
            :loading="markingAll"
            :disabled="busy"
            @click="markAllRead"
            >全部标为已读</n-button
          >
        </n-space>
      </template>

      <p v-if="loading" role="status">正在加载通知…</p>
      <ListFetchFeedback :message="loadError" @retry="fetchNotifications" />
      <n-empty
        v-if="!loading && !loadError && notifications.length === 0"
        :description="authStore.token ? '暂无通知' : '请登录后查看通知'"
      />

      <n-list v-else>
        <n-list-item v-for="item in notifications" :key="item.id">
          <button
            type="button"
            class="notification-button"
            :class="{ unread: !item.isRead }"
            :disabled="busy"
            :aria-busy="readingId === item.id"
            @click="handleClick(item)"
          >
            <n-icon
              :color="item.isRead ? 'var(--color-text-subtle)' : 'var(--color-brand-primary)'"
              :size="18"
              aria-hidden="true"
            >
              <Notifications v-if="item.type === 'reply'" />
              <Heart v-else-if="item.type === 'like'" />
              <InformationCircle v-else />
            </n-icon>
            <span class="notification-copy"
              >{{ item.content
              }}<span class="notification-meta"
                ><span v-if="!item.isRead">未读 · </span
                ><time :datetime="item.createdAt">{{ formatRelativeDate(item.createdAt) }}</time></span
              ></span
            >
          </button>
        </n-list-item>
      </n-list>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useMessage } from 'naive-ui';
import { useRouter } from 'vue-router';
import { notificationApi } from '../api/notification.js';
import { useAuthStore } from '../stores/authStore.js';
import { formatRelativeDate } from '../utils/date.js';
import { Notifications, Heart, InformationCircle } from '@vicons/ionicons5';
import ListFetchFeedback from './ListFetchFeedback.vue';

const props = defineProps({ show: Boolean });
const emit = defineEmits(['update:show', 'read']);

const router = useRouter();
const authStore = useAuthStore();
const message = useMessage();
const loading = ref(false);
const notifications = ref([]);
const loadError = ref(null);
const readingId = ref(null);
const markingAll = ref(false);
const busy = computed(() => loading.value || readingId.value !== null || markingAll.value);
let generation = 0;
let disposed = false;
const context = () => ({ token: authStore.token, generation });
const isCurrent = (request) =>
  !disposed &&
  props.show &&
  !!authStore.token &&
  request.token === authStore.token &&
  request.generation === generation;

const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val),
});

const fetchNotifications = async () => {
  if (!props.show || !authStore.token || busy.value) return;
  const request = context();
  loading.value = true;
  loadError.value = null;
  try {
    const res = await notificationApi.getNotifications({ page: 1, pageSize: 50 });
    if (!isCurrent(request)) return;
    if (!Array.isArray(res.data.notifications)) throw new Error('Invalid notification list');
    notifications.value = res.data.notifications;
  } catch {
    if (isCurrent(request)) loadError.value = '获取通知失败，请重新加载。';
  } finally {
    if (isCurrent(request)) loading.value = false;
  }
};

const handleClick = async (item) => {
  if (busy.value || !authStore.token || !notifications.value.includes(item)) return;
  const request = context();
  const entityId = item.entityId;
  const path =
    Number.isSafeInteger(entityId) && entityId > 0
      ? item.entityType === 'article'
        ? `/article/${entityId}`
        : ['post', 'reply'].includes(item.entityType)
          ? `/forum/${entityId}`
          : null
      : null;
  readingId.value = item.id;
  try {
    if (!item.isRead) {
      await notificationApi.markAsRead(item.id);
      if (!isCurrent(request)) return;
      item.isRead = true;
      emit('read');
    }
    if (!isCurrent(request)) return;
    if (path) {
      visible.value = false;
      await router.push(path);
    }
  } catch {
    if (isCurrent(request)) message.error('打开通知失败，请重试');
  } finally {
    if (isCurrent(request)) readingId.value = null;
  }
};

const markAllRead = async () => {
  if (busy.value || !authStore.token) return;
  const request = context();
  const ids = new Set(notifications.value.map((item) => item.id));
  markingAll.value = true;
  try {
    await notificationApi.markAllAsRead();
    if (!isCurrent(request)) return;
    notifications.value.forEach((item) => {
      if (ids.has(item.id)) item.isRead = true;
    });
    emit('read');
  } catch {
    if (isCurrent(request)) message.error('标记全部已读失败，请重试');
  } finally {
    if (isCurrent(request)) markingAll.value = false;
  }
};

watch(
  () => [props.show, authStore.token],
  ([show, token], previous) => {
    generation++;
    loading.value = false;
    loadError.value = null;
    notifications.value = [];
    readingId.value = null;
    markingAll.value = false;
    if (previous && token !== previous[1]) {
      if (show) emit('update:show', false);
      return;
    }
    if (show && token) fetchNotifications();
  },
  { immediate: true, flush: 'sync' },
);
onBeforeUnmount(() => {
  disposed = true;
  generation++;
});
</script>

<style scoped>
.notification-button {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 14px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-primary);
  text-align: left;
  font: inherit;
  line-height: 1.6;
  cursor: pointer;
}
.notification-button.unread {
  background: var(--glass-bg-inner);
}
.notification-button:hover {
  border-color: var(--color-brand-primary);
}
.notification-button:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 2px;
}
.notification-button:disabled {
  cursor: wait;
}
.notification-copy {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.notification-meta {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--color-text-subtle);
}
</style>
