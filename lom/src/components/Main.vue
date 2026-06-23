<template>
  <div class="home">
    <!-- ====== HERO ====== -->
    <section class="hero">
      <img src="/logo.jpg" alt="lom" class="hero-logo" />
      <h1 class="hero-title">lom 联盟</h1>
      <p class="hero-tagline">Legacy Of Minecraft League</p>
      <p class="hero-desc">始于 2014 · 从优酷到 B站 · 从 Love Me 到 Minecraft 遗产</p>
      <div class="hero-stats">
        <div v-for="s in heroStats" :key="s.label" class="hero-stat">
          <span class="hero-stat-num">{{ s.value }}<small v-if="s.small">{{ s.small }}</small></span>
          <span class="hero-stat-label">{{ s.label }}</span>
        </div>
      </div>
    </section>

    <!-- ====== 签到条 ====== -->
    <div v-if="authStore.token" class="checkin-bar">
      <div class="checkin-bar-left">
        <BiliFace :src="authStore.user?.avatar || '/default-avatar.png'" :size="30" alt="" />
        <span class="checkin-greeting">{{ authStore.user?.username || '冒险者' }}</span>
        <span class="checkin-coins">✨ {{ authStore.user?.gold_coins || 0 }}</span>
        <span v-if="checkinData.streak" class="checkin-streak">🔥 {{ checkinData.streak }} 天</span>
      </div>
      <n-button type="warning" size="small" round @click="handleCheckin" :loading="checkinLoading" :disabled="!checkinData.canCheckin">
        {{ checkinData.canCheckin ? '签到' : '已签到' }}
      </n-button>
    </div>

    <!-- ====== 启动器 ====== -->
    <div class="launcher-strip">
      <a v-for="ln in launchers" :key="ln.label" :href="ln.url" target="_blank" class="launcher-link" :class="ln.class">
        {{ ln.label }}
      </a>
    </div>

    <!-- ====== 微电影 ====== -->
    <section class="section">
      <h2 class="section-title">2019-nCoV 微电影</h2>
      <p class="section-sub">以 Minecraft 演绎 COVID-19 疫情 · 历时五年 · 四集完结</p>
      <div class="film-grid">
        <article
          v-for="(ep, i) in featuredFilms" :key="ep.bvid"
          class="film-card"
          :class="{ 'film-card--featured': i === 0 }"
          @click="openBilibili(ep.bvid)"
        >
          <LazyBiliPlayer :bvid="ep.bvid" :title="ep.title" />
          <div class="film-meta">
            <span class="film-meta-title">{{ ep.title }}</span>
            <span class="film-meta-date">{{ ep.date }}</span>
          </div>
        </article>
      </div>
    </section>

    <!-- ====== 服务器 + Mod ====== -->
    <section class="section">
      <div class="split-2">
        <!-- 服务器 -->
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">🖥 Minecraft 服务器</h3>
            <span class="panel-badge server-badge--online">在线</span>
          </div>
          <img
            src="https://motd.minebbs.com/api/status_img?ip=mc.bzlom.cn&stype=auto&theme=dark_tech"
            class="server-motd"
            alt="mc.bzlom.cn 服务器状态"
          />
          <p class="panel-foot">mc.bzlom.cn · Java 1.16.5 · 24h</p>
        </div>

        <!-- Mod -->
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">🔧 lom's mod</h3>
            <span class="panel-badge">8 versions</span>
          </div>
          <div class="mod-tags">
            <span v-for="v in modVersions" :key="v" class="mod-tag">{{ v }}</span>
          </div>
          <ul class="mod-list">
            <li v-for="f in modFeatures" :key="f">{{ f }}</li>
          </ul>
          <div class="mod-links">
            <a v-for="r in githubRepos" :key="r.url" :href="r.url" target="_blank" class="mod-link">
              <n-icon size="14"><Code /></n-icon>{{ r.label }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== 联盟成员 ====== -->
    <section class="section">
      <h2 class="section-title">联盟成员</h2>
      <p class="section-sub">20+ 位成员，以下为已入驻 B站 的成员</p>
      <div class="member-grid">
        <a
          v-for="m in currentMembers" :key="m.uid"
          :href="'https://space.bilibili.com/' + m.uid"
          target="_blank"
          class="member-card"
          :title="m.sign || m.name"
        >
          <BiliFace :src="m.face" :alt="m.name" :size="52" ring />
          <span class="member-name">{{ m.name }}</span>
          <span class="member-level">Lv{{ m.level }}</span>
        </a>
      </div>
    </section>

    <!-- ====== 凯雷作品 ====== -->
    <section class="section">
      <h2 class="section-title">菜的要私的凯雷</h2>
      <p class="section-sub">联盟最高产成员 · 2020—2025 · 点击卡片观看</p>
      <div class="kailei-grid">
        <div
          v-for="cat in kaileiCategories" :key="cat.name"
          class="kailei-card"
        >
          <div class="kailei-icon">
            <n-icon size="18"><PlayCircle /></n-icon>
          </div>
          <div class="kailei-body">
            <span class="kailei-name">{{ cat.name }}</span>
            <span class="kailei-desc">{{ cat.desc }}</span>
          </div>
          <span class="kailei-count">{{ cat.count }}</span>
        </div>
      </div>
    </section>

    <!-- ====== 优酷 + 社区 ====== -->
    <section class="section">
      <div class="split-2">
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">📼 优酷时代</h3>
            <span class="panel-badge">2015—2020</span>
          </div>
          <ul class="youku-list">
            <li v-for="v in youkuHighlights" :key="v">{{ v }}</li>
          </ul>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">💬 社区最新</h3>
          </div>
          <template v-if="latestPosts.length">
            <a
              v-for="post in latestPosts" :key="post.id"
              class="post-row" @click="viewPost(post.id)"
            >
              <span class="post-title">{{ post.title }}</span>
              <span class="post-meta">{{ post.user?.username || '匿名' }} · {{ formatDate(post.updatedAt) }}</span>
            </a>
          </template>
          <p v-else class="panel-empty">暂无帖子</p>
        </div>
      </div>
    </section>

    <!-- ====== 退出成员 ====== -->
    <section class="section">
      <h2 class="section-title section-title--small">曾为联盟留下大量 lom 视频</h2>
      <div class="former-grid">
        <a
          v-for="m in formerMembers" :key="m.uid"
          :href="'https://space.bilibili.com/' + m.uid"
          target="_blank"
          class="former-card"
        >
          <BiliFace :src="m.face" :alt="m.name" :size="44" />
          <span class="former-name">{{ m.name }}</span>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Code, PlayCircle, Server } from '@vicons/ionicons5'
import { forumApi } from '../api/forum.js'
import { userApi } from '../api/user.js'
import { useAuthStore } from '../stores/authStore.js'
import { formatDate } from '../utils/date.js'
import { currentMembers, formerMembers } from '../data/members.js'
import {
  featuredFilms, modVersions, modFeatures, githubRepos,
  kaileiCategories, youkuHighlights,
} from '../data/homepage.js'
import BiliFace from './main/BiliFace.vue'
import LazyBiliPlayer from './main/LazyBiliPlayer.vue'

const authStore = useAuthStore()
const message = useMessage()
const router = useRouter()

const openBilibili = (bvid) => window.open(`https://www.bilibili.com/video/${bvid}`, '_blank')

// ---- Hero stats ----
const heroStats = [
  { value: '2014', label: '创立' },
  { value: '300+', label: '视频' },
  { value: '20+', label: '成员' },
  { value: '12', small: '年', label: '历史' },
]

// ---- Launchers ----
const launchers = [
  { label: 'PCL2', url: 'https://bbsmc.net/software/pcl', class: 'launcher--pcl' },
  { label: 'HMCL', url: 'https://hmcl.huangyuhui.net', class: 'launcher--hmcl' },
  { label: 'MultiMC', url: 'https://multimc.org', class: 'launcher--mm' },
  { label: 'BakaXL', url: 'https://www.bakaxl.com', class: 'launcher--baka' },
]

// ---- Server: verified online via SRV (mc.bzlom.cn → dx.mcgame.pub:19266) ----

// ---- Posts ----
const latestPosts = ref([])
const fetchLatestPosts = async () => {
  try {
    const res = await forumApi.getPosts({ pageSize: 4 })
    latestPosts.value = res.data.posts.slice(0, 4)
  } catch { /* ignore */ }
}
const viewPost = (id) => router.push(`/forum/${id}`)

// ---- Checkin ----
const checkinData = ref({ canCheckin: true, streak: 0 })
const checkinLoading = ref(false)
const checkCanCheckin = () => {
  if (!authStore.user) return
  const d = authStore.user.last_checkin_date
  if (!d) return
  const last = new Date(d); const today = new Date()
  checkinData.value.canCheckin = last.getFullYear() !== today.getFullYear()
    || last.getMonth() !== today.getMonth() || last.getDate() !== today.getDate()
  checkinData.value.streak = authStore.user.checkin_streak || 0
}
const handleCheckin = async () => {
  checkinLoading.value = true
  try {
    const res = await userApi.checkin()
    message.success(`签到成功！+${res.data.reward} 金币`)
    checkinData.value.canCheckin = false
    checkinData.value.streak = res.data.streak
    await authStore.fetchUser()
  } catch (e) {
    message.error(e.response?.data?.message || '签到失败')
  } finally { checkinLoading.value = false }
}

onMounted(async () => {
  await authStore.fetchUser()
  checkCanCheckin()
  fetchLatestPosts()
})
</script>

<style scoped>
/* ========== KEYFRAMES ========== */
@keyframes heroIn {
  from { opacity: 0; transform: scale(.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); backdrop-filter: blur(8px); }
  to   { opacity: 1; transform: translateY(0); backdrop-filter: blur(0); }
}
@keyframes statPop {
  from { opacity: 0; transform: translateY(12px) scale(.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ========== BASE ========== */
.home {
  min-height: 100%;
  background: linear-gradient(180deg,
    var(--color-bg-gradient-start) 0%,
    var(--color-bg-dark) 40%,
    var(--color-bg-dark) 100%);
  color: var(--color-text-primary);
  overflow-x: hidden;
  scroll-behavior: smooth;
}

.section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 72px 24px;
  animation: fadeUp .7s cubic-bezier(.22,.61,.36,1) both;
}
.section-title {
  font-size: 32px; font-weight: 800; text-align: center; margin: 0 0 8px;
  letter-spacing: -.5px; line-height: 1.2;
}
.section-title--small { font-size: 24px; }
.section-sub {
  text-align: center; color: var(--color-text-muted); margin: 0 0 32px; font-size: 16px;
}

.split-2 {
  display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
}

.panel {
  background: var(--glass-bg); border-radius: 18px; padding: 28px;
  backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border);
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .35s ease;
}
.panel:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}
.panel-head {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px;
}
.panel-title { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -.2px; }
.panel-badge {
  font-size: 11px; padding: 3px 10px; border-radius: 10px;
  background: var(--glass-bg-inner); color: var(--color-text-subtle); font-weight: 500;
}
.panel-foot { text-align: center; font-size: 14px; color: var(--color-text-subtle); margin: 10px 0 0; }
.panel-empty { text-align: center; color: var(--color-text-subtle); padding: 36px 0; font-size: 15px; }

/* ========== HERO ========== */
.hero {
  text-align: center; padding: 96px 24px 72px; position: relative;
}
.hero::after {
  content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 80px; height: 1.5px;
  background: linear-gradient(90deg, transparent, var(--color-brand-primary), transparent);
  border-radius: 1px;
}
.hero-logo {
  width: 88px; height: 88px; border-radius: 50%; margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,.35);
  animation: heroIn .8s cubic-bezier(.22,.61,.36,1) both;
}
.hero-title {
  font-size: 64px; font-weight: 900; margin: 0; letter-spacing: -1px; line-height: 1.05;
  background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  animation: heroIn .8s .1s cubic-bezier(.22,.61,.36,1) both;
}
.hero-tagline {
  font-size: 19px; color: var(--color-text-secondary); margin: 8px 0 0; font-style: italic; font-weight: 300;
  animation: heroIn .8s .2s cubic-bezier(.22,.61,.36,1) both;
}
.hero-desc {
  color: var(--color-text-muted); font-size: 16px; margin: 10px 0 0;
  animation: heroIn .8s .3s cubic-bezier(.22,.61,.36,1) both;
}
.hero-stats {
  display: flex; justify-content: center; gap: 64px; margin-top: 44px;
}
.hero-stat {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.hero-stat:nth-child(1) { animation: statPop .6s .35s cubic-bezier(.34,1.56,.64,1) both; }
.hero-stat:nth-child(2) { animation: statPop .6s .45s cubic-bezier(.34,1.56,.64,1) both; }
.hero-stat:nth-child(3) { animation: statPop .6s .55s cubic-bezier(.34,1.56,.64,1) both; }
.hero-stat:nth-child(4) { animation: statPop .6s .65s cubic-bezier(.34,1.56,.64,1) both; }
.hero-stat-num {
  font-size: 44px; font-weight: 900; color: var(--color-text-primary); font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
.hero-stat-num small { font-size: 20px; font-weight: 400; color: var(--color-text-subtle); }
.hero-stat-label {
  font-size: 12px; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 2.5px; font-weight: 500;
}

/* ========== CHECKIN BAR ========== */
.checkin-bar {
  max-width: 1200px; margin: 0 auto; padding: 0 24px 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.checkin-bar-left { display: flex; align-items: center; gap: 10px; font-size: 15px; color: var(--color-text-secondary); }
.checkin-greeting { font-weight: 600; }
.checkin-coins { color: var(--color-gold); font-weight: 700; font-size: 15px; }
.checkin-streak {
  font-size: 12px; color: var(--color-text-subtle); background: var(--glass-bg);
  padding: 2px 10px; border-radius: 8px;
}

/* ========== LAUNCHER ========== */
.launcher-strip {
  max-width: 1200px; margin: 0 auto 16px; padding: 0 24px;
  display: flex; gap: 8px; justify-content: center;
}
.launcher-link {
  font-size: 13px; font-weight: 600; padding: 6px 16px; border-radius: 16px;
  text-decoration: none; transition: transform .3s cubic-bezier(.34,1.56,.64,1);
  letter-spacing: .3px;
}
.launcher--pcl  { background: rgba(0,122,255,.1); color: #007aff; }
.launcher--hmcl { background: rgba(94,92,230,.1); color: #5e5ce6; }
.launcher--mm   { background: rgba(212,168,67,.1); color: #d4a843; }
.launcher--baka { background: rgba(255,69,58,.1); color: #ff453a; }
.launcher-link:hover { transform: scale(1.08); }

/* ========== FILM ========== */
.film-grid {
  display: grid;
  grid-template-columns: 2fr repeat(4, 1fr);
  gap: 14px;
}
.film-card {
  background: var(--glass-bg); border-radius: 14px; overflow: hidden; cursor: pointer;
  transition: transform .4s cubic-bezier(.34,1.56,.64,1), box-shadow .4s ease;
  border: 1px solid var(--glass-border);
}
.film-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 16px 40px rgba(0,0,0,.35);
}
.film-card--featured { grid-row: span 2; }
.film-meta {
  padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;
}
.film-meta-title {
  font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.film-meta-date { font-size: 12px; color: var(--color-text-subtle); flex-shrink: 0; }

/* ========== SERVER ========== */
.server-motd {
  width: 100%; border-radius: 10px; display: block;
}
.server-badge--online {
  background: rgba(52,199,89,.15) !important;
  color: #34c759 !important;
}

/* ========== MOD ========== */
.mod-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 16px; }
.mod-tag {
  font-size: 11px; padding: 3px 8px; border-radius: 5px;
  background: rgba(0,122,255,.1); color: #007aff; font-family: 'SF Mono', monospace;
  font-weight: 500;
}
.mod-list {
  margin: 0; padding: 0 0 0 18px; font-size: 14px; line-height: 1.9;
  color: var(--color-text-secondary);
}
.mod-list li::marker { color: var(--color-brand-primary); }
.mod-links { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 12px; }
.mod-link {
  font-size: 13px; color: var(--color-brand-primary); text-decoration: none;
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 0;
  border-bottom: 1px solid transparent;
  transition: opacity .2s, border-color .2s;
}
.mod-link:hover { opacity: .7; border-color: var(--color-brand-primary); }

/* ========== MEMBERS ========== */
.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 16px; max-width: 1100px; margin: 0 auto;
}
.member-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 18px 8px; text-decoration: none; color: inherit; border-radius: 16px;
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), background .2s;
}
.member-card:hover {
  background: var(--glass-bg);
  transform: translateY(-4px) scale(1.04);
}
.member-name {
  font-size: 13px; font-weight: 600; text-align: center; line-height: 1.2;
  max-width: 88px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.member-level {
  font-size: 11px; color: var(--color-text-subtle); background: var(--glass-bg);
  padding: 2px 7px; border-radius: 6px;
}

/* ========== KAILEI ========== */
.kailei-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px;
}
.kailei-card {
  display: flex; align-items: center; gap: 14px; padding: 16px 18px;
  background: var(--glass-bg); border-radius: 16px;
  border: 1px solid var(--glass-border);
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), border-color .2s;
}
.kailei-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-brand-primary);
}
.kailei-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(0,122,255,.08);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kailei-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.kailei-name { font-size: 15px; font-weight: 600; letter-spacing: -.2px; }
.kailei-desc {
  font-size: 13px; color: var(--color-text-muted); line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kailei-count {
  font-size: 12px; color: var(--color-text-subtle); flex-shrink: 0; font-weight: 500;
}

/* ========== YOUKU ========== */
.youku-list {
  margin: 0; padding: 0; list-style: none; font-size: 14px; line-height: 2;
  color: var(--color-text-secondary);
}

/* ========== POSTS ========== */
.post-row {
  display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; margin-bottom: 4px;
  border-radius: 12px; cursor: pointer; text-decoration: none; color: inherit;
  transition: background .2s, transform .2s;
}
.post-row:hover { background: var(--glass-bg-inner); transform: translateX(4px); }
.post-title { font-size: 15px; font-weight: 600; }
.post-meta { font-size: 13px; color: var(--color-text-subtle); }

/* ========== FORMER ========== */
.former-grid { display: flex; justify-content: center; flex-wrap: wrap; gap: 24px; }
.former-card {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  text-decoration: none; color: inherit; opacity: .5;
  transition: opacity .3s, transform .3s cubic-bezier(.34,1.56,.64,1);
}
.former-card:hover { opacity: .8; transform: translateY(-3px); }
.former-name { font-size: 12px; }

/* ========== RESPONSIVE ========== */
@media (max-width: 900px) {
  .film-grid { grid-template-columns: 1fr 1fr; }
  .film-card--featured { grid-row: span 1; }
}
@media (max-width: 768px) {
  .hero { padding: 64px 16px 48px; }
  .hero-logo { width: 68px; height: 68px; }
  .hero-title { font-size: 40px; }
  .hero-stats { gap: 32px; }
  .hero-stat-num { font-size: 32px; }
  .section { padding: 48px 16px; }
  .section-title { font-size: 26px; }
  .split-2 { grid-template-columns: 1fr; }
  .film-grid { grid-template-columns: 1fr; }
  .member-grid { grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); }
  .kailei-grid { grid-template-columns: 1fr; }
  .checkin-bar { flex-direction: column; align-items: stretch; text-align: center; }
  .checkin-bar-left { justify-content: center; flex-wrap: wrap; }
}
</style>
