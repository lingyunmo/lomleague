<template>
  <div :aria-busy="loading">
    <CommunityShell
      title="社区论坛"
      eyebrow="THE BUILDERS' LOGBOOK / 01"
      description="聊聊新世界，分享建造与作品。让一次探索，成为下一段故事。"
      :total="totalPosts"
      :keyword="searchKeyword"
    >
      <template #actions>
        <n-input
          v-model:value="searchKeyword"
          :input-props="{ 'aria-label': '搜索帖子' }"
          placeholder="搜索帖子..."
          clearable
        >
          <template #prefix
            ><n-icon><Search /></n-icon
          ></template>
        </n-input>
        <n-button v-if="authStore.token" type="primary" @click="showAddPostModal = true">
          <template #icon
            ><n-icon><Add /></n-icon></template
          >发布帖子
        </n-button>
        <RouterLink v-else class="community-signin" :to="{ name: 'Login', query: { redirect: route.fullPath } }"
          >登录后发布 ↗</RouterLink
        >
      </template>
      <div v-if="loading" class="list-loading" role="status"><n-spin size="small" /><span>正在加载帖子…</span></div>
      <ListFetchFeedback :message="error" @retry="fetchPosts()" />
      <div class="community-list">
        <CommunityEntry
          v-for="post in posts"
          :key="post.id"
          :item="post"
          type="post"
          :can-delete="authStore.user?.id === post.userId || authStore.isAdmin"
          @delete="confirmDeletePost"
        />
      </div>
      <n-empty
        v-if="!loading && !error && posts.length === 0"
        :description="searchKeyword ? '没有匹配的帖子' : '暂无帖子'"
        class="empty-state"
      >
        <template #extra>
          <n-button v-if="searchKeyword" @click="searchKeyword = ''">清空搜索</n-button>
          <n-button v-else-if="authStore.token" @click="showAddPostModal = true">发布第一个帖子</n-button>
        </template>
      </n-empty>
      <Pagination
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="totalPosts"
        @change="onPageChange"
      />
    </CommunityShell>
    <n-modal
      v-model:show="showAddPostModal"
      title="新增帖子"
      preset="card"
      style="width: min(760px, calc(100vw - 32px)); padding: 2px; border-radius: 16px; overflow: auto"
    >
      <AddForum @created="handlePostCreated" @cancel="showAddPostModal = false" />
    </n-modal>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { Add, Search } from '@vicons/ionicons5';
import { forumApi } from '../../api/forum.js';
import { useAuthStore } from '../../stores/authStore.js';
import { usePaginatedFetch } from '../../composables/usePaginatedFetch.js';
import { useListRouteQuery } from '../../composables/useListRouteQuery.js';
import CommunityShell from '../community/CommunityShell.vue';
import CommunityEntry from '../community/CommunityEntry.vue';
import Pagination from '../Pagination.vue';
import ListFetchFeedback from '../ListFetchFeedback.vue';
import AddForum from './AddForum.vue';

const authStore = useAuthStore();
const route = useRoute();
const dialog = useDialog();
const message = useMessage();
const {
  data: posts,
  total: totalPosts,
  loading,
  error,
  pagination,
  fetch: fetchPosts,
} = usePaginatedFetch((params) => forumApi.getPosts(params));
const { searchKeyword, onPageChange, refresh } = useListRouteQuery(pagination, fetchPosts);
const showAddPostModal = ref(false);
const handlePostCreated = () => {
  showAddPostModal.value = false;
  refresh();
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
.community-signin {
  font-size: 12px;
  color: var(--color-text-primary);
  text-decoration: none;
  padding: 10px 0;
}
.community-signin:focus-visible {
  outline: 2px solid var(--color-portal-accent);
  outline-offset: 4px;
}
</style>
