<template>
  <div class="forum-container" v-if="!loading">
    <div class="forum-wrapper">
      <!-- 头部 -->
      <div class="forum-header">
        <h2 class="forum-title">{{ post.title }}</h2>
        <n-space>
          <LikeButton entity-type="post" :entity-id="post.id" />
          <n-button
            v-if="authStore.user?.id === post.userId || authStore.isAdmin"
            size="small"
            @click="startEditPost"
          >
            <template #icon><n-icon><CreateOutline /></n-icon></template>
            编辑
          </n-button>
          <n-button
            v-if="authStore.user?.id === post.userId || authStore.isAdmin"
            size="small"
            type="error"
            @click="confirmDeletePost"
          >
            <template #icon><n-icon><Trash /></n-icon></template>
            删除
          </n-button>
          <n-button type="primary" @click="goBack">
            <template #icon><n-icon><ArrowBack /></n-icon></template>
            返回论坛
          </n-button>
        </n-space>
      </div>

      <!-- 帖子内容卡片 -->
      <n-card class="main-post">
        <n-space vertical>
          <!-- 用户信息行 -->
          <n-space justify="space-between" align="center">
            <n-space align="center">
              <n-avatar round size="large" :src="post.user?.avatar || '/default-avatar.png'" />
              <div>
                <div class="username">{{ post.user?.username || '匿名用户' }}</div>
                <n-text depth="3" class="post-time">
                  <n-icon><Time /></n-icon> {{ formatDate(post.createdAt) }}
                </n-text>
              </div>
            </n-space>
            <n-tag type="info" round>
              <n-icon><Globe /></n-icon> {{ post.region || '未知地区' }}
            </n-tag>
          </n-space>

          <!-- 帖子内容（编辑/只读切换） -->
          <template v-if="isEditingPost">
            <n-input v-model:value="editPostForm.title" placeholder="标题" />
            <v-md-editor v-model="editPostForm.content" height="300px" />
            <n-space>
              <n-button type="primary" @click="saveEditPost" :loading="savingEdit">保存</n-button>
              <n-button @click="cancelEditPost">取消</n-button>
            </n-space>
          </template>
          <template v-else>
            <div class="post-content">
              <v-md-preview :text="post.content" />
            </div>
          </template>

          <AttachmentGrid :files="attachments" />
        </n-space>
      </n-card>

      <!-- 回复列表 -->
      <div class="replies-container">
        <n-space vertical>
          <n-space justify="space-between" align="center">
            <h3 class="section-title">
              <n-icon><Chatbubbles /></n-icon> 共 {{ replyTotal }} 条回复
            </h3>
            <n-button type="primary" @click="openNewReply" style="margin-bottom: 12px">
              <template #icon><n-icon><Create /></n-icon></template>
              发表回复
            </n-button>
          </n-space>

          <n-empty v-if="!repliesLoading && replies.length === 0" description="暂无回复，抢个沙发吧！" class="empty-state" />

          <transition-group name="list">
            <n-card v-for="reply in replies" :key="reply.id" class="reply-card" embedded>
              <n-space justify="space-between" align="center">
                <n-space align="center">
                  <n-avatar round size="small" :src="reply.user?.avatar || '/default-avatar.png'" />
                  <div>
                    <div class="username">{{ reply.user?.username || '匿名用户' }}</div>
                    <n-text depth="3" class="reply-time">
                      <n-icon><Time /></n-icon> {{ formatDate(reply.createdAt) }}
                    </n-text>
                  </div>
                </n-space>
                <n-space align="center">
                  <n-tag type="info" size="small" round>
                    <n-icon><Globe /></n-icon> {{ reply.region || '未知地区' }}
                  </n-tag>
                  <LikeButton entity-type="reply" :entity-id="reply.id" />
                  <n-button
                    v-if="authStore.user?.id === reply.userId || authStore.isAdmin"
                    quaternary
                    size="tiny"
                    type="error"
                    @click="confirmDeleteReply(reply.id)"
                  >
                    <template #icon><n-icon><Trash /></n-icon></template>
                  </n-button>
                </n-space>
              </n-space>

              <div class="reply-content">
                <v-md-preview :text="reply.content" />
              </div>

              <AttachmentGrid :files="getReplyAttachments(reply)" />
            </n-card>
          </transition-group>

          <Pagination
            v-model:page="replyPage"
            v-model:page-size="replyPageSize"
            :total="replyTotal"
            @change="fetchReplies"
          />
        </n-space>
      </div>
    </div>

    <!-- 回帖弹窗 -->
    <n-modal
      v-model:show="showReplyModal"
      title="回帖"
      preset="card"
      style="width: 60%; padding: 2px; border-radius: 16px; overflow: auto;"
    >
      <AddPost :postId="post.id" @created="handleReplyCreated" @cancel="showReplyModal = false" />
    </n-modal>
  </div>

  <div v-else class="loading-container">
    <n-spin size="large" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import api from '../../api/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { formatDate } from '../../utils/date.js';
import Pagination from '../Pagination.vue';
import AttachmentGrid from '../AttachmentGrid.vue';
import AddPost from './AddPost.vue';
import LikeButton from '../LikeButton.vue';
import { ArrowBack, Time, Globe, Chatbubbles, Create, CreateOutline, Trash } from '@vicons/ionicons5';

const authStore = useAuthStore();
const dialog = useDialog();

const post = ref({});
const loading = ref(true);
const message = useMessage();
const route = useRoute();
const router = useRouter();

// 编辑帖子
const isEditingPost = ref(false);
const savingEdit = ref(false);
const editPostForm = ref({ title: '', content: '' });

// 回复列表
const replies = ref([]);
const repliesLoading = ref(false);
const replyPage = ref(1);
const replyPageSize = ref(20);
const replyTotal = ref(0);
const showReplyModal = ref(false);

const parseAttachments = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

const attachments = computed(() => parseAttachments(post.value.attachments));

const fetchPost = async () => {
  const postId = route.params.id;
  try {
    const response = await api.get(`/forum/posts/${postId}`);
    post.value = response.data || {};
  } catch (error) {
    console.error('获取帖子失败:', error);
    message.error('获取帖子失败，请稍后重试');
    await router.push('/forums');
  } finally {
    loading.value = false;
  }
};

const fetchReplies = async () => {
  repliesLoading.value = true;
  try {
    const response = await api.get(`/forum/replies/${route.params.id}`, {
      params: { page: replyPage.value, pageSize: replyPageSize.value },
    });
    replies.value = response.data.replies;
    replyTotal.value = response.data.total;
  } catch (error) {
    console.error('获取回复失败:', error);
  } finally {
    repliesLoading.value = false;
  }
};

// === 帖子编辑 ===
const startEditPost = () => {
  editPostForm.value = { title: post.value.title, content: post.value.content };
  isEditingPost.value = true;
};

const cancelEditPost = () => {
  isEditingPost.value = false;
};

const saveEditPost = async () => {
  savingEdit.value = true;
  try {
    const res = await api.put(`/forum/posts/${post.value.id}`, {
      title: editPostForm.value.title,
      content: editPostForm.value.content,
    });
    post.value.title = res.data.title;
    post.value.content = res.data.content;
    isEditingPost.value = false;
    message.success('帖子已更新');
  } catch (error) {
    message.error('更新失败');
  } finally {
    savingEdit.value = false;
  }
};

// === 删除 ===
const confirmDeletePost = () => {
  dialog.warning({
    title: '确认删除',
    content: '删除帖子将同时删除所有回复，且无法恢复。确定删除？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/forum/posts/${post.value.id}`);
        message.success('帖子已删除');
        router.push('/forums');
      } catch {
        message.error('删除失败');
      }
    },
  });
};

const confirmDeleteReply = (replyId) => {
  dialog.warning({
    title: '确认删除',
    content: '确定删除此回复？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/forum/replies/${replyId}`);
        message.success('回复已删除');
        fetchReplies();
      } catch {
        message.error('删除失败');
      }
    },
  });
};

const goBack = () => {
  router.push({ name: 'Forums' });
};

const openNewReply = () => {
  showReplyModal.value = true;
};

const handleReplyCreated = () => {
  showReplyModal.value = false;
  replyPage.value = 1;
  fetchReplies();
};

const getReplyAttachments = (reply) => parseAttachments(reply.attachments);

onMounted(() => {
  fetchPost();
  fetchReplies();
});
</script>

<style scoped>
.forum-container {
  display: flex;
  justify-content: center;
  padding: 40px;
  background: linear-gradient(135deg, #141e30, #243b55);
  animation: fadeIn 1s ease-in-out;
  min-height: 100vh;
}

.forum-wrapper {
  width: 100%;
  max-width: 1200px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.forum-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.forum-title {
  color: #4ecca3;
  font-size: 24px;
}

.main-post {
  margin-bottom: 24px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.reply-card {
  margin-bottom: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.reply-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.username {
  font-weight: 500;
  color: #4ecca3;
}

.post-time,
.reply-time {
  font-size: 12px;
  color: #888;
}

.section-title {
  color: #4ecca3;
  margin: 16px 0;
}

.post-content,
.reply-content {
  margin-top: 12px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  color: #ccc;
}

.empty-state {
  padding: 48px 0;
}
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@media (max-width: 768px) {
  .forum-container {
    padding: 16px;
  }
  .forum-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
