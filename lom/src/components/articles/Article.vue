<template>
  <div class="article-container" v-if="!loading">
    <!-- 主内容容器 -->
    <div class="article-wrapper">
      <!-- 头部区域 -->
      <div class="article-header">
        <h1 class="article-title">{{ article.title }}</h1>
        <n-space class="header-actions">
          <n-button type="primary" @click="goBack">
            <template #icon>
              <n-icon><ArrowBack /></n-icon>
            </template>
            返回全部公告
          </n-button>
          <LikeButton v-if="article.id" entity-type="article" :entity-id="article.id" />
          <n-button type="info" @click="copyLink">
            <template #icon>
              <n-icon><ShareSocial /></n-icon>
            </template>
            分享公告
          </n-button>
          <n-button v-if="authStore.isAdmin" type="warning" @click="startEdit">
            <template #icon
              ><n-icon><CreateOutline /></n-icon
            ></template>
            编辑公告
          </n-button>
          <n-button v-if="authStore.isAdmin" type="error" @click="confirmDeleteArticle">
            <template #icon
              ><n-icon><Trash /></n-icon
            ></template>
            删除公告
          </n-button>
        </n-space>
      </div>

      <!-- 公告内容卡片 -->
      <n-card class="main-article" hoverable>
        <n-space vertical>
          <!-- 用户信息行 -->
          <n-space justify="space-between" align="center">
            <n-space align="center">
              <UserFrame :userId="article.userId" :src="article.user?.avatar" :size="40" />
              <div>
                <div class="username">{{ article.user?.username || '匿名用户' }}</div>
                <n-text depth="3" class="post-time">
                  <n-icon><Time /></n-icon> {{ formatDate(article.createdAt) }}
                </n-text>
              </div>
            </n-space>
            <n-tag type="info" round>
              <n-icon><Globe /></n-icon> {{ article.region || '未知地区' }}
            </n-tag>
          </n-space>

          <!-- 公告内容（编辑/只读切换） -->
          <template v-if="isEditing">
            <n-input v-model:value="editForm.title" placeholder="标题" />
            <v-md-editor v-model="editForm.content" height="300px" />
            <n-space style="margin-top: 12px">
              <n-button type="primary" @click="saveEdit" :loading="savingEdit">保存</n-button>
              <n-button @click="isEditing = false">取消</n-button>
            </n-space>
          </template>
          <div v-else class="article-content">
            <v-md-preview :text="article.content" />
          </div>

          <AttachmentGrid :files="attachments" />
        </n-space>
      </n-card>
    </div>
  </div>

  <!-- 加载状态 -->
  <div v-else class="loading-container">
    <n-spin size="large" />
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { articleApi } from '../../api/article.js';
import { useAuthStore } from '../../stores/authStore.js';
import { formatDate } from '../../utils/date.js';
import { parseAttachments } from '../../utils/attachment.js';
import { returnToList } from '../../utils/returnToList.js';
import AttachmentGrid from '../AttachmentGrid.vue';
import LikeButton from '../LikeButton.vue';
import UserFrame from '../UserFrame.vue';
import { ArrowBack, Time, Globe, ShareSocial, CreateOutline, Trash } from '@vicons/ionicons5';

const authStore = useAuthStore();
const dialog = useDialog();
const route = useRoute();
const router = useRouter();
const message = useMessage();
const article = ref({});
const loading = ref(true);
const isEditing = ref(false);
const editForm = ref({ title: '', content: '' });
const savingEdit = ref(false);
let detailGeneration = 0;
let privateGeneration = 0;
let articleRequest = 0;
let confirmationRequest = 0;
let disposed = false;
let pendingDialog;
const context = () => ({
  id: route.params.id,
  generation: detailGeneration,
  privateGeneration,
  token: authStore.token,
});
const isCurrent = (request, privateOperation = false) =>
  !disposed &&
  route.name === 'Article' &&
  request.id === route.params.id &&
  request.generation === detailGeneration &&
  (!privateOperation || (request.token === authStore.token && request.privateGeneration === privateGeneration));
const resetPrivateState = () => {
  privateGeneration++;
  confirmationRequest++;
  pendingDialog?.destroy();
  pendingDialog = undefined;
  isEditing.value = false;
  savingEdit.value = false;
  editForm.value = { title: '', content: '' };
};

const startEdit = () => {
  editForm.value = { title: article.value.title, content: article.value.content };
  isEditing.value = true;
};

const saveEdit = async () => {
  if (savingEdit.value || !isEditing.value) return;
  const request = context();
  const articleId = article.value.id;
  const payload = { ...editForm.value };
  savingEdit.value = true;
  try {
    await articleApi.updateArticle(articleId, payload);
    if (!isCurrent(request, true)) return;
    article.value.title = payload.title;
    article.value.content = payload.content;
    isEditing.value = false;
    message.success('更新成功');
  } catch {
    if (!isCurrent(request, true)) return;
    message.error('更新失败');
  } finally {
    if (isCurrent(request, true)) savingEdit.value = false;
  }
};

// 获取公告详情
const fetchArticle = async () => {
  const request = context();
  const sequence = ++articleRequest;
  try {
    const response = await articleApi.getArticle(request.id);
    if (!isCurrent(request) || sequence !== articleRequest) return;
    article.value = response.data || {};
  } catch {
    if (!isCurrent(request) || sequence !== articleRequest) return;
    message.error('获取公告失败，请稍后重试');
    await router.push('/articles');
  } finally {
    if (isCurrent(request) && sequence === articleRequest) loading.value = false;
  }
};

// 返回全部公告
const goBack = () => {
  returnToList(router, '/articles');
};

// 复制链接
const copyLink = async () => {
  const request = context();
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    if (isCurrent(request)) message.success('链接已复制到剪贴板，快去分享吧！');
  } catch {
    if (isCurrent(request)) message.error('复制失败，请手动复制浏览器地址');
  }
};

const confirmDeleteArticle = () => {
  pendingDialog?.destroy();
  const sequence = ++confirmationRequest;
  const request = context();
  const articleId = article.value.id;
  let confirmed = false;
  pendingDialog = dialog.warning({
    title: '确认删除',
    content: '删除后无法恢复，确定删除此公告？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (confirmed || sequence !== confirmationRequest || !isCurrent(request, true)) return;
      confirmed = true;
      try {
        await articleApi.deleteArticle(articleId);
        if (!isCurrent(request, true)) return;
        message.success('公告已删除');
        router.push({ name: 'Articles' });
      } catch {
        if (!isCurrent(request, true)) return;
        message.error('删除失败');
      }
    },
  });
};

const attachments = computed(() => parseAttachments(article.value.attachments));

watch(
  () => (route.name === 'Article' ? route.params.id : null),
  (articleId) => {
    detailGeneration++;
    resetPrivateState();
    article.value = {};
    loading.value = true;
    if (articleId == null) return;
    fetchArticle();
  },
  { immediate: true, flush: 'sync' },
);
watch(() => authStore.token, resetPrivateState, { flush: 'sync' });
onBeforeUnmount(() => {
  disposed = true;
  resetPrivateState();
});
</script>

<style scoped>
.article-container {
  display: flex;
  justify-content: center;
  padding: 40px;
  background: linear-gradient(135deg, var(--color-bg-gradient-start), var(--color-bg-gradient-end));
  animation: fadeIn 1s ease-in-out;
  min-height: 100%;
}

.article-wrapper {
  width: 100%;
  max-width: 1200px;
  background: var(--glass-bg);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-deep);
  backdrop-filter: var(--glass-blur);
}

.article-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.article-title {
  color: var(--color-brand-primary);
  font-size: 28px;
  text-align: center;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.main-article {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  transition: transform 0.2s ease;
}

.main-article:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.username {
  font-weight: 500;
  color: var(--color-brand-primary);
}

.post-time {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.article-content {
  padding: 16px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

/* 新增标题装饰线 */
.article-title::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background: var(--color-brand-primary);
  margin: 12px auto;
  border-radius: 2px;
}
</style>
