<template>
  <div class="profile-page" v-if="!loading">
    <!-- 左侧卡片 -->
    <div class="profile-left">
      <n-card :bordered="false" class="profile-card" hoverable>
        <div class="profile-header">
          <div class="avatar-wrapper" :class="'frame-' + achFrame">
            <img :src="user.avatar || '/default-avatar.png'" class="profile-avatar" />
            <div v-if="achFrame !== 'none'" class="frame-glow-ring"></div>
          </div>
          <div class="frame-label">{{ frameNames[achFrame] || '无框' }}</div>
          <h3 class="username">{{ user.username || '未知用户' }}</h3>
          <p class="email"><n-icon :size="16"><MailOutline /></n-icon> {{ user.email || '未设置邮箱' }}</p>
          <p class="last-login"><n-icon :size="16"><GlobeOutline /></n-icon> {{ user.lastLoginRegion?.region || '未知' }}</p>
        </div>

        <div class="frame-progress">
          <div class="frame-bar">
            <div class="frame-segment bronze" :class="{ active: achCount >= 2 }" title="青铜 · 2成就" />
            <div class="frame-segment silver" :class="{ active: achCount >= 4 }" title="白银 · 4成就" />
            <div class="frame-segment gold" :class="{ active: achCount >= 6 }" title="黄金 · 6成就" />
            <div class="frame-segment legend" :class="{ active: achCount >= 8 }" title="传说 · 8成就" />
          </div>
          <div class="frame-next">⬆ {{ nextFrame }}</div>
        </div>

        <n-divider />

        <n-button type="primary" block @click="$router.push('/edit-profile')" style="margin-bottom:12px">
          <template #icon><n-icon><CreateOutline /></n-icon></template>
          编辑个人资料
        </n-button>

        <n-descriptions bordered column="1" label-placement="left" label-style="color:var(--color-text-label)" content-style="color:var(--color-text-primary)">
          <n-descriptions-item label="金币">✨ {{ user.goldCoins }}</n-descriptions-item>
          <n-descriptions-item label="帖子">{{ achStats.postCount || 0 }}</n-descriptions-item>
          <n-descriptions-item label="回复">{{ achStats.replyCount || 0 }}</n-descriptions-item>
          <n-descriptions-item label="获赞">{{ achStats.totalLikes || 0 }}</n-descriptions-item>
          <n-descriptions-item label="签到">{{ user.checkin_streak || 0 }} 天</n-descriptions-item>
          <n-descriptions-item label="注册">{{ formatDate(user.createdAt) }}</n-descriptions-item>
        </n-descriptions>
      </n-card>
    </div>

    <!-- 右侧成就 -->
    <div class="profile-right">
      <n-card :bordered="false" class="ach-card" hoverable title="🏆 成就">
        <template #header-extra>
          <n-tag :type="achCount >= 6 ? 'error' : achCount >= 4 ? 'warning' : 'info'" size="small" round>
            {{ achCount }}/9
          </n-tag>
        </template>
        <div class="ach-grid">
          <div v-for="a in achievements" :key="a.key" class="ach-item" :class="{ locked: !a.unlocked }">
            <div class="ach-icon">{{ a.icon }}</div>
            <div class="ach-name">{{ a.name }}</div>
            <div class="ach-desc">{{ a.desc }}</div>
            <div v-if="!a.unlocked" class="ach-lock">🔒</div>
          </div>
        </div>
      </n-card>

      <!-- 近期动态 -->
      <n-card :bordered="false" class="activity-card" hoverable title="📋 近期动态">
        <n-spin v-if="activityLoading" size="small" />
        <n-empty v-else-if="!activities.length" description="暂无动态" />
        <div v-else class="activity-list">
          <div v-for="a in activities" :key="a.key" class="activity-row" @click="$router.push(a.link)">
            <n-tag :type="a.type === 'post' ? 'info' : 'success'" size="tiny" bordered>{{ a.type === 'post' ? '帖子' : '回复' }}</n-tag>
            <span class="activity-text">{{ a.text }}</span>
            <span class="activity-time">{{ a.time }}</span>
          </div>
        </div>
      </n-card>
    </div>
  </div>

  <div v-else class="loading-container">
    <n-spin size="large" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '../../stores/authStore.js'
import { formatDate } from '../../utils/date.js'
import { MailOutline, GlobeOutline, CreateOutline } from '@vicons/ionicons5'
import client from '../../api/client.js'

const authStore = useAuthStore()
const loading = ref(true)
const message = useMessage()
const user = computed(() => authStore.user || {})

const achievements = ref([])
const achCount = computed(() => authStore.achCount)
const achFrame = computed(() => authStore.achFrame)
const frameNames = {
  none: '未激活', bronze: '🥉 青铜框', silver: '🥈 白银框', gold: '🥇 黄金框', legend: '🌈 传说框'
}
const nextFrame = computed(() => {
  const c = achCount.value
  if (c >= 8) return '已达最高等级！'
  if (c >= 6) return `再解锁 ${8 - c} 个成就 → 传说框`
  if (c >= 4) return `再解锁 ${6 - c} 个成就 → 黄金框`
  if (c >= 2) return `再解锁 ${4 - c} 个成就 → 白银框`
  return `再解锁 ${2 - c} 个成就 → 青铜框`
})
const achStats = ref({})

// 近期动态
const activities = ref([])
const activityLoading = ref(false)
const fetchActivities = async () => {
  if (!authStore.user?.id) return
  activityLoading.value = true
  try {
    const [postsRes, repliesRes] = await Promise.all([
      client.get(`/forum/posts?pageSize=3`),
      client.get(`/forum/replies/${authStore.user.id}?pageSize=2`),
    ])
    const posts = (postsRes.data.posts || []).map(p => ({
      key: 'p' + p.id, type: 'post', text: p.title,
      time: new Date(p.updatedAt).toLocaleDateString('zh-CN'),
      link: `/forum/${p.id}`,
    }))
    // Get user's replies - use a simple search approach
    const replies = (repliesRes.data.replies || []).filter(r => r.userId === authStore.user.id).slice(0, 2).map(r => ({
      key: 'r' + r.id, type: 'reply', text: r.content?.substring(0, 40) || '...',
      time: new Date(r.createdAt).toLocaleDateString('zh-CN'),
      link: `/forum/${r.postId}`,
    }))
    activities.value = [...posts, ...replies].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5)
  } catch { /* ignore */ }
  finally { activityLoading.value = false }
}

const fetchAchievements = () => {
  achievements.value = authStore.achList
  achStats.value = authStore.achStats
}

onMounted(async () => {
  await authStore.fetchUser()
  if (!authStore.user) message.error('获取用户信息失败')
  await fetchAchievements()
  fetchActivities()
  loading.value = false
})
</script>

<style scoped>
.profile-page {
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
  padding: 48px 24px;
  background: linear-gradient(135deg, var(--color-bg-gradient-start), var(--color-bg-gradient-end));
  animation: fadeIn 1s ease-in-out;
}

.profile-left { width: 380px; flex-shrink: 0; }
.profile-right { flex: 1; max-width: 600px; }

.profile-card, .ach-card {
  background: var(--glass-bg);
  border-radius: 16px;
  backdrop-filter: var(--glass-blur);
}

.profile-header { text-align: center; }
.avatar-wrapper {
  position: relative;
  display: inline-block;
  border-radius: 50%;
  padding: 4px;
  margin-bottom: 6px;
}
.avatar-wrapper.frame-bronze { background: linear-gradient(135deg, #cd7f32, #e8b870); box-shadow: 0 0 16px rgba(205,127,50,.4); }
.avatar-wrapper.frame-silver { background: linear-gradient(135deg, #a0a0a0, #d4d4d4); box-shadow: 0 0 16px rgba(160,160,160,.4); }
.avatar-wrapper.frame-gold { background: linear-gradient(135deg, #d4a843, #f0d060); box-shadow: 0 0 20px rgba(212,168,67,.5); }
.avatar-wrapper.frame-legend {
  background: linear-gradient(135deg, #af52de, #ff375f, #f0a040, #34c759);
  animation: frameGlow 2s infinite alternate;
  box-shadow: 0 0 24px rgba(175,82,222,.5);
}
.frame-glow-ring {
  position: absolute; inset: -6px; border-radius: 50%;
  border: 2px solid transparent;
  animation: ringPulse 3s infinite ease-in-out;
  pointer-events: none;
}
.frame-legend .frame-glow-ring { border-color: rgba(255,255,255,.4); }

@keyframes frameGlow {
  from { box-shadow: 0 0 12px rgba(175,82,222,.4); }
  to { box-shadow: 0 0 28px rgba(255,55,95,.6); }
}
@keyframes ringPulse {
  0%, 100% { transform: scale(1); opacity: .4; }
  50% { transform: scale(1.08); opacity: 1; }
}

.frame-label {
  text-align: center; font-size: 12px; font-weight: 700;
  color: var(--color-text-subtle); margin-bottom: 8px;
}

.profile-avatar {
  width: 100px; height: 100px;
  border-radius: 50%;
  display: block;
  object-fit: cover;
  position: relative;
  z-index: 1;
}

/* 帧进度条 */
.frame-progress { margin-bottom: 8px; }
.frame-bar { display: flex; gap: 3px; margin-bottom: 4px; }
.frame-segment {
  height: 6px; border-radius: 3px; flex: 1;
  background: var(--glass-bg-inner); transition: all .3s;
}
.frame-segment.active.bronze { background: linear-gradient(90deg, #cd7f32, #e8b870); }
.frame-segment.active.silver { background: linear-gradient(90deg, #a0a0a0, #d4d4d4); }
.frame-segment.active.gold { background: linear-gradient(90deg, #d4a843, #f0d060); }
.frame-segment.active.legend { background: linear-gradient(90deg, #af52de, #ff375f); }
.frame-next { font-size: 11px; color: var(--color-text-subtle); text-align: center; }

.username { font-size: 22px; font-weight: 800; color: var(--color-text-primary); margin: 8px 0 4px; }
.email, .last-login { font-size: 13px; color: var(--color-text-label); margin: 2px 0; }

/* 成就网格 */
.ach-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 8px;
}

.ach-item {
  background: var(--glass-bg-inner);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  transition: transform .2s;
  position: relative;
  border: 1px solid var(--glass-border);
}
.ach-item:hover { transform: translateY(-2px); }
.ach-item.locked { opacity: .35; filter: grayscale(.8); }

.ach-icon { font-size: 28px; margin-bottom: 4px; }
.ach-name { font-size: 13px; font-weight: 700; color: var(--color-text-primary); }
.ach-desc { font-size: 11px; color: var(--color-text-subtle); margin-top: 2px; }
.ach-lock { position: absolute; top: 6px; right: 8px; font-size: 11px; }

@media (max-width: 768px) {
  .profile-page { flex-direction: column; padding: 24px 16px; }
  .profile-left { width: 100%; }
  .profile-right { max-width: 100%; }
  .ach-grid { grid-template-columns: repeat(2, 1fr); }
}

/* 动态 */
.activity-card { margin-top: 16px; }
.activity-list { display: flex; flex-direction: column; gap: 6px; }
.activity-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  transition: background .15s; background: var(--glass-bg-inner);
}
.activity-row:hover { background: var(--glass-bg); }
.activity-text { flex:1; font-size:13px; color:var(--color-text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.activity-time { font-size:11px; color:var(--color-text-subtle); flex-shrink:0; }
</style>
