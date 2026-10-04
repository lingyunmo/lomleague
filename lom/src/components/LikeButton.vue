<template>
  <n-button
    quaternary
    size="small"
    @click="toggleLike"
    :loading="loading"
    :type="liked ? 'error' : 'default'"
    :aria-label="liked ? '取消点赞' : '点赞'"
    :aria-pressed="liked"
  >
    <template #icon>
      <n-icon><Heart /></n-icon>
    </template>
    {{ count || 0 }}
  </n-button>
</template>

<script setup>
/**
 * LikeButton — 点赞按钮
 * Issue #10: 接入 useLike composable，不再直接调 likeApi
 */
import { ref, watch, onBeforeUnmount } from 'vue';
import { Heart } from '@vicons/ionicons5';
import { useLike } from '../composables/useLike.js';
import { useAuth } from '../composables/useAuth.js';
import { useMessage } from 'naive-ui';

const props = defineProps({
  entityType: { type: String, required: true },
  entityId: { type: Number, required: true },
});

const { toggleLike: doToggle, getLikeCount, getLikeStatus, loading, error } = useLike();
const { token } = useAuth();
const message = useMessage();

const liked = ref(false);
const count = ref(0);
let requestSequence = 0;

function currentIdentity(sequence, entityType, entityId, sessionToken) {
  return (
    sequence === requestSequence &&
    entityType === props.entityType &&
    entityId === props.entityId &&
    sessionToken === token.value
  );
}

async function loadState() {
  const sequence = ++requestSequence;
  const { entityType, entityId } = props;
  const sessionToken = token.value;
  liked.value = false;
  count.value = 0;
  const [c, s] = await Promise.all([getLikeCount(entityType, entityId), getLikeStatus(entityType, entityId)]);
  if (!currentIdentity(sequence, entityType, entityId, sessionToken)) return;
  count.value = c;
  liked.value = s;
}

watch(() => [props.entityType, props.entityId, token.value], loadState, { immediate: true });
onBeforeUnmount(() => {
  requestSequence++;
});

const toggleLike = async () => {
  if (loading.value) return;
  const sequence = ++requestSequence;
  const { entityType, entityId } = props;
  const sessionToken = token.value;
  const res = await doToggle(entityType, entityId);
  if (!currentIdentity(sequence, entityType, entityId, sessionToken)) return;
  if (res) {
    liked.value = res.liked;
    count.value = res.count;
  } else if (error.value) {
    message.error(error.value);
    await loadState();
  }
};
</script>
