<template>
  <div class="profile-container" v-if="!loading">
    <n-card :bordered="false" class="profile-card" hoverable>
      <div class="profile-header">
        <n-avatar
            round
            :size="128"
            :src="user.avatar || '/default-avatar.png'"
            class="profile-avatar"
        />
        <div class="profile-info">
          <h3 class="username">{{ user.username || '未知用户' }}</h3>
          <p class="email">
            <n-icon><MailOutline /></n-icon> {{ user.email || '未设置邮箱' }}
          </p>
          <p class="last-login">
            <n-icon><GlobeOutline /></n-icon> 地区: {{ user.lastLoginRegion?.region || '未知' }} <br />
            <n-icon><LocationOutline /></n-icon> IP: {{ user.lastLoginRegion?.ip || '未知' }}
          </p>
        </div>
      </div>

      <n-divider />

      <n-descriptions
          bordered
          column="1"
          label-placement="left"
          size="large"
          label-style="color: #bbb;"
          content-style="color: #fff;">
        <n-descriptions-item label="金币">✨ {{ user.goldCoins }}</n-descriptions-item>
        <n-descriptions-item label="注册日期">{{ formatDate(user.createdAt) }}</n-descriptions-item>
        <n-descriptions-item label="最近更新">{{ formatDate(user.updatedAt) }}</n-descriptions-item>
        <n-descriptions-item label="用户ID">#{{ user.id }}</n-descriptions-item>
      </n-descriptions>
    </n-card>
  </div>

  <div v-else class="loading-container">
    <n-spin size="large" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../../stores/authStore.js';
import { formatDate } from '../../utils/date.js';
import { MailOutline, GlobeOutline, LocationOutline } from '@vicons/ionicons5';

const authStore = useAuthStore();
const loading = ref(true);
const message = useMessage();

const user = computed(() => {
  const data = authStore.user;
  if (!data) return {};
  return {
    ...data,
    goldCoins: data.gold_coins,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    id: data.id,
  };
});

onMounted(async () => {
  await authStore.fetchUser();
  if (!authStore.user) {
    message.error('获取用户信息失败，请稍后重试');
  }
  loading.value = false;
});
</script>

<style scoped>
.profile-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #141e30, #243b55);
  animation: fadeIn 1s ease-in-out;
}
.profile-card {
  width: 450px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.profile-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.profile-avatar {
  border: 3px solid #4ecca3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
}

.profile-info {
  margin-left: 20px;
  color: #fff;
}

.username {
  font-size: 24px;
  font-weight: bold;
  color: #4ecca3;
}

.email,
.last-login {
  font-size: 14px;
  color: #bbb;
  margin-top: 6px;
}

.n-icon {
  margin-right: 6px;
}
</style>
