<template>
  <div class="forums-container" v-if="!loading">
    <div class="forums-wrapper">
      <div class="forums-header">
        <h2 class="forums-title">论坛帖子</h2>
        <div class="forums-header-actions">
          <n-input
            v-model:value="searchKeyword"
            placeholder="搜索帖子..."
            clearable
            class="search-input"
          >
            <template #prefix><n-icon><Search /></n-icon></template>
          </n-input>
          <n-button v-if="authStore.token" type="primary" @click="showAddPostModal = true">
          <template #icon>
            <n-icon>
              <Add />
            </n-icon>
          </template>
          新增帖子
          </n-button>
        </div>
      </div>

      <n-space vertical size="small" class="post-list">
        <n-card
            v-for="post in posts"
            :key="post.id"
            class="post-card"
            hoverable
            embedded
            @click="viewPost(post.id)"
            @mouseenter="hoveredPost = post.id"
            @mouseleave="hoveredPost = null"
            :style="{
            transform: hoveredPost === post.id ? 'translateY(-2px)' : 'none',
          }"
        >
          <n-space justify="space-between" align="center">
            <n-space align="center" class="post-user-info">
              <n-avatar :src="post.user.avatar || '/default-avatar.png'" round size="large" />
              <span class="post-username">{{ post.user.username }}</span>
            </n-space>

            <div class="post-content">
              <p class="post-text">{{ post.title }}</p>
            </div>

            <div class="post-meta">
              <p>
                <n-icon>
                  <Time />
                </n-icon>
                {{ formatDate(post.updatedAt) }}
              </p>
              <p>
                <n-icon>
                  <Chatbubbles />
                </n-icon>
                {{ post._count?.replies || 0 }} 回复
              </p>
            </div>
          </n-space>

              <!-- 地区标签 -->
          <n-tag type="info" round class="post-region">
            <n-icon>
              <Globe />
            </n-icon>
            {{ post.region || '未知地区' }}
          </n-tag>

          <!-- 删除按钮 -->
          <n-button
            v-if="authStore.user?.id === post.userId || authStore.isAdmin"
            quaternary
            size="tiny"
            type="error"
            class="delete-btn"
            @click.stop="confirmDeletePost(post.id)"
          >
            <template #icon><n-icon><Trash /></n-icon></template>
          </n-button>
        </n-card>
      </n-space>

      <n-empty v-if="!loading && posts.length === 0" description="暂无帖子" class="empty-state">
        <template #extra>
          <n-button v-if="authStore.token" @click="showAddPostModal = true">发布第一个帖子</n-button>
        </template>
      </n-empty>

      <Pagination
        v-model:page="currentPage"
        v-model:page-size="pageSize"
        :total="totalPosts"
        @change="fetchPosts"
      />
    </div>

    <!-- 新增帖子弹窗 -->
    <n-modal
        v-model:show="showAddPostModal"
        title="新增帖子"
        preset="card"
        style="width: 60%; padding: 2px; border-radius: 16px; overflow: auto;"
    >
      <AddForum @created="handlePostCreated" @cancel="showAddPostModal = false" />
    </n-modal>
  </div>

  <div v-else class="loading-container">
    <n-spin size="large" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import api from '../../api/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { formatDate } from '../../utils/date.js';
import Pagination from '../Pagination.vue';
import AddForum from './AddForum.vue';
import { Add, Search, Time, Chatbubbles, Globe, Trash } from '@vicons/ionicons5';

const authStore = useAuthStore();
const dialog = useDialog();

const posts = ref([]);
const loading = ref(true);
const message = useMessage();
const router = useRouter();
const hoveredPost = ref(null);
const showAddPostModal = ref(false);

const currentPage = ref(1);
const pageSize = ref(20);
const totalPosts = ref(0);
const searchKeyword = ref('');
const debouncedKeyword = ref('');

let debounceTimer = null;
watch(searchKeyword, (val) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = val;
    currentPage.value = 1;
    fetchPosts();
  }, 300);
});

const fetchPosts = async () => {
  try {
    const response = await api.get('/forum/posts', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: debouncedKeyword.value || undefined,
      },
    });
    posts.value = response.data.posts;
    totalPosts.value = response.data.total;
  } catch (error) {
    console.error('获取帖子失败:', error);
    message.error('获取帖子失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const handlePostCreated = () => {
  showAddPostModal.value = false;
  currentPage.value = 1;
  fetchPosts();
};

const confirmDeletePost = (postId) => {
  dialog.warning({
    title: '确认删除',
    content: '删除后无法恢复，确定删除此帖子？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/forum/posts/${postId}`);
        message.success('帖子已删除');
        fetchPosts();
      } catch (error) {
        message.error('删除失败');
      }
    },
  });
};

const viewPost = (postId) => {
  router.push({ name: 'Forum', params: { id: postId } });
};

onMounted(() => {
  fetchPosts();
});

onUnmounted(() => {
  clearTimeout(debounceTimer);
});
</script>

<style scoped>
.forums-container {
  display: flex;
  justify-content: center;
  padding: 40px;
  background: linear-gradient(135deg, #141e30, #243b55);
  animation: fadeIn 1s ease-in-out;
}

.forums-wrapper {
  width: 100%;
  max-width: 1200px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.forums-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.forums-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 260px;
}

.forums-title {
  color: #4ecca3;
  font-size: 24px;
}

.post-list {
  width: 100%;
}

.post-card {
  position: relative;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.post-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.post-username {
  font-size: 18px;
  font-weight: bold;
  color: #4ecca3;
}

.post-content {
  flex: 1;
  margin: 0 12px;
}

.post-text {
  font-size: 14px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post-meta {
  font-size: 12px;
  color: #888;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 修正后的地区标签样式 */
.post-region {
  position: absolute;
  right: 12px;
  bottom: 12px;
}
.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.post-card:hover .delete-btn {
  opacity: 1;
}

.empty-state {
  padding: 48px 0;
}

@media (max-width: 768px) {
  .forums-container {
    padding: 16px;
  }

  .forums-header {
    flex-direction: column;
  }

  .forums-header-actions {
    width: 100%;
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .post-card :deep(.n-space) {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>