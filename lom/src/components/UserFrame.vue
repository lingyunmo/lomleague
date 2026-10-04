<template>
  <span class="user-frame" :class="'frame-' + frame" :style="{ width: size + 'px', height: size + 'px' }">
    <img
      :src="src || '/default-avatar.png'"
      :style="{ width: size - 4 + 'px', height: size - 4 + 'px' }"
      alt=""
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="handleImageError"
    />
  </span>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { loadUserFrame } from '../utils/userFrames.js';

const props = defineProps({
  userId: { type: Number, default: 0 },
  src: { type: String, default: '' },
  size: { type: Number, default: 36 },
});

const frame = ref('none');

let requestSequence = 0;
watch(
  () => props.userId,
  async (uid) => {
    const requestId = ++requestSequence;
    frame.value = 'none';
    const value = await loadUserFrame(uid);
    if (requestId === requestSequence) frame.value = value;
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  requestSequence++;
});

function handleImageError(event) {
  if (event.target.getAttribute('src') !== '/default-avatar.png') {
    event.target.src = '/default-avatar.png';
  }
}
</script>

<style scoped>
.user-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 2px;
  flex-shrink: 0;
}
.user-frame img {
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.frame-bronze {
  background: linear-gradient(135deg, #cd7f32, #e8b870);
}
.frame-silver {
  background: linear-gradient(135deg, #a0a0a0, #d4d4d4);
}
.frame-gold {
  background: linear-gradient(135deg, #d4a843, #f0d060);
}
.frame-legend {
  background: linear-gradient(135deg, #af52de, #ff375f, #f0a040, #34c759);
  animation: ufGlow 2s infinite alternate;
}
@keyframes ufGlow {
  from {
    box-shadow: 0 0 4px rgba(175, 82, 222, 0.3);
  }
  to {
    box-shadow: 0 0 10px rgba(255, 55, 95, 0.4);
  }
}
@media (prefers-reduced-motion: reduce) {
  .frame-legend {
    animation: none;
  }
}
</style>
