<template>
  <span class="user-frame" :class="'frame-' + frame" :style="{ width: size + 'px', height: size + 'px' }">
    <img :src="src || '/default-avatar.png'" :style="{ width: (size-4) + 'px', height: (size-4) + 'px' }" referrerpolicy="no-referrer" @error="e => e.target.src='/default-avatar.png'" />
  </span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  userId: { type: Number, default: 0 },
  src: { type: String, default: '' },
  size: { type: Number, default: 36 },
})

const frame = ref('none')

// 全局帧缓存（模块级共享）
const frameCache = ref({})
const pendingQueue = []
let fetchTimer = null

const batchFetch = async () => {
  if (!pendingQueue.length) return
  const batch = [...new Set(pendingQueue.filter(Boolean))]
  pendingQueue.length = 0
  try {
    const { default: client } = await import('../api/client.js')
    const res = await client.post('/user/frames', { userIds: batch })
    Object.assign(frameCache.value, res.data.frames)
  } catch { /* ignore */ }
}

const queueFetch = (uid) => {
  if (!uid || frameCache.value[uid]) return
  if (!pendingQueue.includes(uid)) pendingQueue.push(uid)
  clearTimeout(fetchTimer)
  fetchTimer = setTimeout(batchFetch, 50)
}

watch(() => props.userId, (uid) => {
  if (uid) {
    if (frameCache.value[uid]) {
      frame.value = frameCache.value[uid]
    } else {
      queueFetch(uid)
      // Quick re-check after batch
      setTimeout(() => { if (frameCache.value[uid]) frame.value = frameCache.value[uid] }, 100)
    }
  }
}, { immediate: true })

onMounted(() => {
  if (props.userId) {
    if (frameCache.value[props.userId]) frame.value = frameCache.value[props.userId]
    else queueFetch(props.userId)
  }
})
</script>

<style scoped>
.user-frame {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%; padding: 2px; flex-shrink: 0;
}
.user-frame img { border-radius: 50%; object-fit: cover; display: block; }
.frame-bronze { background: linear-gradient(135deg, #cd7f32, #e8b870); }
.frame-silver { background: linear-gradient(135deg, #a0a0a0, #d4d4d4); }
.frame-gold   { background: linear-gradient(135deg, #d4a843, #f0d060); }
.frame-legend { background: linear-gradient(135deg, #af52de, #ff375f, #f0a040, #34c759); animation: ufGlow 2s infinite alternate; }
@keyframes ufGlow { from { box-shadow: 0 0 4px rgba(175,82,222,.3); } to { box-shadow: 0 0 10px rgba(255,55,95,.4); } }
</style>
