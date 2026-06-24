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
            @click="viewArticle(article)"
          >
            <div class="article-row">
              <div class="article-left">
                <UserFrame :userId="article.userId" :src="article.user?.avatar" :size="36" />
                <div class="article-main">
                  <div class="article-title">{{ article.title }}</div>
                  <div class="article-summary">{{ article.content.substring(0, 80) }}{{ article.content.length > 80 ? '...' : '' }}</div>
                  <div class="article-meta">
                    <n-icon size="13"><Person /></n-icon> {{ article.user?.username || '未知' }}
                    <n-icon size="13"><Time /></n-icon> {{ formatDate(article.updatedAt) }}
                    <n-icon size="13"><Globe /></n-icon> {{ article.region || '未知' }}
                  </div>
                </div>
              </div>
              <div class="article-right" @click.stop>
                <LikeButton v-if="article.id" entity-type="article" :entity-id="article.id" />
                <n-button v-if="authStore.isAdmin" quaternary size="tiny" type="error" @click="confirmDeleteArticle(article.id)">
                  <template #icon><n-icon><Trash /></n-icon></template>
                </n-button>
              </div>
            </div>
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
import { Add, Search, Time, Globe, Trash, Person } from '@vicons/ionicons5';
import LikeButton from '../LikeButton.vue';
import UserFrame from '../UserFrame.vue';

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

.search-input { width: 260px; }
.articles-title { color: var(--color-brand-primary); font-size: 24px; }
.article-list { width: 100%; }

.article-card {
  background: var(--glass-bg-inner);
  border-radius: 10px;
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease;
  box-shadow: var(--shadow-subtle);
}
.article-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-medium); }

.article-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.article-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.article-main { min-width: 0; }

.article-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-summary {
  font-size: 12px; color: var(--color-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 2px;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-subtle);
  margin-top: 4px;
  flex-wrap: nowrap;
}
.article-meta > :not(:first-child) { margin-left: 8px; }

.article-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.empty-state { padding: 48px 0; }

@media (max-width: 768px) {
  .articles-container { padding: 16px; }
  .articles-header { flex-direction: column; }
  .articles-header-actions { width: 100%; flex-direction: column; }
  .search-input { width: 100%; }
  .article-meta-row { gap: 10px; }
  .article-avatar { display: none; }
  .article-title { font-size: 14px; }
}
</style>
