<template>
  <!-- 最新文章卡片 -->
  <n-card class="latest-articles-card" hoverable title="最新公告">
    <template #header-extra>
      <n-button text @click="router.push({ name: 'Articles' })">
        更多
        <template #icon>
          <n-icon><ArrowForward /></n-icon>
        </template>
      </n-button>
    </template>

    <!-- 轮播容器 -->
    <n-carousel autoplay :interval="6000" class="articles-carousel">
      <!-- 文章卡片 -->
      <n-card
          v-for="article in articles"
          :key="article.id"
          class="article-card"
          hoverable
          @click="router.push({name: 'Article', params: { id: article.id }})"
      >
        <n-space vertical>
          <!-- 作者信息行 -->
          <n-space align="center">
            <n-avatar
                round
                size="small"
                :src="article.user?.avatar || '/default-avatar.png'"
            />
            <div>
              <div class="username">{{ article.user?.username || '匿名作者' }}</div>
              <n-space align="center">
                <n-text depth="3" class="post-time">
                  <n-icon><Time /></n-icon> {{ formatDate(article.createdAt) }}
                </n-text>
                <n-tag type="info" size="small" round>
                  <n-icon><Globe /></n-icon> {{ article.region || '未知地区' }}
                </n-tag>
              </n-space>
            </div>
          </n-space>

          <!-- 文章内容 -->
          <div class="article-content">
            <h3 class="article-title">{{ article.title }}</h3>
            <v-md-preview
                :text="truncateContent(article.content)"
                class="preview-content"
            />
          </div>

        </n-space>
      </n-card>
    </n-carousel>
  </n-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Time, Globe, ArrowForward } from '@vicons/ionicons5';
import { articleApi } from '../../api/article.js';
import { formatDate } from '../../utils/date.js';

const router = useRouter();

// 文章数据
const articles = ref([]);

// 获取最新文章
const fetchLatestArticles = async () => {
  try {
    const response = await articleApi.getLatest();
    articles.value = response.data.map(article => ({
      ...article,
    }));
  } catch { /* ignore */ }
};

// 内容截断
const truncateContent = (content) => {
  if (!content) return '';
  return content.length > 150 ? content.substring(0, 150) + '...' : content;
};

onMounted(() => {
  fetchLatestArticles();
});
</script>

<style scoped>
.latest-articles-card {
  background: var(--glass-bg);
  border-radius: 16px;
  backdrop-filter: var(--glass-blur);
  margin-bottom: 24px;
}

.articles-carousel {
  height: 320px;
  border-radius: 8px;
  overflow: hidden;
}

.article-card {
  padding: 16px;
  margin: 8px;
  background: var(--glass-bg-inner);
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.article-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.article-content {
  margin: 12px 0;
}

.article-title {
  font-size: 1.1em;
  color: var(--color-brand-primary);
  margin-bottom: 8px;
}

.preview-content {
  font-size: 0.9em;
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-height: 72px;
  overflow: hidden;
}

.username {
  font-weight: 500;
  color: var(--color-brand-primary);
}

.post-time {
  font-size: 0.85em;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .articles-carousel {
    height: 280px;
  }

  .article-title {
    font-size: 1em;
  }

  .preview-content {
    font-size: 0.8em;
  }
}
</style>