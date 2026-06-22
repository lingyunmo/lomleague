<template>
  <div class="main-container">
    <!-- 主内容区 -->
    <n-grid cols="1 600:2" x-gap="24" y-gap="24">
      <!-- 左侧栏 -->
      <n-gi>
        <News />
        <LauncherCard />
        <n-card class="team-card" hoverable title="开发团队">
          <n-carousel autoplay :interval="5000" class="team-carousel">
            <n-card
                v-for="member in teamMembers"
                :key="member.id"
                class="team-member-card"
                hoverable
            >
              <n-space align="center">
                <n-avatar round :src="member.face" :size="64" />
                <n-space vertical>
                  <n-text strong>{{ member.uname }}</n-text>
                  <n-text depth="2" class="member-sign">{{ member.sign }}</n-text>
                </n-space>
              </n-space>
              <n-text depth="3" class="member-description">{{ member.description }}</n-text>
            </n-card>
          </n-carousel>
        </n-card>
      </n-gi>

      <!-- 右侧栏 -->
      <n-gi>
        <!-- 用户信息卡片 -->
        <UserInfoCard :user="user" />

        <!-- 签到卡片 -->
        <n-card v-if="authStore.token" class="checkin-card" hoverable title="每日签到">
          <n-space vertical align="center">
            <n-text>当前金币: ✨ {{ authStore.user?.gold_coins || 0 }}</n-text>
            <n-text v-if="checkinData.streak > 0">连续签到: {{ checkinData.streak }} 天</n-text>
            <n-button
              type="warning"
              @click="handleCheckin"
              :loading="checkinLoading"
              :disabled="!checkinData.canCheckin"
            >
              {{ checkinData.canCheckin ? '今日签到' : '已签到' }}
            </n-button>
          </n-space>
        </n-card>

        <LatestArticles />
        <!-- 最新帖子轮播 -->
        <n-card class="latest-posts-card" hoverable title="最新帖子">
          <n-carousel autoplay :interval="5000" class="latest-posts-carousel">
            <n-card
                v-for="post in latestPosts"
                :key="post.id"
                class="post-card"
                hoverable
                @click="viewPost(post.id)"
            >
              <n-space vertical>
                <n-space align="center">
                  <n-avatar round size="small" :src="post.user?.avatar || '/default-avatar.png'" />
                  <div>
                    <div class="username">{{ post.user?.username || '匿名用户' }}</div>
                    <n-text depth="3" class="post-time">
                      <n-icon><Time /></n-icon>
                      {{ formatDate(post.updatedAt) }}
                    </n-text>
                    <n-tag type="info" size="small" round>
                      <n-icon><Globe /></n-icon>
                      {{ post.region || '未知地区' }}
                    </n-tag>
                  </div>
                </n-space>
                <div class="post-title">{{ post.title }}</div>
                <div class="post-content">
                  <v-md-preview :text="post.content" />
                </div>
              </n-space>
            </n-card>
          </n-carousel>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 友情链接：服务器信息 -->
    <n-card class="friend-links" hoverable title="友情链接-极夜星仰MC·土豆烤焦了">
      <n-grid cols="1 600:2" x-gap="24" y-gap="24">
        <!-- Java 版服务器卡片 -->
        <n-gi>
          <n-card class="server-info" hoverable title="Java 版服务器(www.pnestar.cn)">
            <img
                src="http://motd.imc.re/status_img/java?host=www.pnestar.cn:25565"
                width="auto"
                height="165px"
                style="border-radius: 8px;"
                alt="Java 版服务器状态 www.pnestar.cn:25565"
            />
          </n-card>
        </n-gi>

        <!-- 基岩版服务器卡片 -->
        <n-gi>
          <n-card class="server-info" hoverable title="基岩版服务器">
            <div style="overflow: auto; height: 180px;">
              <iframe
                  frameborder="no"
                  border="0"
                  marginwidth="0"
                  marginheight="0"
                  width="100%"
                  height="160px"
                  scrolling="no"
                  src="//motd.imc.re/iframe.html?ip=www.pnestar.cn&port=19132&dark=true"
                  style="border-radius: 8px;"
              />
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { Time, Globe } from '@vicons/ionicons5';
import api from '../api/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { formatDate } from '../utils/date.js';
import LatestArticles from './main/LatestArticles.vue';
import News from './main/News.vue';
import LauncherCard from './main/LauncherCard.vue';
import UserInfoCard from './main/UserInfoCard.vue';

const authStore = useAuthStore();
const message = useMessage();

const user = computed(() => ({
  username: authStore.user?.username || '',
  avatar: authStore.user?.avatar || '',
}));

// 最新帖子
const latestPosts = ref([]);

// 团队成员数据
const teamMembers = ref([
  {
    uname: '凌云陌',
    face: '/lingyunmo.png',
    id: 1,
    sign: '首席技术官 (CTO)',
    description: '负责整体技术战略规划与系统架构设计，主导技术团队的技术创新与研发方向。',
  },
  {
    uname: '凌云陌',
    face: '/lingyunmo.png',
    id: 2,
    sign: '云原生架构师',
    description: '专注于云原生技术栈，设计高可用、高扩展性的分布式系统架构。',
  },
  {
    uname: '凌云陌',
    face: '/lingyunmo.png',
    id: 3,
    sign: '全栈开发专家',
    description: '精通前后端开发，主导复杂业务系统的设计与实现，确保系统性能与用户体验。',
  },
  {
    uname: '凌云陌',
    face: '/lingyunmo.png',
    id: 4,
    sign: '数据工程总监',
    description: '负责大数据平台架构与优化，推动数据驱动决策与智能化应用。',
  },
]);

const router = useRouter();

const fetchLatestPosts = async () => {
  try {
    const response = await api.get('/forum/posts');
    latestPosts.value = response.data.posts.slice(0, 3);
  } catch (error) {
    console.error('获取最新帖子失败:', error);
  }
};

const viewPost = (postId) => {
  router.push(`/forum/${postId}`);
};

// 签到
const checkinData = ref({ canCheckin: true, streak: 0 });
const checkinLoading = ref(false);

const checkCanCheckin = () => {
  if (!authStore.user) return;
  const lastDate = authStore.user.last_checkin_date;
  if (!lastDate) return;
  const last = new Date(lastDate);
  const today = new Date();
  const sameDay = last.getFullYear() === today.getFullYear()
    && last.getMonth() === today.getMonth()
    && last.getDate() === today.getDate();
  checkinData.value.canCheckin = !sameDay;
  checkinData.value.streak = authStore.user.checkin_streak || 0;
};

const handleCheckin = async () => {
  checkinLoading.value = true;
  try {
    const res = await api.post('/user/checkin');
    message.success(`签到成功！获得 ${res.data.reward} 金币`);
    checkinData.value.canCheckin = false;
    checkinData.value.streak = res.data.streak;
    await authStore.fetchUser();
  } catch (error) {
    message.error(error.response?.data?.message || '签到失败');
  } finally {
    checkinLoading.value = false;
  }
};

onMounted(async () => {
  await authStore.fetchUser();
  checkCanCheckin();
  fetchLatestPosts();
});
</script>

<style scoped>
.main-container {
  padding: 24px;
  min-height: 100vh;
  background: linear-gradient(135deg, #141e30, #243b55);
  animation: fadeIn 1s ease-in-out;
}

.team-card,
.server-info,
.latest-posts-card,
.friend-links,
.checkin-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  margin-bottom: 24px;
}

.team-carousel {
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
}

.team-member-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}

.team-member-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.member-sign {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  font-weight: bold;
  color: #4ecca3;
}

.member-description {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #888;
  line-height: 1.5;
}

.latest-posts-carousel {
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
}

.post-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.post-title {
  font-size: 16px;
  font-weight: bold;
  color: #4ecca3;
  margin-top: 12px;
}

.post-content {
  margin-top: 8px;
  font-size: 14px;
  color: #ccc;
}

.friend-links {
  margin-top: 24px;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .main-header {
    flex-direction: column;
    text-align: center;
  }

  .main-info {
    margin-left: 0;
    margin-top: 16px;
  }
}
</style>