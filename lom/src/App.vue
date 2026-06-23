<template>
  <n-dialog-provider>
  <n-message-provider>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
    <div class="app-layout">
      <Navbar/>
      <main class="app-main">
        <router-view />
      </main>
      <Footer/>
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
import { computed } from 'vue';
import { darkTheme } from 'naive-ui';
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
import ThemeSwitcher from "./components/ThemeSwitcher.vue";
import { useTheme, naiveThemeOverrides } from './composables/useTheme.js';

const { darkMode } = useTheme();
const naiveTheme = computed(() => darkMode.value ? darkTheme : null);
</script>

<style>
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
