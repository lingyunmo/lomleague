<template>
  <div :aria-busy="loading">
    <CommunityShell
      title="联盟公告"
      eyebrow="THE ALLIANCE BULLETIN / 02"
      description="从重要消息到项目进展。记录联盟的每一次前行。"
      :total="totalArticles"
      :keyword="searchKeyword"
    >
      <template #actions>
        <n-input
          v-model:value="searchKeyword"
          :input-props="{ 'aria-label': '搜索文章' }"
          placeholder="搜索文章..."
          clearable
        >
          <template #prefix
            ><n-icon><Search /></n-icon
          ></template>
        </n-input>
        <n-button v-if="authStore.isAdmin" type="primary" @click="showAddArticleModal = true">
          <template #icon
            ><n-icon><Add /></n-icon></template
          >发布公告
        </n-button>
      </template>
      <div v-if="loading" class="list-loading" role="status"><n-spin size="small" /><span>正在加载文章…</span></div>
      <ListFetchFeedback :message="error" @retry="fetchArticles()" />
      <div class="community-list">
        <CommunityEntry
          v-for="article in articles"
          :key="article.id"
          :item="article"
          type="article"
          :can-delete="authStore.isAdmin"
          @delete="confirmDeleteArticle"
        />
      </div>
      <n-empty
        v-if="!loading && !error && articles.length === 0"
        :description="searchKeyword ? '没有匹配的文章' : '暂无文章'"
        class="empty-state"
      >
        <template #extra>
          <n-button v-if="searchKeyword" @click="searchKeyword = ''">清空搜索</n-button>
          <n-button v-else-if="authStore.isAdmin" @click="showAddArticleModal = true">发布第一篇文章</n-button>
        </template>
      </n-empty>
      <Pagination
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="totalArticles"
        @change="onPageChange"
      />
    </CommunityShell>
    <n-modal
      v-model:show="showAddArticleModal"
      title="新增文章"
      preset="card"
      style="width: min(760px, calc(100vw - 32px)); padding: 2px; border-radius: 16px; overflow: auto"
    >
      <AddArticle v-if="showAddArticleModal" @created="handleArticleCreated" @cancel="showAddArticleModal = false" />
    </n-modal>
  </div>
</template>
<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { Add, Search } from '@vicons/ionicons5';
import { articleApi } from '../../api/article.js';
import { useAuthStore } from '../../stores/authStore.js';
import { usePaginatedFetch } from '../../composables/usePaginatedFetch.js';
import { useListRouteQuery } from '../../composables/useListRouteQuery.js';
import CommunityShell from '../community/CommunityShell.vue';
import CommunityEntry from '../community/CommunityEntry.vue';
import Pagination from '../Pagination.vue';
import ListFetchFeedback from '../ListFetchFeedback.vue';
import AddArticle from './AddArticle.vue';

const authStore = useAuthStore();
const route = useRoute();
const dialog = useDialog();
const message = useMessage();
const {
  data: articles,
  total: totalArticles,
  loading,
  error,
  pagination,
  fetch: fetchArticles,
} = usePaginatedFetch((params) => articleApi.getArticles(params));
const { searchKeyword, onPageChange, refresh } = useListRouteQuery(pagination, fetchArticles);
const showAddArticleModal = ref(false);
let generation = 0;
let confirmationSequence = 0;
let disposed = false;
let pendingDialog;
const context = () => ({ token: authStore.token, generation, fullPath: route.fullPath });
const isCurrent = (request) =>
  !disposed &&
  route.name === 'Articles' &&
  request.token === authStore.token &&
  request.generation === generation &&
  request.fullPath === route.fullPath;
const resetPrivateState = () => {
  generation++;
  confirmationSequence++;
  pendingDialog?.destroy();
  pendingDialog = undefined;
  showAddArticleModal.value = false;
};
watch(
  [() => authStore.token, () => authStore.isAdmin, () => authStore.user?.id, () => route.fullPath],
  resetPrivateState,
  { flush: 'sync' },
);
onBeforeUnmount(() => {
  disposed = true;
  resetPrivateState();
});
const handleArticleCreated = () => {
  showAddArticleModal.value = false;
  refresh();
};
const confirmDeleteArticle = (articleId) => {
  if (!authStore.token || !authStore.isAdmin) return;
  pendingDialog?.destroy();
  const sequence = ++confirmationSequence;
  const request = context();
  let confirmed = false;
  pendingDialog = dialog.warning({
    title: '确认删除',
    content: '删除后无法恢复，确定删除此文章？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (confirmed || sequence !== confirmationSequence || !isCurrent(request)) return;
      confirmed = true;
      try {
        await articleApi.deleteArticle(articleId);
        if (!isCurrent(request)) return;
        message.success('文章已删除');
        fetchArticles();
      } catch {
        if (!isCurrent(request)) return;
        message.error('删除失败');
      }
    },
  });
};
</script>
<style scoped>
.community-list {
  display: grid;
  gap: 12px;
}
.list-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  color: var(--color-text-secondary);
}
.empty-state {
  padding: 52px 0;
}
</style>
