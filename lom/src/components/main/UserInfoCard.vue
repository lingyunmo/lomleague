<template>
  <n-card class="main-card" hoverable>
    <div class="main-header">
      <n-avatar
          round
          size="large"
          :src="user.avatar || '/default-avatar.png'"
          class="main-avatar"
      />
      <div class="main-info">
        <h2 class="welcome-title">欢迎回来，{{ user.username || '冒险者' }}！</h2>
        <p class="welcome-subtitle">{{ serverStatus }}</p>
      </div>
    </div>

    <n-divider />

    <!-- 服务器状态轮播 -->
    <n-carousel autoplay class="server-carousel">
      <div v-for="server in servers" :key="server.id" class="server-card">
        <n-space vertical>
          <n-tag :bordered="false" :type="server.online ? 'success' : 'error'">
            <template #icon>
              <n-icon :component="server.online ? CheckmarkCircle : CloseCircle" />
            </template>
            {{ server.type }} {{ server.online ? '在线' : '离线' }}
          </n-tag>
          <n-text depth="3">{{ server.address }}</n-text>
        </n-space>
      </div>
    </n-carousel>
  </n-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { NAvatar, NCard, NDivider, NCarousel, NTag, NSpace, NText, NIcon } from 'naive-ui';
import { CheckmarkCircle, CloseCircle } from '@vicons/ionicons5';
import axios from 'axios';
import api from '../../api/api.js';

// 定义 props
const props = defineProps({
  user: {
    type: Object,
    default: () => ({
      username: '',
      avatar: '',
    }),
  },
});

// 服务器状态数据
const servers = ref([]);

const serverStatus = ref('正在检测服务器状态...');

let statusTimer = null;

const checkInternet = async () => {
  try {
    const response = await axios.get('https://httpbin.org/get', { timeout: 3000 });
    return response.data.headers.Host === 'httpbin.org';
  } catch {
    return false;
  }
};

const checkServerHealth = async () => {
  try {
    const response = await api.get('/health', { timeout: 3000 });
    return response.status === 200;
  } catch {
    return false;
  }
};

const fetchServerStatus = async () => {
  try {
    const [internetStatus, serverHealthStatus] = await Promise.all([
      checkInternet(),
      checkServerHealth(),
    ]);

    servers.value = [
      {
        id: Date.now() + '-internet',
        type: '互联网',
        address: '互联网连接检测',
        online: internetStatus,
      },
      {
        id: Date.now() + '-server',
        type: '服务器',
        address: '服务器健康检查api',
        online: serverHealthStatus,
      },
    ];

    serverStatus.value = '状态检测完成';
    await nextTick();
  } catch {
    serverStatus.value = '状态检测失败';
  }
};

onMounted(() => {
  fetchServerStatus();
  statusTimer = setInterval(fetchServerStatus, 30000);
});

onUnmounted(() => {
  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
});
</script>

<style scoped>
.main-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  margin-bottom: 24px;
}

.main-header {
  display: flex;
  align-items: center;
}

.main-avatar {
  margin-right: 16px;
}

.main-info {
  flex: 1;
}

.welcome-title {
  margin: 0;
  font-size: 24px;
  color: #fff;
}

.welcome-subtitle {
  margin: 0;
  font-size: 14px;
  color: #888;
}

.server-carousel {
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
}

.server-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}
</style>
