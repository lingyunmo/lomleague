<template>
  <n-card class="download-card" hoverable title="Minecraft第三方启动器">
    <n-space vertical>
      <n-button
          type="primary"
          block
          @click="openExternal('https://bbsmc.net/software/pcl')"
      >
        <template #icon>
          <n-icon>
            <Rocket/>
          </n-icon>
        </template>
        PCL2启动器下载（bbsmc.net）【强烈推荐！】
        <n-icon>
          <Desktop/>
        </n-icon>
      </n-button>

      <n-button
          type="info"
          block
          @click="openExternal('https://hmcl.huangyuhui.net')"
      >
        <template #icon>
          <n-icon>
            <CodeDownload/>
          </n-icon>
        </template>
        HMCL启动器下载（官网）
        <n-icon>
          <Flask/>
        </n-icon>
      </n-button>

      <n-button
          type="success"
          block
          @click="openExternal('https://multimc.org')"
      >
        <template #icon>
          <n-icon>
            <Folder/>
          </n-icon>
        </template>
        MultiMC启动器下载
      </n-button>

      <n-button
          type="warning"
          block
          @click="openExternal('https://www.bakaxl.com')"
      >
        <template #icon>
          <n-icon>
            <Brush/>
          </n-icon>
        </template>
        BakaXL启动器下载
      </n-button>
    </n-space>
  </n-card>
</template>

<script setup>
import {Rocket, CodeDownload, Folder, Brush, Desktop, Flask} from '@vicons/ionicons5'

// 打开外部链接
const openExternal = (url) => {
  window.open(url, '_blank')
}
</script>

<style scoped>
.download-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.download-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.n-button {
  margin-bottom: 12px;
  transition: transform 0.2s ease;
}

.n-button:hover {
  transform: scale(1.05);
}

/* 响应式调整 */
@media (max-width: 600px) {
  .download-card {
    margin-bottom: 16px;
  }
}
</style>