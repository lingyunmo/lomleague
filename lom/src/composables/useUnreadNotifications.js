import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { notificationApi } from '../api/notification.js';

export function useUnreadNotifications(getToken) {
  const unreadCount = ref(0);
  let generation = 0;
  let pending = false;
  let refreshQueued = false;
  let disposed = false;
  let timer;

  async function refresh() {
    const token = getToken();
    if (!token || disposed) return;
    if (pending) {
      refreshQueued = true;
      return;
    }
    const requestGeneration = generation;
    const isCurrent = () => !disposed && generation === requestGeneration && token === getToken();
    pending = true;
    try {
      const response = await notificationApi.getNotifications({ page: 1, pageSize: 1 });
      if (!isCurrent() || refreshQueued) return;
      const count = response.data.unreadCount;
      unreadCount.value = Number.isSafeInteger(count) && count >= 0 ? count : 0;
    } catch {
      // Background polling remains quiet; the drawer provides visible retries.
    } finally {
      if (isCurrent()) {
        pending = false;
        if (refreshQueued) {
          refreshQueued = false;
          refresh();
        }
      }
    }
  }

  watch(
    getToken,
    () => {
      generation++;
      pending = false;
      refreshQueued = false;
      unreadCount.value = 0;
      refresh();
    },
    { immediate: true, flush: 'sync' },
  );
  onMounted(() => {
    timer = setInterval(refresh, 30000);
  });
  onBeforeUnmount(() => {
    disposed = true;
    generation++;
    clearInterval(timer);
  });
  return { unreadCount, refresh };
}
