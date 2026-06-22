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
                <n-icon>
                  <Time />
                </n-icon>
                <span>{{ formatDate(article.updatedAt) }}</span>
                <n-icon>
                  <Globe />
                </n-icon>
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

          <!-- 删除按钮 -->
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

      <n-empty v-if="!loading && articles.length === 0" description="暂无文章" class="empty-state">
        <template #extra>
          <n-button v-if="authStore.isAdmin" @click="showAddArticleModal = true">发布第一篇文章</n-button>
        </template>
      </n-empty>

      <Pagination
        v-model:page="currentPage"
        v-model:page-size="pageSize"
        :total="totalArticles"
        @change="fetchArticles"
      />
    </div>

    <!-- 新增文章弹窗 -->
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
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import api from '../../api/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { formatDate } from '../../utils/date.js';
import Pagination from '../Pagination.vue';
import AddArticle from './AddArticle.vue';
import { Add, Search, Time, Globe, Trash } from '@vicons/ionicons5';

const authStore = useAuthStore();
const dialog = useDialog();

const router = useRouter();
const articles = ref([]);
const loading = ref(true);
const message = useMessage();
const hoveredArticle = ref(null);
const showAddArticleModal = ref(false);

const currentPage = ref(1);
const pageSize = ref(20);
const totalArticles = ref(0);
const searchKeyword = ref('');
const debouncedKeyword = ref('');

let debounceTimer = null;
watch(searchKeyword, (val) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = val;
    currentPage.value = 1;
    fetchArticles();
  }, 300);
});

const fetchArticles = async () => {
  try {
    const response = await api.get('/articles', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: debouncedKeyword.value || undefined,
      },
    });
    articles.value = response.data.articles;
    totalArticles.value = response.data.total;
  } catch (error) {
    console.error('获取文章失败:', error);
    message.error('获取文章失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const handleArticleCreated = () => {
  showAddArticleModal.value = false;
  currentPage.value = 1;
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
        await api.delete(`/articles/${articleId}`);
        message.success('文章已删除');
        fetchArticles();
      } catch (error) {
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

onUnmounted(() => {
  clearTimeout(debounceTimer);
});
</script>

<style scoped>
.articles-container {
  display: flex;
  justify-content: center;
  padding: 40px;
  background: linear-gradient(135deg, #141e30, #243b55);
  animation: fadeIn 1s ease-in-out;
}

.articles-wrapper {
  width: 100%;
  max-width: 1200px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
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
  color: #4ecca3;
  font-size: 24px;
}

.article-list {
  width: 100%;
}

.article-card {
  position: relative;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.article-content {
  flex: 1;
  min-width: 0; /* 防止内容过长导致换行 */
}

.article-title {
  font-size: 18px;
  font-weight: bold;
  color: #4ecca3;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-summary {
  font-size: 14px;
  color: #ccc;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-meta {
  font-size: 12px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0; /* 防止元信息被压缩 */
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
  color: #ccc;
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