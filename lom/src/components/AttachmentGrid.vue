<template>
  <div v-if="files.length" class="post-attachments">
    <h3>
      <n-icon><Attach /></n-icon> 附件：
    </h3>
    <div class="attachment-grid">
      <div
          v-for="(file, index) in files"
          :key="index"
          class="attachment-item"
      >
        <!-- 图片类型 -->
        <template v-if="isImage(file)">
          <img :src="file" class="attachment-img" alt="附件图片" />
        </template>

        <!-- 音频类型 -->
        <template v-else-if="isAudio(file)">
          <audio :src="file" controls class="attachment-media" />
          <div class="attachment-filename">{{ formatFileName(file) }}</div>
        </template>

        <!-- 视频类型 -->
        <template v-else-if="isVideo(file)">
          <video :src="file" controls class="attachment-media" />
          <div class="attachment-filename">{{ formatFileName(file) }}</div>
        </template>

        <!-- 其他文件类型 -->
        <template v-else>
          <a
              :href="file"
              :download="formatFileName(file)"
              class="attachment-link"
          >
            <n-icon size="24"><Download /></n-icon>
            <div class="attachment-filename">{{ formatFileName(file) }}</div>
          </a>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { NIcon } from 'naive-ui'
import { Attach, Download } from '@vicons/ionicons5'

const props = defineProps({
  files: {
    type: Array,
    required: true
  },
  isImage: {
    type: Function,
    default: (file) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file)
  },
  isAudio: {
    type: Function,
    default: (file) => /\.(mp3|wav|ogg)$/i.test(file)
  },
  isVideo: {
    type: Function,
    default: (file) => /\.(mp4|webm|ogg)$/i.test(file)
  },
  formatFileName: {
    type: Function,
    default: (file) => {
      const parts = file.split('/')
      const rawName = parts[parts.length - 1]
      return rawName.replace(/^\d+_/, '')
    }
  }
})
</script>

<style scoped>
/* 完全保持原有样式 */
.post-attachments {
  margin-top: 16px;
}

.attachment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.attachment-item {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
}

.attachment-img {
  width: 100%;
  max-width: 300px;
  border-radius: 4px;
}

.attachment-media {
  width: 100%;
  max-width: 400px;
}

.attachment-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #4ecca3;
  text-decoration: none;
}

.attachment-filename {
  margin-top: 4px;
  font-size: 12px;
  color: #888;
  word-break: break-all;
  text-align: center;
}
</style>