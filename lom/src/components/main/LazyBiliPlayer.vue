<template>
  <div ref="containerRef" class="lazy-player" :class="{ loaded }">
    <div v-if="!loaded" class="lazy-player-placeholder" @click="load">
      <div class="lazy-player-overlay">
        <n-icon size="32" color="rgba(255,255,255,.7)"><PlayCircle /></n-icon>
        <span v-if="title">{{ title }}</span>
      </div>
    </div>
    <iframe
      v-else
      :src="src"
      allowfullscreen
      class="lazy-player-iframe"
      scrolling="no"
      frameborder="0"
      loading="lazy"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { PlayCircle } from '@vicons/ionicons5'

const props = defineProps({
  bvid: { type: String, required: true },
  title: { type: String, default: '' },
})

const loaded = ref(false)
const containerRef = ref(null)

const src = `//player.bilibili.com/player.html?bvid=${props.bvid}&page=1&high_quality=1&danmaku=0`

const load = () => { loaded.value = true }

onMounted(() => {
  if (!containerRef.value) return
  const io = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) { loaded.value = true; io.disconnect() } },
    { rootMargin: '200px' }
  )
  io.observe(containerRef.value)
})
</script>

<style scoped>
.lazy-player {
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}
.lazy-player-placeholder {
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: linear-gradient(135deg, rgba(78,204,163,.15), rgba(69,183,209,.15));
}
.lazy-player-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255,255,255,.7);
}
.lazy-player-iframe {
  width: 100%; height: 100%; border: 0; display: block;
}
</style>
