<template>
  <n-modal :show="show" :mask-closable="false" preset="card" style="width:420px" title="欢迎来到 lom 联盟" @close="done">
    <div class="setup-wizard">
      <p class="setup-intro">首次访问，请选择您的偏好设置</p>

      <!-- 暗/亮 -->
      <div class="setup-row">
        <span class="setup-label">主题</span>
        <n-switch v-model:value="dark" size="large">
          <template #checked>🌙 暗色</template>
          <template #unchecked>☀️ 亮色</template>
        </n-switch>
      </div>

      <!-- 色系 -->
      <div class="setup-row">
        <span class="setup-label">主色调</span>
        <div class="setup-colors">
          <button
            v-for="(t, k) in PRESETS" :key="k"
            class="setup-color" :class="{ active: color === k }"
            :style="{ background: t.primary }" :title="t.name"
            type="button" @click="color = k"
          >
            <n-icon v-if="color === k" size="14" color="#fff"><Checkmark /></n-icon>
          </button>
        </div>
      </div>

      <!-- 玻璃 -->
      <div class="setup-row">
        <span class="setup-label">玻璃拟态</span>
        <n-switch v-model:value="glass" size="large">
          <template #checked>开启</template>
          <template #unchecked>关闭</template>
        </n-switch>
      </div>

      <n-button type="primary" block size="large" @click="done" style="margin-top:20px">
        确认，进入联盟
      </n-button>
      <p class="setup-hint">💡 之后可通过右下角调色盘随时更改</p>
    </div>
  </n-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Checkmark } from '@vicons/ionicons5'
import { useTheme, PRESETS } from '../composables/useTheme.js'

const { darkMode, currentKey, glassEnabled, setDarkMode, setTheme, setGlass } = useTheme()
const show = ref(!localStorage.getItem('lom_setup_done'))
const dark = ref(darkMode.value)
const color = ref(currentKey.value)
const glass = ref(glassEnabled.value)

// 实时预览
watch(dark, v => setDarkMode(v))
watch(color, v => setTheme(v))
watch(glass, v => setGlass(v))

const done = () => {
  localStorage.setItem('lom_setup_done', '1')
  show.value = false
}
</script>

<style scoped>
.setup-wizard { display: flex; flex-direction: column; gap: 20px; }
.setup-intro { margin: 0; font-size: 14px; color: var(--color-text-muted); text-align: center; }
.setup-row { display: flex; align-items: center; justify-content: space-between; }
.setup-label { font-size: 14px; color: var(--color-text-primary); }
.setup-colors { display: flex; gap: 8px; }
.setup-color {
  width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  border: 2.5px solid rgba(255,255,255,.15); transition: all .2s;
  background: transparent; outline: none; padding: 0;
}
.setup-color:hover { transform: scale(1.12); }
.setup-color.active { border-color: #fff; box-shadow: 0 0 8px rgba(255,255,255,.3); }
.setup-hint { margin: 0; font-size: 12px; color: var(--color-text-subtle); text-align: center; }
</style>
