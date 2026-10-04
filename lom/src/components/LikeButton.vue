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
import { ref, onMounted } from 'vue';
import { Heart } from '@vicons/ionicons5';
import { useLike } from '../composables/useLike.js';
import { useMessage } from 'naive-ui';

const props = defineProps({
  entityType: { type: String, required: true },
  entityId: { type: Number, required: true },
});

const { toggleLike: doToggle, getLikeCount, getLikeStatus, loading, error } = useLike();
const message = useMessage();

const liked = ref(false);
const count = ref(0);

onMounted(async () => {
  const [c, s] = await Promise.all([
    getLikeCount(props.entityType, props.entityId),
    getLikeStatus(props.entityType, props.entityId),
  ]);
  count.value = c;
  liked.value = s;
});

const toggleLike = async () => {
  const res = await doToggle(props.entityType, props.entityId);
  if (res) {
    liked.value = res.liked;
    count.value = res.count;
  } else if (error.value) {
    message.error(error.value);
  }
};
</script>
