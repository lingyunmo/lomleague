<template>
  <n-card class="news-card" hoverable title="联盟动态">
    <n-grid :cols="responsiveCols" :x-gap="24" :y-gap="24">
      <!-- 统计项 -->
      <n-gi v-for="stat in stats" :key="stat.label">
        <n-card class="stat-item" hoverable>
          <n-space vertical align="center">
            <n-statistic :label="stat.label" class="statistic">
              <template #suffix>
                <n-text class="stat-unit">{{ stat.unit }}</n-text>
              </template>
              <n-gradient-text :type="stat.type" class="stat-value">
                {{ stat.value }}
              </n-gradient-text>
            </n-statistic>
            <n-text class="stat-desc">{{ stat.desc }}</n-text>
          </n-space>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 竞赛公告 -->
    <n-card class="competition-notice" hoverable>
      <n-space vertical align="center">
        <n-text strong class="competition-title">
          <n-icon :component="Trophy" color="#ffd700" />
          十一周年庆典
        </n-text>
        <n-text class="competition-desc">
          年度大赛现已开放报名，参赛者需在规定时间内完成指定主题的活动
        </n-text>
        <n-button
            type="warning"
            class="signup-button"
            @click="openCompetitionPage"
        >
          立即报名
        </n-button>
      </n-space>
    </n-card>
  </n-card>
</template>

<script setup>
import { Trophy } from '@vicons/ionicons5'
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 响应式列数
const windowWidth = ref(window.innerWidth);
const onResize = () => { windowWidth.value = window.innerWidth; };

onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));

const responsiveCols = computed(() => {
  return windowWidth.value < 600 ? 1 : 2
})

// 统计数据
const stats = ref([
  {
    label: '联盟创办时间',
    value: 2015,
    unit: '年',
    type: 'info',
    desc: '从红石小组成长为跨服联盟'
  },
  {
    label: '联盟现有人数',
    value: 35,
    unit: '人',
    type: 'success',
    desc: '包含建筑师/红石工程师/材质作者'
  },
  {
    label: '联盟活动数量',
    value: 9,
    unit: '场',
    type: 'error',
    desc: '每月定期举办建造挑战赛'
  },
  {
    label: '竞赛时长',
    value: 365,
    unit: '天',
    type: 'warning',
    desc: '第二届MPC竞赛持续周期'
  }
])

// 打开竞赛页面
const openCompetitionPage = () => {
  window.open('/competition/mpc-2', '_blank')
}
</script>

<style scoped>
.news-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.stat-value {
  font-size: 2.2em;
  letter-spacing: 2px;
  font-family: 'Roboto Condensed', sans-serif;
}

.stat-unit {
  font-size: 0.85em;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 4px;
}

.competition-notice {
  margin-top: 24px;
  background: linear-gradient(45deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1));
  border: 1px solid rgba(255, 215, 0, 0.3);
  animation: glow 2s infinite alternate;
}

@keyframes glow {
  from {
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.2);
  }
  to {
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
  }
}

.signup-button {
  margin-top: 16px;
  background: linear-gradient(45deg, #ffd700, #ff8c00);
  font-weight: bold;
  transition: transform 0.2s;
}

.signup-button:hover {
  transform: scale(1.05);
}

@media (max-width: 600px) {
  .stat-value {
    font-size: 1.8em;
  }

  .competition-title {
    font-size: 1.1em;
    text-align: center;
  }
}
</style>