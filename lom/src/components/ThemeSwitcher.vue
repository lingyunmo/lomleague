<template>
  <div class="theme-switcher">
    <n-popover trigger="click" placement="top-end" :width="290">
      <template #trigger>
        <n-button class="theme-trigger" circle size="large" :style="{ background: `var(--color-brand-primary)` }">
          <template #icon>
            <n-icon size="22"><ColorPalette /></n-icon>
          </template>
        </n-button>
      </template>

      <div class="theme-panel">
        <!-- 亮色 / 暗色 -->
        <div class="theme-section">
          <div class="theme-label">
            <n-icon size="16"><n-icon><Sunny v-if="darkMode" /></n-icon></n-icon>
            {{ darkMode ? '暗色模式' : '亮色模式' }}
          </div>
          <n-switch :value="darkMode" @update:value="setDarkMode" size="small">
            <template #checked-icon><n-icon size="14"><Moon /></n-icon></template>
            <template #unchecked-icon><n-icon size="14"><Sunny /></n-icon></template>
          </n-switch>
        </div>

        <!-- 配色选择 -->
        <div class="theme-section">
          <div class="theme-label">主色调</div>
          <div class="color-dots">
            <div
              v-for="(t, key) in presets"
              :key="key"
              class="color-dot"
              :class="{ active: currentKey === key }"
              :style="{ background: t.primary }"
              :title="t.name"
              @click="setTheme(key)"
            >
              <n-icon v-if="currentKey === key" size="14" color="#fff"><Checkmark /></n-icon>
            </div>
          </div>
        </div>

        <!-- 玻璃效果开关 -->
        <div class="theme-section">
          <div class="theme-label">玻璃拟态</div>
          <n-switch :value="glassEnabled" @update:value="setGlass" size="small" />
        </div>
      </div>
    </n-popover>
  </div>
</template>

<script setup>
/**
 * ThemeSwitcher — 主题切换浮动按钮
 * 暗/亮模式 + 6 套主色 + 玻璃效果开关
 */
import { ColorPalette, Checkmark, Sunny, Moon } from '@vicons/ionicons5';
import { useTheme } from '../composables/useTheme.js';

const { presets, currentKey, darkMode, glassEnabled, setTheme, setDarkMode, setGlass } = useTheme();
</script>

<style scoped>
.theme-switcher {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 1000;
}


.theme-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0;
}

.theme-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-label {
  font-size: 13px;
  color: var(--color-text-label);
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-dots {
  display: flex;
  gap: 8px;
}

.color-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  transition: transform .15s ease, border-color .15s ease;
}

.color-dot:hover {
  transform: scale(1.15);
}

.color-dot.active {
  border-color: #fff;
  box-shadow: 0 0 8px rgba(255,255,255,.3);
}

.theme-trigger {
  box-shadow: 0 4px 20px rgba(0,0,0,.5);
  transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease;
  width: 52px !important;
  height: 52px !important;
}

.theme-trigger:hover {
  transform: scale(1.12);
  box-shadow: 0 6px 28px rgba(0,0,0,.6);
}
</style>
