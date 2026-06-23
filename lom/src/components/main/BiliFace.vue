<template>
  <div class="bili-face" :style="{ width: size + 'px', height: size + 'px' }">
    <div class="bili-face-ring" :style="ringStyle">
      <img
        :src="src"
        class="bili-face-img"
        :alt="alt"
        loading="lazy"
        referrerpolicy="no-referrer"
        @error="onError"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  size: { type: Number, default: 48 },
  ring: { type: Boolean, default: false },
})

const failed = ref(false)
const onError = () => { failed.value = true }

const ringStyle = computed(() => {
  if (!props.ring) return {}
  return {
    padding: '2px',
    background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
    borderRadius: '50%',
  }
})

defineExpose({ failed })
</script>

<style scoped>
.bili-face { flex-shrink: 0; }
.bili-face-ring {
  width: 100%; height: 100%;
  border-radius: 50%;
  overflow: hidden;
}
.bili-face-img {
  width: 100%; height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
</style>
