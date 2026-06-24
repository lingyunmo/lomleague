<template>
  <n-layout-header class="navbar">
    <div class="navbar-container">
      <div class="navbar-logo" @click="router.push({ name: 'Main' })">
        <img src="/logo.jpg" alt="lom Logo" class="logo-image" />
        <span>lom 联盟</span>
      </div>

      <div class="navbar-links">
        <!-- 主要导航 -->
        <n-button quaternary @click="router.push({ name: 'Main' })">
          <template #icon>
            <n-icon><Home/></n-icon>
          </template>
          首页
        </n-button>

        <n-button quaternary @click="router.push({ name: 'Articles' })">
          <template #icon>
            <n-icon><Book/></n-icon>
          </template>
          联盟公告
        </n-button>

        <n-button quaternary @click="router.push({ name: 'Forums' })">
          <template #icon>
            <n-icon><Chatbubbles/></n-icon>
          </template>
          社区论坛
        </n-button>

        <n-button quaternary @click="router.push({ name: 'Invite' })">
          <template #icon>
            <n-icon><Ribbon /></n-icon>
          </template>
          入盟申请
        </n-button>

        <n-button quaternary @click="router.push({ name: 'About' })">
          <template #icon>
            <n-icon><People/></n-icon>
          </template>
          曾经的我们
        </n-button>

        <n-button quaternary @click="goToAnniversary">
          <template #icon>
            <n-icon><Gift/></n-icon>
          </template>
          周年庆
        </n-button>

        <!-- 通知铃铛（仅登录后） -->
        <n-badge v-if="authStore.token" :value="unreadCount || undefined" :max="99">
          <n-button quaternary @click="showNotifications = true">
            <template #icon>
              <n-icon><Notifications /></n-icon>
            </template>
          </n-button>
        </n-badge>

        <!-- 用户相关 -->
        <div v-if="!authStore.token" class="auth-buttons">
          <n-button quaternary @click="router.push({ name: 'Login' })">
            <template #icon>
              <n-icon><LogIn/></n-icon>
            </template>
            登录
          </n-button>
        </div>

        <!-- 登录后菜单 -->
        <n-dropdown
            v-else
            trigger="click"
            :options="dropdownOptions"
            placement="bottom-end"
        >
          <n-button quaternary>
            <div class="nav-user-avatar" :class="'frame-' + navFrame">
              <img :src="authStore.user?.avatar || '/default-avatar.png'" class="nav-avatar-img" referrerpolicy="no-referrer" @error="e => e.target.src='/default-avatar.png'" />
            </div>
            {{ authStore.userDisplayName || '个人中心' }}
          </n-button>
        </n-dropdown>

        <!-- 通知抽屉 -->
        <NotificationDrawer v-model:show="showNotifications" />
      </div>
    </div>
  </n-layout-header>
</template>

<script setup>
import { h, ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from 'vue-router';
import { NIcon, useMessage, useThemeVars } from 'naive-ui';
import {
  Home, Book, Chatbubbles, People, Gift, Ribbon,
  LogIn, PersonCircle, Notifications, Settings,
} from '@vicons/ionicons5';
import NotificationDrawer from './NotificationDrawer.vue';
import { notificationApi } from '../api/notification.js';
const authStore = useAuthStore();
const router = useRouter();
const message = useMessage();
const themeVars = useThemeVars();

const navFrame = computed(() => authStore.achFrame);

const goToAnniversary = () => {
  window.open('https://anniversary.bzlom.cn/', '_blank');
};

const renderIcon = (icon) => () => h(NIcon, { color: themeVars.value.primaryColor }, () => h(icon));

// 用户菜单
const dropdownOptions = [
  {
    label: '个人资料',
    key: 'profile',
    icon: renderIcon(PersonCircle),
    props: { onClick: () => router.push({ name: 'Profile' }) }
  },
  {
    label: '账户设置',
    key: 'settings',
    icon: renderIcon(Settings),
    props: { onClick: () => router.push({ name: 'EditProfile' }) }
  },
  {
    label: '管理后台',
    key: 'admin',
    icon: renderIcon(Settings),
    props: { onClick: () => router.push({ name: 'Admin' }) },
    show: !!authStore.user?.is_admin,
  },
  { type: 'divider' },
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogIn),
    props: {
      style: { color: themeVars.value.errorColor },
      onClick: () => {
        authStore.logout();
        message.success('已安全退出登录');
        router.push({ name: 'Main' });
      }
    }
  }
];

// 通知
const showNotifications = ref(false);
const unreadCount = ref(0);
let pollTimer = null;

const fetchUnreadCount = async () => {
  if (!authStore.token) return;
  try {
    const res = await notificationApi.getNotifications({ page: 1, pageSize: 1 });
    unreadCount.value = res.data.unreadCount || 0;
  } catch { /* ignore */ }
};

onMounted(() => {
  fetchUnreadCount();
  pollTimer = setInterval(fetchUnreadCount, 30000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.navbar {
  background: var(--color-navbar-bg);
  backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--glass-bg-inner);
  height: 64px;
  padding: 0 32px;
}

.navbar-container {
  max-width: 1440px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.2s;

  & span {
    font-size: 20px;
    font-weight: 800;
    background: linear-gradient(45deg, var(--color-brand-primary), var(--color-brand-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  &:hover {
    opacity: 0.8;
  }
}

.navbar-links {
  display: flex;
  gap: 12px;
  align-items: center;

  :deep(.n-button) {
    height: 40px;
    padding: 0 16px;
    border-radius: 8px;
    transition: background-color 0.2s, transform 0.2s;

    &:hover {
      background: var(--glass-bg);
      transform: translateY(-1px);
    }
  }
}

.auth-buttons {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 16px;
  }

  .navbar-links {
    gap: 6px;

    :deep(.n-button) {
      padding: 0 12px;
      font-size: 14px;
    }
  }
}
.logo-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

/* 头像框 */
.nav-user-avatar {
  display: inline-flex;
  border-radius: 50%;
  padding: 2px;
}
.nav-user-avatar.frame-bronze { background: linear-gradient(135deg, #cd7f32, #e8b870); }
.nav-user-avatar.frame-silver { background: linear-gradient(135deg, #a0a0a0, #d4d4d4); }
.nav-user-avatar.frame-gold { background: linear-gradient(135deg, #d4a843, #f0d060); }
.nav-user-avatar.frame-legend { background: linear-gradient(135deg, #af52de, #ff375f, #f0a040, #34c759); animation: navGlow 2s infinite alternate; }

@keyframes navGlow {
  from { box-shadow: 0 0 4px rgba(175,82,222,.3); }
  to { box-shadow: 0 0 10px rgba(255,55,95,.4); }
}

.nav-avatar-img {
  width: 24px; height: 24px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
</style>
