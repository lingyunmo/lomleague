<template>
  <div class="articles-container" v-if="!loading">
    <div class="articles-wrapper">
      <div class="articles-header">
        <h2 class="articles-title">文章列表</h2>
        <div class="articles-header-actions">
          <n-input
            v-model:value="searchKeyword"
            placeholder="搜索文章..."
            clearable
            class="search-input"
          >
            <template #prefix><n-icon><Search /></n-icon></template>
          </n-input>
          <n-button v-if="authStore.isAdmin" type="primary" @click="showAddArticleModal = true">
          <template #icon>
            <n-icon>
              <Add />
            </n-icon>
          </template>
          新增文章
          </n-button>
        </div>
      </div>

      <n-space vertical size="small" class="article-list">
        <n-card
            v-for="article in articles"
            :key="article.id"
            class="article-card"
            hoverable
            embedded
            @click="viewArticle(article)"
            @mouseenter="hoveredArticle = article.id"
            @mouseleave="hoveredArticle = null"
            :style="{
            transform: hoveredArticle === article.id ? 'translateY(-2px)' : 'none',
          }"
        >
          <n-space justify="space-between" align="center">
            <div class="article-content">
              <p class="article-title">{{ article.title }}</p>
              <p class="article-summary">{{ article.content.substring(0, 100) }}...</p>
            </div>

            <div class="article-meta">
              <n-space align="center" :size="8">
                <n-icon><Time /></n-icon>
                <span>{{ formatDate(article.updatedAt) }}</span>
                <n-icon><Globe /></n-icon>
                <span>{{ article.region || '未知地区' }}</span>
                <div class="article-author">
                  <img
                      :src="article.user?.avatar || '/default-avatar.png'"
                      alt="avatar"
                      class="author-avatar"
                  />
                  <span class="author-username">{{ article.user?.username || '未知发布人' }}</span>
                </div>
              </n-space>
            </div>
          </n-space>

          <n-button
            v-if="authStore.isAdmin"
            quaternary
            size="tiny"
            type="error"
            class="delete-btn"
            @click.stop="confirmDeleteArticle(article.id)"
          >
            <template #icon><n-icon><Trash /></n-icon></template>
          </n-button>
        </n-card>
      </n-space>

      <n-empty v-if="articles.length === 0" description="暂无文章" class="empty-state">
        <template #extra>
          <n-button v-if="authStore.isAdmin" @click="showAddArticleModal = true">发布第一篇文章</n-button>
        </template>
      </n-empty>

      <Pagination
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="totalArticles"
        @change="onPageChange"
      />
    </div>

    <n-modal
        v-model:show="showAddArticleModal"
        title="新增文章"
        preset="card"
        style="width: 60%; padding: 2px; border-radius: 16px; overflow: auto;"
    >
      <AddArticle @created="handleArticleCreated" @cancel="showAddArticleModal = false" />
    </n-modal>
  </div>

  <div v-else class="loading-container">
    <n-spin size="large" />
  </div>
</template>

<script setup>
// ============================================================
// Articles.vue — 文章列表
// Issue #10: 接入 useDebounce + usePaginatedFetch composables
// ============================================================
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { articleApi } from '../../api/article.js';
import { useAuthStore } from '../../stores/authStore.js';
import { usePaginatedFetch } from '../../composables/usePaginatedFetch.js';
import { useDebounce } from '../../composables/useDebounce.js';
import { formatDate } from '../../utils/date.js';
import Pagination from '../Pagination.vue';
import AddArticle from './AddArticle.vue';
import { Add, Search, Time, Globe, Trash } from '@vicons/ionicons5';

const authStore = useAuthStore();
const dialog = useDialog();
const message = useMessage();
const router = useRouter();

const {
  data: articles,
  total: totalArticles,
  loading,
  pagination,
  fetch: fetchArticles,
  onPageChange,
} = usePaginatedFetch(
  (params) => articleApi.getArticles(params),
  {},
);

const searchKeyword = ref('');
const { debounced: debouncedSearch } = useDebounce((keyword) => {
  fetchArticles({ keyword: keyword || undefined });
}, 300);

watch(searchKeyword, (val) => {
  pagination.page = 1;
  debouncedSearch(val);
});

const hoveredArticle = ref(null);
const showAddArticleModal = ref(false);

const handleArticleCreated = () => {
  showAddArticleModal.value = false;
  pagination.page = 1;
  fetchArticles();
};

const confirmDeleteArticle = (articleId) => {
  dialog.warning({
    title: '确认删除',
    content: '删除后无法恢复，确定删除此文章？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await articleApi.deleteArticle(articleId);
        message.success('文章已删除');
        fetchArticles();
      } catch {
        message.error('删除失败');
      }
    },
  });
};

const viewArticle = (article) => {
  router.push({ name: 'Article', params: { id: article.id } });
};

onMounted(() => {
  fetchArticles();
});
</script>

<style scoped>
.articles-container {
  display: flex;
  justify-content: center;
  padding: 40px;
  min-height: 100%;
  background: linear-gradient(135deg, var(--color-bg-gradient-start), var(--color-bg-gradient-end));
  animation: fadeIn 1s ease-in-out;
}

.articles-wrapper {
  width: 100%;
  max-width: 1200px;
  background: var(--glass-bg);
  border-radius: var(--glass-radius-sm);
  padding: 16px;
  box-shadow: var(--shadow-deep);
  backdrop-filter: var(--glass-blur);
}

.articles-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.articles-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 260px;
}

.articles-title {
  color: var(--color-brand-primary);
  font-size: 24px;
}

.article-list {
  width: 100%;
}

.article-card {
  position: relative;
  padding: 12px;
  border-radius: 8px;
  background: var(--glass-bg-inner);
  transition: var(--transition-card);
  cursor: pointer;
  box-shadow: var(--shadow-subtle);
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.article-content {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-brand-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-summary {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.article-author {
  display: flex;
  align-items: center;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 6px;
}

.author-username {
  font-size: 12px;
  color: var(--color-text-muted);
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.article-card:hover .delete-btn {
  opacity: 1;
}

.empty-state {
  padding: 48px 0;
}

@media (max-width: 768px) {
  .articles-container {
    padding: 16px;
  }

  .articles-header {
    flex-direction: column;
  }

  .articles-header-actions {
    width: 100%;
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .article-card :deep(.n-space) {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
