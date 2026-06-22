<template>
  <n-button
    quaternary
    size="small"
    @click="toggleLike"
    :loading="loading"
    :type="liked ? 'error' : 'default'"
  >
    <template #icon>
      <n-icon><Heart /></n-icon>
    </template>
    {{ count || 0 }}
  </n-button>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Heart } from '@vicons/ionicons5';
import api from '../api/api.js';
import { useAuthStore } from '../stores/authStore.js';

const props = defineProps({
  entityType: { type: String, required: true },
  entityId: { type: Number, required: true },
});

const authStore = useAuthStore();
const liked = ref(false);
const count = ref(0);
const loading = ref(false);

const fetchStatus = async () => {
  try {
    const [countRes] = await Promise.all([
      api.get('/likes/count', { params: { entityType: props.entityType, entityId: props.entityId } }),
      authStore.token ? api.get('/likes/status', { params: { entityType: props.entityType, entityId: props.entityId } }).then(r => { liked.value = r.data.liked; }) : Promise.resolve(),
    ]);
    count.value = countRes.data.count;
  } catch { /* ignore */ }
};

const toggleLike = async () => {
  if (!authStore.token) return;
  loading.value = true;
  try {
    const res = await api.post('/likes/toggle', {
      entityType: props.entityType,
      entityId: props.entityId,
    });
    liked.value = res.data.liked;
    count.value = res.data.count;
  } catch { /* ignore */ }
  loading.value = false;
};

onMounted(fetchStatus);
</script>
