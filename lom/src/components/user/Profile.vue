<template>
  <div class="profile-page" v-if="!loading && authStore.token && authStore.user && route.name === 'Profile'">
    <!-- 左侧卡片 -->
    <div class="profile-left">
      <n-card :bordered="false" class="profile-card" hoverable>
        <div v-if="authStore.userError || profileError" role="alert" class="read-error">
          <p>{{ authStore.userError || profileError }}</p>
          <button type="button" @click="loadProfile">重新加载资料</button>
        </div>
        <div class="profile-header">
          <div class="avatar-wrapper" :class="'frame-' + achFrame">
            <img :src="user.avatar || '/default-avatar.png'" class="profile-avatar" alt="" />
            <div v-if="achFrame !== 'none'" class="frame-glow-ring"></div>
          </div>
          <div class="frame-label">{{ authStore.achReady ? frameNames[achFrame] || '无框' : '头像框尚未加载' }}</div>
          <h1 class="username">{{ user.username || '未知用户' }}</h1>
          <p class="email">
            <n-icon :size="16"><MailOutline /></n-icon> {{ user.email || '未设置邮箱' }}
          </p>
          <p class="last-login">
            <n-icon :size="16"><GlobeOutline /></n-icon> {{ user.lastLoginRegion?.region || '未知' }}
          </p>
        </div>

        <div class="frame-progress">
          <div v-if="authStore.achReady" class="frame-bar" aria-label="头像框解锁进度">
            <div class="frame-segment bronze" :class="{ active: achCount >= 2 }" title="青铜 · 2成就" />
            <div class="frame-segment silver" :class="{ active: achCount >= 4 }" title="白银 · 4成就" />
            <div class="frame-segment gold" :class="{ active: achCount >= 6 }" title="黄金 · 6成就" />
            <div class="frame-segment legend" :class="{ active: achCount >= 8 }" title="传说 · 8成就" />
          </div>
          <div class="frame-next">⬆ {{ nextFrame }}</div>
        </div>

        <n-divider />

        <RouterLink to="/edit-profile" class="edit-profile-link"
          >编辑个人资料 <span aria-hidden="true">↗</span></RouterLink
        >

        <n-descriptions
          bordered
          column="1"
          label-placement="left"
          label-style="color:var(--color-text-label)"
          content-style="color:var(--color-text-primary)"
        >
          <n-descriptions-item label="金币">✨ {{ user.goldCoins }}</n-descriptions-item>
          <n-descriptions-item label="帖子">{{ stat('postCount') }}</n-descriptions-item>
          <n-descriptions-item label="回复">{{ stat('replyCount') }}</n-descriptions-item>
          <n-descriptions-item label="获赞">{{ stat('totalLikes') }}</n-descriptions-item>
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
            {{ authStore.achReady ? achCount : '—' }}/9
          </n-tag>
        </template>
        <p v-if="authStore.achLoading && !authStore.achReady" role="status">正在加载成就…</p>
        <div v-if="authStore.achError" role="alert" class="read-error">
          <p>{{ authStore.achError }}</p>
          <button type="button" :disabled="authStore.achLoading" @click="authStore.fetchAchievements()">
            重新加载成就
          </button>
        </div>
        <div v-if="authStore.achReady" class="ach-grid">
          <div v-for="a in achievements" :key="a.key" class="ach-item" :class="{ locked: !a.unlocked }">
            <div class="ach-icon">{{ a.icon }}</div>
            <div class="ach-name">{{ a.name }}</div>
            <div class="ach-desc">{{ a.desc }}</div>
            <div class="ach-state">{{ a.unlocked ? '已解锁' : '未解锁' }}</div>
            <div v-if="!a.unlocked" class="ach-lock" aria-hidden="true">🔒</div>
          </div>
        </div>
      </n-card>

      <!-- 近期动态 -->
      <n-card :bordered="false" class="activity-card" hoverable title="📋 近期动态">
        <p class="activity-description">你最近的 5 条帖子更新与回复，按实际时间排序。</p>
        <div v-if="activityError" role="alert" class="read-error">
          <p>{{ activityError }}</p>
          <button type="button" :disabled="activityLoading" @click="fetchActivities">重新加载动态</button>
        </div>
        <p v-if="activityLoading && !activities.length" role="status">正在加载动态…</p>
        <n-empty v-else-if="!activityError && !activities.length" description="暂无动态" />
        <div v-if="activities.length" class="activity-list" :aria-busy="activityLoading">
          <RouterLink v-for="a in activities" :key="a.key" class="activity-row" :to="`/forum/${a.postId}`">
            <n-tag :type="a.type === 'post' ? 'info' : 'success'" size="tiny" bordered>{{
              a.type === 'post' ? '帖子' : '回复'
            }}</n-tag>
            <span class="activity-text">{{ a.text }}</span>
            <time class="activity-time" :datetime="a.occurredAt">{{ formatDate(a.occurredAt) }}</time>
          </RouterLink>
        </div>
      </n-card>
    </div>
  </div>

  <div v-else class="loading-container">
    <p v-if="loading" role="status">正在加载个人资料…</p>
    <div v-else-if="authStore.token && (profileError || authStore.userError)" role="alert" class="read-error">
      <p>{{ profileError || authStore.userError }}</p>
      <button type="button" @click="loadProfile">重新加载资料</button>
    </div>
    <RouterLink v-else-if="!authStore.token" to="/login">请先登录查看个人资料</RouterLink>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/authStore.js';
import { formatDate } from '../../utils/date.js';
import { MailOutline, GlobeOutline } from '@vicons/ionicons5';
import client from '../../api/client.js';

const authStore = useAuthStore();
const route = useRoute();
const loading = ref(true);
const profileError = ref('');
const user = computed(() => authStore.user || {});

const achievements = computed(() => authStore.achList);
const achCount = computed(() => authStore.achCount);
const achFrame = computed(() => authStore.achFrame);
const frameNames = {
  none: '未激活',
  bronze: '🥉 青铜框',
  silver: '🥈 白银框',
  gold: '🥇 黄金框',
  legend: '🌈 传说框',
};
const nextFrame = computed(() => {
  if (!authStore.achReady) return '成就尚未加载';
  const c = achCount.value;
  if (c >= 8) return '已达最高等级！';
  if (c >= 6) return `再解锁 ${8 - c} 个成就 → 传说框`;
  if (c >= 4) return `再解锁 ${6 - c} 个成就 → 黄金框`;
  if (c >= 2) return `再解锁 ${4 - c} 个成就 → 白银框`;
  return `再解锁 ${2 - c} 个成就 → 青铜框`;
});
const achStats = computed(() => authStore.achStats);
const stat = (key) => (authStore.achReady ? (achStats.value[key] ?? 0) : '—');

// 近期动态
const activities = ref([]);
const activityLoading = ref(false);
const activityError = ref('');
let visitSequence = 0,
  activitySequence = 0,
  disposed = false;
const fetchActivities = async () => {
  if (!authStore.token || !authStore.user?.id || route.name !== 'Profile' || disposed || activityLoading.value) return;
  const visit = visitSequence,
    token = authStore.token,
    userId = authStore.user.id,
    sequence = ++activitySequence;
  const isCurrent = () =>
    !disposed &&
    visit === visitSequence &&
    sequence === activitySequence &&
    authStore.token === token &&
    authStore.user?.id === userId &&
    route.name === 'Profile';
  activityLoading.value = true;
  activityError.value = '';
  try {
    const response = await client.get('/user/activity');
    if (!isCurrent()) return;
    if (!Array.isArray(response.data.activities)) throw new Error('Invalid activity response');
    activities.value = response.data.activities;
  } catch {
    if (isCurrent()) activityError.value = '动态暂时无法加载，请重试。';
  } finally {
    if (isCurrent()) activityLoading.value = false;
  }
};

async function loadProfile() {
  const visit = ++visitSequence,
    token = authStore.token;
  activitySequence++;
  activities.value = [];
  activityLoading.value = false;
  activityError.value = '';
  profileError.value = '';
  loading.value = false;
  if (!token || route.name !== 'Profile' || disposed) return;
  const isCurrent = () => !disposed && visit === visitSequence && authStore.token === token && route.name === 'Profile';
  loading.value = true;
  try {
    await authStore.fetchUser();
    if (!isCurrent()) return;
    loading.value = false;
    if (!authStore.user) {
      profileError.value = authStore.userError || '用户信息暂时无法加载，请重试。';
      return;
    }
    authStore.fetchAchievements();
    await fetchActivities();
  } catch {
    if (isCurrent()) profileError.value = '用户信息暂时无法加载，请重试。';
  } finally {
    if (isCurrent()) loading.value = false;
  }
}
watch([() => authStore.token, () => route.fullPath], loadProfile, { immediate: true, flush: 'sync' });
onBeforeUnmount(() => {
  disposed = true;
  visitSequence++;
  activitySequence++;
});
</script>

<style scoped>
.profile-page {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
  padding: 34px 36px 64px;
  color: var(--color-text-primary);
  background: transparent;
}

.profile-left {
  width: 340px;
  min-width: 0;
  flex-shrink: 0;
}
.profile-right {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  width: 100%;
}

.profile-card,
.ach-card,
.activity-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-medium);
}

.profile-header {
  text-align: center;
}
.avatar-wrapper {
  position: relative;
  display: inline-block;
  border-radius: 50%;
  padding: 4px;
  margin-bottom: 6px;
}
.avatar-wrapper.frame-bronze {
  background: linear-gradient(135deg, #cd7f32, #e8b870);
  box-shadow: 0 0 16px rgba(205, 127, 50, 0.4);
}
.avatar-wrapper.frame-silver {
  background: linear-gradient(135deg, #a0a0a0, #d4d4d4);
  box-shadow: 0 0 16px rgba(160, 160, 160, 0.4);
}
.avatar-wrapper.frame-gold {
  background: linear-gradient(135deg, #d4a843, #f0d060);
  box-shadow: 0 0 20px rgba(212, 168, 67, 0.5);
}
.avatar-wrapper.frame-legend {
  background: linear-gradient(135deg, #af52de, #ff375f, #f0a040, #34c759);
  animation: frameGlow 2s infinite alternate;
  box-shadow: 0 0 24px rgba(175, 82, 222, 0.5);
}
.frame-glow-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid transparent;
  animation: ringPulse 3s infinite ease-in-out;
  pointer-events: none;
}
.frame-legend .frame-glow-ring {
  border-color: rgba(255, 255, 255, 0.4);
}

@keyframes frameGlow {
  from {
    box-shadow: 0 0 12px rgba(175, 82, 222, 0.4);
  }
  to {
    box-shadow: 0 0 28px rgba(255, 55, 95, 0.6);
  }
}
@keyframes ringPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

.frame-label {
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: block;
  object-fit: cover;
  position: relative;
  z-index: 1;
}

/* 帧进度条 */
.frame-progress {
  margin-bottom: 8px;
}
.frame-bar {
  display: flex;
  gap: 3px;
  margin-bottom: 4px;
}
.frame-segment {
  height: 6px;
  border-radius: 3px;
  flex: 1;
  background: var(--glass-bg-inner);
  transition: all 0.3s;
}
.frame-segment.active.bronze {
  background: linear-gradient(90deg, #cd7f32, #e8b870);
}
.frame-segment.active.silver {
  background: linear-gradient(90deg, #a0a0a0, #d4d4d4);
}
.frame-segment.active.gold {
  background: linear-gradient(90deg, #d4a843, #f0d060);
}
.frame-segment.active.legend {
  background: linear-gradient(90deg, #af52de, #ff375f);
}
.frame-next {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-align: center;
}

.username {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 8px 0 4px;
  overflow-wrap: anywhere;
}
.email,
.last-login {
  font-size: 13px;
  color: var(--color-text-label);
  margin: 2px 0;
  overflow-wrap: anywhere;
}

/* 成就网格 */
.ach-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.ach-item {
  background: var(--glass-bg-inner);
  border-radius: 2px;
  padding: 14px 10px;
  text-align: center;
  transition: transform 0.2s;
  position: relative;
  border: 1px solid var(--glass-border);
}
.ach-item:hover {
  transform: translateY(-2px);
}
.ach-item.locked {
  filter: grayscale(1);
}

.ach-icon {
  font-size: 28px;
  margin-bottom: 4px;
}
.ach-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}
.ach-desc {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
.ach-lock {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 11px;
}

@media (max-width: 768px) {
  .profile-page {
    flex-direction: column;
    padding: 24px 16px;
  }
  .profile-left {
    width: 100%;
  }
  .profile-right {
    max-width: 100%;
  }
  .ach-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 动态 */
.activity-card {
  margin-top: 16px;
}
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.activity-row {
  min-height: 44px;
  box-sizing: border-box;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.15s;
  background: var(--glass-bg-inner);
}
.activity-row:hover {
  background: var(--glass-bg);
}
.activity-text {
  min-width: 0;
  flex: 1;
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.activity-time {
  font-size: 11px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.edit-profile-link,
.read-error button {
  min-height: 44px;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid var(--color-portal-accent);
  border-radius: 2px;
  color: var(--color-text-primary);
  background: transparent;
  font: inherit;
  cursor: pointer;
}
.edit-profile-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  margin-bottom: 20px;
}
.activity-description,
.ach-state,
.read-error {
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-secondary);
}
.read-error {
  margin-bottom: 16px;
}
.read-error button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ach-state {
  margin-top: 8px;
}
.activity-row:focus-visible,
.edit-profile-link:focus-visible,
.read-error button:focus-visible {
  outline: 2px solid var(--color-portal-accent);
  outline-offset: 3px;
}
@media (max-width: 520px) {
  .activity-row {
    flex-wrap: wrap;
  }
  .activity-time {
    flex-basis: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .frame-legend,
  .frame-glow-ring {
    animation: none;
  }
  .ach-item,
  .frame-segment,
  .activity-row {
    transition: none;
  }
  .ach-item:hover {
    transform: none;
  }
}
</style>
