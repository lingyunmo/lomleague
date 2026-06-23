<template>
  <div class="history-container">
    <!-- 标题区 -->
    <div class="history-hero">
      <h1 class="history-title">曾经的我们</h1>
      <p class="history-subtitle">
        2015—2026 · 十一周年 · 从 Love Me 到 Legacy Of Minecraft
      </p>
    </div>

    <!-- 名称演变 -->
    <n-card class="section-card" title="名称演变" hoverable>
      <n-timeline>
        <n-timeline-item
          v-for="item in nameHistory"
          :key="item.time"
          :title="item.time + ' — ' + item.name"
          :content="item.fullname"
          :color="item.color"
        />
      </n-timeline>
    </n-card>

    <!-- 编年史 -->
    <n-card class="section-card" title="完整编年史" hoverable>
      <n-timeline>
        <n-timeline-item
          v-for="era in eras"
          :key="era.year"
          :title="era.label"
          :color="era.color"
        >
          <n-card
            v-for="event in era.events"
            :key="event.date"
            class="event-card"
            size="small"
          >
            <n-text depth="3" class="event-date">{{ event.date }}</n-text>
            <n-text class="event-title">{{ event.title }}</n-text>
            <n-text v-if="event.note" depth="2" class="event-note">{{ event.note }}</n-text>
          </n-card>
        </n-timeline-item>
      </n-timeline>
    </n-card>

    <!-- 年表省略，直接看里程碑数字 -->
    <n-card class="section-card" title="里程碑" hoverable>
      <n-grid :cols="responsiveCols" :x-gap="16" :y-gap="16">
        <n-gi v-for="m in milestones" :key="m.label">
          <n-card class="milestone-card" size="small" hoverable>
            <n-statistic :label="m.label">
              <n-gradient-text :type="m.type" class="milestone-value">
                {{ m.value }}
              </n-gradient-text>
            </n-statistic>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- 代表作品 -->
    <n-card class="section-card" title="代表作品" hoverable>
      <n-grid :cols="responsiveCols" :x-gap="16" :y-gap="16">
        <n-gi v-for="work in works" :key="work.title">
          <n-card class="work-card" size="small" hoverable>
            <n-text strong>{{ work.title }}</n-text>
            <n-text depth="2">{{ work.note }}</n-text>
            <n-tag
              :type="work.done ? 'success' : 'warning'"
              size="tiny"
              :bordered="false"
            >{{ work.done ? '已完成' : '部分完成' }}</n-tag>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- 数字足迹 -->
    <n-card class="section-card" title="数字足迹" hoverable>
      <n-timeline>
        <n-timeline-item
          v-for="site in sites"
          :key="site.time"
          :title="site.time"
          :content="site.name + ' — ' + site.use"
          :color="site.color"
        />
      </n-timeline>
    </n-card>

    <!-- 视频产量 -->
    <n-card class="section-card" title="视频产量" hoverable>
      <n-grid :cols="3" :x-gap="16" :y-gap="16">
        <n-gi>
          <n-card class="stat-card" size="small" hoverable>
            <n-statistic label="B站 视频">
              <n-gradient-text type="info" class="stat-big">108</n-gradient-text>
            </n-statistic>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card class="stat-card" size="small" hoverable>
            <n-statistic label="优酷 视频">
              <n-gradient-text type="error" class="stat-big">185+</n-gradient-text>
            </n-statistic>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card class="stat-card" size="small" hoverable>
            <n-statistic label="最高播放">
              <n-gradient-text type="warning" class="stat-big">4.7万</n-gradient-text>
            </n-statistic>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- 尾声 -->
    <n-card class="section-card outro-card" hoverable>
      <n-space vertical align="center">
        <n-text class="outro-text">
          lom 联盟不是商业公司，也不是游戏工作室。
        </n-text>
        <n-text class="outro-text">
          它是一个以 Minecraft 为纽带的青少年创作社群，2015 年从优酷起家。
        </n-text>
        <n-text class="outro-text">
          11 年 · 300+ 视频 · 2 个自研 Mod · 3 次重启 · 5 次更名
        </n-text>
        <n-text class="outro-text">
          从「Love Me」到「Legacy Of Minecraft league」——一个真实的玩家社区。
        </n-text>
        <n-button
          type="primary"
          class="anniversary-btn"
          @click="goToAnniversary"
        >
          <template #icon><n-icon><Gift /></n-icon></template>
          十一周年纪念站
        </n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Gift } from '@vicons/ionicons5'

const goToAnniversary = () => {
  window.open('https://anniversary.bzlom.cn/', '_blank')
}

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const responsiveCols = computed(() => windowWidth.value < 768 ? 1 : 2)

// ---- 名称演变 ----
const nameHistory = [
  { time: '2015/02', name: 'ML团队', fullname: 'Minecrafft Lingzhi（我的世界 + 凌志）', color: '#888' },
  { time: '2015/09', name: 'LoM联盟', fullname: 'Love Me', color: '#e8547c' },
  { time: '2016/07', name: 'LoM联盟', fullname: 'Love Me and The Dream', color: '#f0a040' },
  { time: '2018/08', name: 'lom联盟', fullname: 'laboratory ostentatious mechanization league', color: '#4ecca3' },
  { time: '2026/01', name: 'lom联盟', fullname: 'Legacy Of Minecraft League', color: '#5b9bd5' },
]

// ---- 编年史 ----
const eras = [
  {
    year: 2015, label: '2015 年 — 创立', color: '#888',
    events: [
      { date: '02/12', title: 'ML团队成立', note: '凌志（凌云陌）与最初的 MC 爱好者' },
      { date: '08', title: '优酷开始发布视频', note: '纯净生存、虚无世界、三色跑酷地图' },
    ]
  },
  {
    year: 2016, label: '2016 年 — 成型', color: '#4ecca3',
    events: [
      { date: '04/29', title: '盟规发布', note: '不双盟、lom_ 前缀、拒绝标题党' },
      { date: '05/22', title: 'LoM 服务器内测', note: '第一次自有 Minecraft 服务器' },
      { date: '05/27', title: 'T狗 成为副盟主' },
      { date: '06/21', title: '联盟币试用', note: '每日 5 枚' },
      { date: '07/17', title: '名称扩为 Love Me and The Dream' },
      { date: '08/31', title: '三色跑酷地图发布' },
    ]
  },
  {
    year: 2017, label: '2017 年 — 动荡', color: '#f0a040',
    events: [
      { date: '02/12', title: '二周年' },
      { date: '04/03', title: '第二次重启', note: 'LoM联盟回归——经历低谷后重新出发' },
    ]
  },
  {
    year: 2018, label: '2018 年 — 创作爆发', color: '#e8547c',
    events: [
      { date: '02/03', title: '小联成为副盟主' },
      { date: '02/12', title: '三周年' },
      { date: '03/24', title: '《麦块危机》预告片发布', note: '有完整剧本和片头，正片未完成' },
      { date: '06/18', title: 'LoM联盟会议直播', note: '6 期会议全程直播' },
      { date: '07/29', title: '《如果MC添加枯木世界》微电影', note: '已完成发布' },
      { date: '08/02', title: '第一届歌唱比赛', note: '煜飒、凯雷、xcreeperz 参赛，优酷存档' },
      { date: '08/31', title: 'LoM → lom（大写改小写）', note: '全称 laboratory ostentatious mechanization league' },
    ]
  },
  {
    year: 2019, label: '2019 年 — 组织化', color: '#9b7ec4',
    events: [
      { date: '01/30', title: '第三次重启' },
      { date: '02/10', title: '技术部成立（煜飒）', note: '小联被罢免副盟主' },
      { date: '02/11', title: '音乐部、游戏部、PVP组同日成立', note: '幽奇、凯妙各任部长；羽陌任副盟主' },
      { date: '02/12', title: '四周年庆典', note: '3 部分，B站发布' },
    ]
  },
  {
    year: 2020, label: '2020 年 — 高峰期', color: '#43a87a',
    events: [
      { date: '02/07', title: '2019-nCoV 微电影第一集', note: '以 MC 演绎疫情，共 4 集（2020—2025）' },
      { date: '03/19', title: 'B站激励计划启动', note: '视频 B站首发，55 人参与' },
      { date: '04/09', title: '管委会 12 条规则发布' },
      { date: '04/28', title: 'B站粉丝突破 8 千' },
      { date: '07/24', title: '官网域名改为 bzlom.cn', note: '旧域名 china-mc.shop 废弃' },
      { date: '07/27', title: '2020—2025 发展规划', note: '含青岛线下年会计划' },
      { date: '08/11', title: '实名认证制度废除' },
      { date: '全年', title: "lom's mod 开发活跃", note: '8 个版本迭代（alpha → beta → dev）' },
    ]
  },
  {
    year: 2021, label: '2021 年 — Mod 与庆典', color: '#5b9bd5',
    events: [
      { date: '02/12', title: '六周年音乐庆典', note: 'B站发布' },
      { date: '06', title: "lom's mod 最终版", note: 'v21.02.23-dev' },
      { date: '07/02', title: 'declinera Mod 停止更新', note: '「没有时间」转为 declinecore' },
      { date: '11/30', title: 'MC 1.17.1 服务器上线' },
    ]
  },
  {
    year: 2022, label: '2022 年 — 技术转型', color: '#f0a040',
    events: [
      { date: '03/23', title: 'declinecore 重写完成' },
      { date: '05/28', title: 'lom服务器-三周目完结' },
      { date: '全年', title: '编程教学视频起步', note: 'Java、Docker、Manim 可视化（最高 4.7 万播放）' },
    ]
  },
  {
    year: 2023, label: '2023 年 — 转型', color: '#e8547c',
    events: [
      { date: '05/20', title: '2019-nCoV 第三集', note: '时隔两年半回归' },
      { date: '05/21', title: '转型 MPMNA 国家服务器', note: '核心成员群解散，盟主卸任组长' },
    ]
  },
  {
    year: 2024, label: '2024 年 — 电竞元年', color: '#4ecca3',
    events: [
      { date: '02', title: '春节竞技活动 + lom水友赛S1', note: '王者荣耀 5 场赛事直播' },
    ]
  },
  {
    year: 2025, label: '2025 年 — 官网时代', color: '#9b7ec4',
    events: [
      { date: '02/17', title: '官方网站 www.bzlom.cn 全新上线' },
      { date: '03/11', title: '2019-nCoV 第四集（完结）' },
    ]
  },
  {
    year: 2026, label: '2026 年 — 十一周年', color: '#5b9bd5',
    events: [
      { date: '01/16', title: '十一周年纪念', note: 'anniversary.bzlom.cn' },
      { date: '01/16', title: '正式命名 Legacy Of Minecraft League' },
    ]
  },
]

// ---- 里程碑 ----
const milestones = [
  { label: '创立', value: '2015.2.12', type: 'info' },
  { label: 'B站视频', value: 108, type: 'success' },
  { label: '优酷视频', value: '185+', type: 'error' },
  { label: '自研 Mod', value: 2, type: 'warning' },
]

// ---- 作品 ----
const works = [
  { title: '2019-nCoV 微电影', note: '4 集 · 2020—2025', done: true },
  { title: '枯木世界微电影', note: '2018', done: true },
  { title: '供体·新生 第一幕', note: '2022', done: true },
  { title: '麦块危机', note: '预告+剧本+片头 · 正片未完成', done: false },
  { title: "lom's mod", note: '8 版本 · 2020—2021', done: true },
  { title: 'declinera / declinecore', note: '2021—2022', done: true },
  { title: 'lom水友赛S1（王者荣耀）', note: '5 场 · 2024', done: true },
  { title: '编程教学系列', note: 'Manim/C++/Java/Docker', done: true },
  { title: 'lom联盟四周年庆典', note: '3 部分 · 2019', done: true },
  { title: 'lom联盟六周年音乐庆典', note: '2021', done: true },
  { title: '中二病的学校疗法 OP/ED', note: 'lom联盟出品短片 · 2020', done: true },
  { title: '多模组生存系列', note: '14 集 · 2015—2018', done: true },
]

// ---- 数字足迹 ----
const sites = [
  { time: '2015', name: '优酷 + QQ群', use: '最初根据地', color: '#888' },
  { time: '2016', name: 'B站', use: '同步发布视频', color: '#4ecca3' },
  { time: '~2016', name: 'china-mc.shop', use: '早期域名', color: '#f0a040' },
  { time: '~2018', name: 'yklom.icoc.in（凡科建站）', use: '老官网', color: '#e8547c' },
  { time: '2020/07', name: 'bzlom.cn', use: '正式官网', color: '#5b9bd5' },
  { time: '2021', name: '222.mossfrp.cn', use: 'MC 1.17.1 服', color: '#43a87a' },
  { time: '2023', name: 'mc.bzlom.cn', use: 'MC 生存服', color: '#9b7ec4' },
  { time: '2025', name: 'www.bzlom.cn', use: '全新官网', color: '#4ecca3' },
  { time: '2026', name: 'anniversary.bzlom.cn', use: '十一周年纪念', color: '#5b9bd5' },
]
</script>

<style scoped>
.history-container {
  padding: 24px;
  min-height: 100%;
  background: linear-gradient(135deg, var(--color-bg-gradient-start), var(--color-bg-gradient-end));
  animation: fadeIn 1s ease-in-out;
}

.history-hero {
  text-align: center;
  padding: 48px 0 32px;
}

.history-title {
  font-size: 36px;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(45deg, var(--color-brand-primary), var(--color-brand-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.history-subtitle {
  margin-top: 12px;
  color: var(--color-text-muted);
  font-size: 16px;
}

.section-card {
  background: var(--glass-bg);
  border-radius: 16px;
  backdrop-filter: var(--glass-blur);
  margin-bottom: 24px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.event-card {
  margin-bottom: 8px;
  background: var(--glass-bg-inner);
  border-radius: 8px;
}

.event-date {
  font-size: 12px;
  display: block;
}

.event-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
  margin-top: 4px;
}

.event-note {
  font-size: 13px;
  display: block;
  margin-top: 4px;
}

.milestone-card {
  background: var(--glass-bg-inner);
  border-radius: 10px;
  text-align: center;
}

.milestone-value {
  font-size: 28px;
  font-weight: 800;
}

.work-card {
  background: var(--glass-bg-inner);
  border-radius: 10px;
  text-align: center;
}

.stat-card {
  background: var(--glass-bg-inner);
  border-radius: 10px;
  text-align: center;
}

.stat-big {
  font-size: 32px;
  font-weight: 800;
}

.outro-card {
  text-align: center;
  padding: 32px 16px;
}

.outro-text {
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.anniversary-btn {
  margin-top: 24px;
}

@media (max-width: 768px) {
  .history-title {
    font-size: 26px;
  }
  .history-hero {
    padding: 32px 0 16px;
  }
}
</style>
