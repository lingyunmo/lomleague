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
                <n-icon><Time /></n-icon>
                {{ formatDate(post.updatedAt) }}
              </p>
              <p>
                <n-icon><Chatbubbles /></n-icon>
                {{ post._count?.replies || 0 }} 回复
              </p>
            </div>
          </n-space>

          <n-tag type="info" round class="post-region">
            <n-icon><Globe /></n-icon>
            {{ post.region || '未知地区' }}
          </n-tag>

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
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="totalPosts"
        @change="onPageChange"
      />
    </div>

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
// ============================================================
// Forums.vue — 论坛帖子列表
// Issue #10: 接入 useDebounce + usePaginatedFetch composables
// ============================================================
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { forumApi } from '../../api/forum.js';
import { useAuthStore } from '../../stores/authStore.js';
import { usePaginatedFetch } from '../../composables/usePaginatedFetch.js';
import { useDebounce } from '../../composables/useDebounce.js';
import { formatDate } from '../../utils/date.js';
import Pagination from '../Pagination.vue';
import AddForum from './AddForum.vue';
import { Add, Search, Time, Chatbubbles, Globe, Trash } from '@vicons/ionicons5';

const authStore = useAuthStore();
const dialog = useDialog();
const message = useMessage();
const router = useRouter();

const {
  data: posts,
  total: totalPosts,
  loading,
  pagination,
  fetch: fetchPosts,
  onPageChange,
} = usePaginatedFetch(
  (params) => forumApi.getPosts(params),
  {},
);

const searchKeyword = ref('');
const { debounced: debouncedSearch } = useDebounce((keyword) => {
  fetchPosts({ keyword: keyword || undefined });
}, 300);

watch(searchKeyword, (val) => {
  pagination.page = 1;
  debouncedSearch(val);
});

const hoveredPost = ref(null);
const showAddPostModal = ref(false);

const handlePostCreated = () => {
  showAddPostModal.value = false;
  pagination.page = 1;
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
        await forumApi.deletePost(postId);
        message.success('帖子已删除');
        fetchPosts();
      } catch {
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
</script>

<style scoped>
.forums-container {
  display: flex;
  justify-content: center;
  padding: 40px;
  min-height: 100%;
  background: linear-gradient(135deg, var(--color-bg-gradient-start), var(--color-bg-gradient-end));
  animation: fadeIn 1s ease-in-out;
}

.forums-wrapper {
  width: 100%;
  max-width: 1200px;
  background: var(--glass-bg);
  border-radius: var(--glass-radius-sm);
  padding: 16px;
  box-shadow: var(--shadow-deep);
  backdrop-filter: var(--glass-blur);
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
  color: var(--color-brand-primary);
  font-size: 24px;
}

.post-list {
  width: 100%;
}

.post-card {
  position: relative;
  padding: 12px;
  border-radius: 8px;
  background: var(--glass-bg);
  transition: var(--transition-card);
  cursor: pointer;
  box-shadow: var(--shadow-subtle);
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.post-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.post-username {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-brand-primary);
}

.post-content {
  flex: 1;
  margin: 0 12px;
}

.post-text {
  font-size: 14px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

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
