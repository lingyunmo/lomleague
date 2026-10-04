<template>
  <n-dialog-provider>
    <n-message-provider>
      <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
        <div class="app-layout">
          <a href="#main-content" class="skip-link">跳到主要内容</a>
          <Navbar />
          <main id="main-content" class="app-main" tabindex="-1">
            <router-view />
          </main>
          <Footer />
        </div>
        <ThemeSwitcher />
      </n-config-provider>
    </n-message-provider>
  </n-dialog-provider>
</template>

<script setup>
/**
 * App.vue — 根组件
 * Naive UI 主题联动 useTheme：暗/亮模式 + 品牌色同步
 */
import { computed, onMounted } from 'vue';
import { darkTheme } from 'naive-ui';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import ThemeSwitcher from './components/ThemeSwitcher.vue';
import { useAuthStore } from './stores/authStore.js';
import { useTheme, naiveThemeOverrides } from './composables/useTheme.js';

const { darkMode } = useTheme();
const naiveTheme = computed(() => (darkMode.value ? darkTheme : null));
const authStore = useAuthStore();

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
