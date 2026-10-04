<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-dialog-provider>
      <n-message-provider>
        <div class="app-layout">
          <a href="#main-content" class="skip-link">跳到主要内容</a>
          <Navbar />
          <main id="main-content" class="app-main" tabindex="-1">
            <router-view />
          </main>
          <Footer />
        </div>
        <ThemeSwitcher />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<script setup>
/**
 * App.vue — 根组件
 * Naive UI 主题联动 useTheme：暗/亮模式 + 品牌色同步
 */
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { darkTheme, zhCN, dateZhCN } from 'naive-ui';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import ThemeSwitcher from './components/ThemeSwitcher.vue';
import { useAuthStore } from './stores/authStore.js';
import { useTheme, naiveThemeOverrides } from './composables/useTheme.js';
import { SESSION_EXPIRED_EVENT } from './api/session.js';

const { darkMode } = useTheme();
const naiveTheme = computed(() => (darkMode.value ? darkTheme : null));
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
function handleSessionExpired() {
  authStore.logout();
  if (route.meta.requiresAuth) router.replace({ name: 'Login', query: { redirect: route.fullPath } });
}
window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
onUnmounted(() => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired));

onMounted(async () => {
  await authStore.fetchUser();
  authStore.fetchAchievements();
});
</script>

<style>
.skip-link {
  position: fixed;
  top: -80px;
  left: 16px;
  z-index: 10000;
  padding: 12px;
  background: var(--color-bg-dark);
  color: var(--color-text-primary);
}
.skip-link:focus {
  top: 8px;
}
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.app-main > * {
  flex: 1;
}
</style>
