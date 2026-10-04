<template>
  <div ref="portal" class="portal">
    <section class="hero home-section" data-motion-scene>
      <div class="hero-copy">
        <p class="eyebrow hero-enter" style="--enter-step: 0"><span class="tiny-block" /> LEGACY OF MINECRAFT LEAGUE</p>
        <h1>
          <span class="hero-line"><span class="hero-line-text" style="--enter-step: 1">lom 联盟</span></span
          ><span class="hero-line hero-title-accent"
            ><span class="hero-line-text" style="--enter-step: 2">玩家社区</span></span
          >
        </h1>
        <p class="hero-description hero-enter" style="--enter-step: 3">
          分享 Minecraft 建筑、模组与原创影像。<br />这里汇集了联盟的作品、项目和社区动态。
        </p>
        <div class="hero-actions hero-enter" style="--enter-step: 4">
          <router-link to="/forums" class="portal-button primary">进入社区 <span>↗</span></router-link
          ><a href="#explore" class="portal-button secondary">探索我们的作品 <span>↓</span></a>
        </div>
        <div class="hero-footnote hero-enter" style="--enter-step: 5">
          <span>作品 · 项目 · 社区</span><span>Java 版服务器：mc.bzlom.cn</span>
        </div>
      </div>
      <BlockWorld />
    </section>

    <div class="portal-divider" data-reveal data-motion-scene>
      <span>MINECRAFT COMMUNITY</span><span>建筑 · 模组 · 原创影像 <i data-ambient>✳</i></span>
    </div>

    <section class="home-section workspace">
      <div class="section-heading" data-reveal>
        <div>
          <p class="eyebrow">01 / 社区与服务器</p>
          <h2>社区与服务器</h2>
        </div>
        <router-link to="/register" class="text-link">注册网站账号 ↗</router-link>
      </div>
      <div class="workspace-grid">
        <article class="workspace-card server-card" data-reveal data-depth>
          <div class="card-top">
            <span class="card-code">WORLD / 01</span
            ><span class="server-status" :class="{ online: server.online === true && !server.stale }" role="status"
              ><i />{{ statusLabel }}</span
            >
          </div>
          <div class="workspace-symbol" aria-hidden="true">▥</div>
          <h3>Minecraft 服务器</h3>
          <p>Java Edition · {{ server.version || '版本以服务器为准' }}</p>
          <div v-if="server.online === true" class="server-population">
            {{ server.players?.online ?? '—' }} / {{ server.players?.max ?? '—' }} 玩家<span v-if="server.stale">
              · 上次查询</span
            >
          </div>
          <button class="server-address" @click="copyAddress" aria-label="复制 Minecraft 服务器地址">
            <code>mc.bzlom.cn</code><span>{{ copied ? '已复制 ✓' : '复制地址 ↗' }}</span>
          </button>
          <p class="status-caption">
            状态来源 mcsrvstat.us · 最长 5 分钟缓存
            <button :disabled="statusLoading" @click="loadStatus">{{ statusLoading ? '查询中' : '刷新' }}</button>
          </p>
          <router-link to="/tools/coordinates" class="card-bottom-link"
            >主世界 / 下界坐标工具 <span>↗</span></router-link
          >
          <router-link to="/tools/materials" class="card-bottom-link">建造用料 / 储存换算 <span>↗</span></router-link>
        </article>
        <article class="workspace-card community-card" data-reveal data-depth style="--reveal-delay: 90ms">
          <div class="card-top">
            <span class="card-code">COMMUNITY / 02</span><span class="card-code">社区论坛</span>
          </div>
          <div class="workspace-symbol" aria-hidden="true">↗</div>
          <h3>最新帖子</h3>
          <p>分享建筑、讨论模组，或只是来打声招呼。</p>
          <div class="post-list" aria-live="polite">
            <p v-if="postsLoading" class="state-text">正在读取社区动态…</p>
            <p v-else-if="postsError" class="state-text">暂时无法读取动态。<button @click="loadPosts">重试</button></p>
            <p v-else-if="!posts.length" class="state-text">暂无帖子，可以前往论坛发布。</p>
            <router-link v-for="post in posts" :key="post.id" :to="`/forum/${post.id}`"
              ><span>{{ post.title }}</span
              ><small>{{ post.user?.username || '联盟成员' }} ↗</small></router-link
            >
          </div>
          <router-link to="/forums" class="card-bottom-link">打开社区论坛 <span>↗</span></router-link>
        </article>
        <article class="workspace-card member-card" data-reveal data-depth style="--reveal-delay: 180ms">
          <div class="card-top"><span class="card-code">MEMBER / 03</span><span class="card-code">每日签到</span></div>
          <div class="workspace-symbol" aria-hidden="true">✳</div>
          <h3>{{ auth.user ? `你好，${auth.userDisplayName}` : '登录与签到' }}</h3>
          <template v-if="auth.token"
            ><p v-if="auth.userError" role="status">
              {{ auth.userError }} <button @click="auth.fetchUser()" :disabled="auth.userLoading">重试</button>
            </p>
            <p>连续签到 {{ auth.user?.checkin_streak ?? '—' }} 天</p>
            <strong class="coin-count">{{ auth.user?.gold_coins ?? '—' }} <small>金币</small></strong
            ><n-button type="primary" :loading="checkinLoading" :disabled="!canCheckin" @click="checkin">{{
              checkinLabel
            }}</n-button
            ><router-link to="/profile" class="card-bottom-link">我的联盟档案 <span>↗</span></router-link></template
          >
          <template v-else
            ><p>注册网站账号，参与社区讨论与每日签到。</p>
            <div class="member-marks" aria-hidden="true"><span>l</span><span>o</span><span>m</span><span>+</span></div>
            <router-link to="/login" class="card-bottom-link">登录 / 注册 <span>↗</span></router-link></template
          >
        </article>
      </div>
    </section>

    <HomeLibrary />

    <section class="home-section toolbox">
      <div data-reveal>
        <p class="eyebrow">03 / 启动器</p>
        <h2>Minecraft 启动器</h2>
        <p>选择熟悉的启动器，下载请认准项目官方页面。</p>
      </div>
      <div class="launcher-links" data-reveal style="--reveal-delay: 100ms">
        <a
          v-for="launcher in launchers"
          :key="launcher.name"
          :href="launcher.url"
          target="_blank"
          rel="noopener noreferrer"
          ><strong>{{ launcher.name }}</strong
          ><span>项目主页 ↗</span></a
        >
      </div>
    </section>
    <section class="home-section closing" data-motion-scene>
      <p class="eyebrow" data-reveal>联盟历史</p>
      <h2 data-reveal>历年的作品与活动</h2>
      <router-link to="/about" class="text-link" data-reveal>了解联盟历史 ↗</router-link
      ><span class="closing-mark" aria-hidden="true" data-ambient>lom.</span>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import BlockWorld from '../components/home/BlockWorld.vue';
import HomeLibrary from '../components/home/HomeLibrary.vue';
import client from '../api/client.js';
import { forumApi } from '../api/forum.js';
import { userApi } from '../api/user.js';
import { useAuthStore } from '../stores/authStore.js';
import { useHomeMotion } from '../composables/useHomeMotion.js';

const portal = ref(null);
useHomeMotion(portal);
const auth = useAuthStore();
const message = useMessage();
const posts = ref([]),
  postsLoading = ref(true),
  postsError = ref(false);
const server = ref({ online: null }),
  statusLoading = ref(false),
  copied = ref(false);
const checkinLoading = ref(false),
  checkedIn = ref(false);
const abortController = new AbortController();
let copyTimer, checkinRequest;
let disposed = false,
  memberGeneration = 0,
  postsSequence = 0;
watch(
  [() => auth.token, () => auth.user?.id],
  () => {
    memberGeneration++;
    checkinRequest = undefined;
    checkedIn.value = false;
    checkinLoading.value = false;
  },
  { flush: 'sync' },
);
const statusLabel = computed(() =>
  statusLoading.value
    ? '查询中'
    : server.value.stale
      ? '状态待确认'
      : server.value.online === true
        ? '服务器在线'
        : server.value.online === false
          ? '服务器离线'
          : '状态暂不可用',
);
const hasCheckedInToday = computed(() => {
  if (checkedIn.value) return true;
  return (
    !!auth.user?.last_checkin_date && new Date(auth.user.last_checkin_date).toDateString() === new Date().toDateString()
  );
});
const canCheckin = computed(
  () =>
    !!auth.token &&
    !!auth.user?.id &&
    !auth.userLoading &&
    !auth.userError &&
    !hasCheckedInToday.value &&
    !checkinLoading.value,
);
const checkinLabel = computed(() => {
  if (checkinLoading.value) return '签到中…';
  if (hasCheckedInToday.value) return '今日已签到 ✓';
  if (auth.userError) return '请先重试用户信息';
  if (!auth.user?.id || auth.userLoading) return '正在读取签到状态…';
  return '完成今日签到';
});
const launchers = [
  { name: 'PCL', url: 'https://github.com/Hex-Dragon/PCL2' },
  { name: 'HMCL', url: 'https://hmcl.huangyuhui.net/' },
  { name: 'MultiMC', url: 'https://multimc.org/' },
  { name: 'BakaXL', url: 'https://www.bakaxl.com/' },
];
async function loadPosts() {
  if (disposed) return;
  const sequence = ++postsSequence;
  postsLoading.value = true;
  postsError.value = false;
  try {
    const res = await forumApi.getPosts({ pageSize: 3 });
    if (disposed || sequence !== postsSequence) return;
    posts.value = res.data.posts.slice(0, 3);
  } catch {
    if (!disposed && sequence === postsSequence) postsError.value = true;
  } finally {
    if (!disposed && sequence === postsSequence) postsLoading.value = false;
  }
}
async function loadStatus() {
  if (disposed || statusLoading.value) return;
  statusLoading.value = true;
  try {
    const res = await client.get('/server/status', { signal: abortController.signal, timeout: 6000 });
    if (!disposed) server.value = res.data;
  } catch {
    if (!disposed) server.value = { online: null };
  } finally {
    if (!disposed) statusLoading.value = false;
  }
}
async function copyAddress() {
  if (disposed) return;
  try {
    await navigator.clipboard.writeText('mc.bzlom.cn');
    if (disposed) return;
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied.value = false), 2200);
  } catch {
    if (!disposed) message.info('服务器地址：mc.bzlom.cn，请长按或选中复制');
  }
}
async function checkin() {
  if (disposed || !canCheckin.value || checkinRequest) return;
  const request = { token: auth.token, userId: auth.user.id, generation: memberGeneration };
  checkinRequest = request;
  const isCurrent = () =>
    !disposed &&
    checkinRequest === request &&
    request.token === auth.token &&
    request.userId === auth.user?.id &&
    request.generation === memberGeneration;
  checkinLoading.value = true;
  try {
    const res = await userApi.checkin();
    if (!isCurrent()) return;
    checkedIn.value = true;
    message.success(`签到成功！+${res.data.reward} 金币`);
    await auth.fetchUser();
  } catch (error) {
    if (isCurrent()) message.error(error.response?.data?.message || '签到失败，请稍后再试');
  } finally {
    if (isCurrent()) {
      checkinRequest = undefined;
      checkinLoading.value = false;
    }
  }
}
onMounted(() => {
  loadPosts();
  loadStatus();
});
onBeforeUnmount(() => {
  disposed = true;
  memberGeneration++;
  postsSequence++;
  checkinRequest = undefined;
  abortController.abort();
  clearTimeout(copyTimer);
});
</script>

<style>
.portal {
  --motion-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --portal-line: color-mix(in srgb, var(--color-text-primary) 13%, transparent);
  --portal-surface: var(--glass-bg);
  background: transparent;
  color: var(--color-text-primary);
  font-family: Inter, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
}
.portal[data-motion='on'] [data-reveal] {
  transition:
    opacity 700ms var(--motion-ease),
    transform 700ms var(--motion-ease);
  transition-delay: var(--reveal-delay, 0ms);
}
.portal[data-motion='on'] .reveal-pending {
  opacity: 0;
  transform: translateY(28px);
}
.portal.motion-paused *,
.portal.motion-paused *::before,
.portal.motion-paused *::after,
.portal .scene-paused *,
.portal .scene-paused *::before,
.portal .scene-paused *::after {
  animation-play-state: paused !important;
}
.portal[data-motion='off'] *,
.portal[data-motion='off'] *::before,
.portal[data-motion='off'] *::after {
  animation: none !important;
  transition: none !important;
}
.home-section {
  max-width: 1240px;
  padding: 72px 36px;
  margin: 0 auto;
}
.portal .eyebrow {
  font:
    10px ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  letter-spacing: 1.7px;
  color: var(--color-text-muted);
  margin: 0 0 18px;
}
.portal .section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 20px;
}
.portal h2 {
  font-size: clamp(25px, 3vw, 35px);
  font-weight: 600;
  letter-spacing: -1px;
  margin: 0;
  line-height: 1.4;
}
.section-note,
.text-link {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-decoration: none;
}
.text-link:hover {
  color: var(--color-brand-primary);
}
.portal a:focus-visible,
.portal button:focus-visible,
.portal input:focus-visible,
.portal summary:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 5px;
}
@media (max-width: 760px) {
  .home-section {
    padding: 48px 22px;
  }
  .portal .section-heading {
    align-items: start;
  }
  .section-note {
    display: none;
  }
}
</style>
<style scoped>
.hero {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  align-items: center;
  padding-top: 40px;
  padding-bottom: 36px;
  min-height: 540px;
  gap: 12px;
}
.hero-copy {
  position: relative;
  z-index: 1;
}
.tiny-block {
  display: inline-block;
  width: 7px;
  height: 7px;
  background: var(--color-portal-accent);
  margin-right: 8px;
}
h1 {
  font-size: clamp(45px, 5.4vw, 73px);
  line-height: 1.22;
  font-weight: 650;
  letter-spacing: -3px;
  margin: 30px 0 25px;
}
.hero-title-accent {
  color: var(--color-portal-accent);
}
.hero-line {
  display: block;
  overflow: clip;
  padding-bottom: 0.08em;
  margin-bottom: -0.08em;
}
.hero-line-text {
  display: block;
}
.portal[data-motion='on'] .hero-line-text {
  animation: title-arrive 1050ms var(--motion-ease) both;
  animation-delay: calc(var(--enter-step) * 110ms);
}
.portal[data-motion='on'] .hero-enter {
  animation: copy-arrive 850ms var(--motion-ease) both;
  animation-delay: calc(var(--enter-step) * 110ms);
}
@keyframes title-arrive {
  from {
    transform: translateY(110%) rotate(2deg);
    opacity: 0;
  }
  to {
    transform: translateY(0) rotate(0);
    opacity: 1;
  }
}
@keyframes copy-arrive {
  from {
    transform: translateY(18px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.hero-description {
  font-size: 14px;
  line-height: 2;
  color: var(--color-text-secondary);
}
.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}
.portal-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 14px 20px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 5px;
  transition:
    transform 250ms var(--motion-ease),
    box-shadow 250ms;
}
.portal-button:hover,
.portal-button:focus-visible {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-brand-primary) 16%, transparent);
}
.portal-button span,
.card-bottom-link span,
.launcher-links span {
  transition: transform 250ms var(--motion-ease);
}
.portal-button:hover span,
.portal-button:focus-visible span,
.card-bottom-link:hover span,
.card-bottom-link:focus-visible span,
.launcher-links a:hover span,
.launcher-links a:focus-visible span {
  transform: translate(3px, -3px);
}
.portal-button:active {
  transform: translateY(0) scale(0.98);
}
.primary {
  background: var(--color-portal-accent);
  color: var(--color-on-accent);
}
.secondary {
  border: 1px solid var(--portal-line);
  color: var(--color-text-primary);
}
.hero-footnote {
  display: flex;
  gap: 22px;
  margin-top: 36px;
  color: var(--color-text-muted);
  font:
    10px ui-monospace,
    monospace;
}
.hero-footnote strong {
  color: var(--color-text-secondary);
  font-weight: 400;
}
.portal-divider {
  max-width: 1168px;
  margin: auto;
  border-top: 1px solid var(--portal-line);
  border-bottom: 1px solid var(--portal-line);
  display: flex;
  justify-content: space-between;
  padding: 17px 0;
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 1.2px;
  color: var(--color-text-muted);
}
.portal-divider i {
  display: inline-block;
  animation: compass-turn 22s linear infinite;
  font-size: 20px;
  color: var(--color-portal-accent);
  font-style: normal;
  margin-left: 16px;
}
@keyframes compass-turn {
  to {
    transform: rotate(360deg);
  }
}
.workspace-grid {
  margin-top: 30px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.workspace-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  padding: 24px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-medium);
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.workspace-card::before {
  content: '';
  position: absolute;
  z-index: -1;
  pointer-events: none;
  width: 240px;
  height: 240px;
  left: calc(50% - 120px);
  top: calc(35% - 120px);
  background: radial-gradient(circle, color-mix(in srgb, var(--color-brand-primary) 14%, transparent), transparent 68%);
  opacity: 0;
  transform: translate(calc(var(--depth-x, 0) * 90px), calc(var(--depth-y, 0) * 90px));
  transition: opacity 300ms;
}
.workspace-card.depth-active::before,
.workspace-card:focus-within::before {
  opacity: 1;
}
.portal[data-motion='on'] .workspace-card.depth-active:not(.reveal-pending) {
  transform: perspective(1000px) rotateX(calc(var(--depth-y, 0) * -1.5deg)) rotateY(calc(var(--depth-x, 0) * 1.5deg))
    translateY(-4px);
  transition-duration: 180ms;
  transition-delay: 0ms;
}
.card-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.card-code {
  font:
    9px ui-monospace,
    monospace;
  color: var(--color-text-muted);
}
.server-status {
  font-size: 10px;
  color: var(--color-text-muted);
}
.server-status i {
  width: 5px;
  height: 5px;
  display: inline-block;
  border-radius: 50%;
  background: currentColor;
  margin-right: 6px;
}
.server-status.online {
  color: var(--color-success);
}
.workspace-symbol {
  font:
    38px ui-monospace,
    monospace;
  margin: 25px 0 16px;
  color: var(--color-portal-accent);
}
.community-card .workspace-symbol {
  color: var(--color-brand-secondary);
}
.member-card .workspace-symbol {
  color: var(--color-portal-accent);
}
.workspace-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px;
  overflow-wrap: anywhere;
}
.workspace-card > p {
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-muted);
  margin: 0 0 18px;
}
.server-population {
  font-size: 12px;
  margin: 0 0 16px;
  color: var(--color-text-secondary);
}
.server-address {
  margin-top: auto;
  padding: 14px 0;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  border-top: 1px solid var(--portal-line);
  background: transparent;
  cursor: pointer;
}
.server-address code {
  font:
    15px ui-monospace,
    monospace;
}
.server-address span {
  font-size: 10px;
  color: var(--color-text-muted);
}
.workspace-card .status-caption {
  font-size: 9px;
  margin: 5px 0 0;
}
.status-caption button,
.state-text button {
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: inherit;
  cursor: pointer;
  padding: 0 3px;
}
.post-list {
  margin-bottom: 12px;
}
.post-list a {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--portal-line);
  font-size: 11px;
  text-decoration: none;
  color: var(--color-text-primary);
}
.post-list a span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.post-list small {
  color: var(--color-text-muted);
  flex-shrink: 0;
  font-size: 9px;
}
.state-text {
  color: var(--color-text-muted);
  font-size: 12px;
}
.card-bottom-link {
  min-height: 44px;
  align-items: center;
  box-sizing: border-box;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--portal-line);
  display: flex;
  justify-content: space-between;
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 12px;
}
.card-bottom-link + .card-bottom-link {
  margin-top: 12px;
}
.member-marks {
  display: flex;
  margin: 15px 0 32px;
}
.member-marks span {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--portal-line);
  border-radius: 50%;
  margin-left: -5px;
  background: var(--color-bg-dark);
  color: var(--color-text-secondary);
  font:
    18px ui-monospace,
    monospace;
}
.coin-count {
  font-size: 30px;
  margin: 5px 0 20px;
}
.coin-count small {
  font-size: 11px;
  font-weight: 400;
}
.member-card :deep(.n-button) {
  align-self: start;
  margin-bottom: 20px;
}
.toolbox {
  border-top: 1px solid var(--portal-line);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: center;
}
.toolbox h2 {
  font-size: 28px;
}
.toolbox p:not(.eyebrow) {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.8;
}
.launcher-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.launcher-links a {
  transition:
    transform 250ms var(--motion-ease),
    border-color 250ms;
  color: var(--color-text-primary);
  text-decoration: none;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--portal-line);
  border-radius: var(--glass-radius-sm);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  padding: 18px;
  font-size: 13px;
}
.launcher-links a:hover,
.launcher-links a:focus-visible {
  transform: translateY(-4px);
  border-color: var(--color-brand-primary);
}
.launcher-links span {
  color: var(--color-text-muted);
  font-size: 10px;
}
.closing {
  border-top: 1px solid var(--portal-line);
  position: relative;
  overflow: hidden;
  padding-bottom: 90px;
}
.closing h2 {
  margin-bottom: 24px;
  font-size: 38px;
}
.closing-mark {
  animation: closing-drift 10s ease-in-out infinite;
  position: absolute;
  right: 30px;
  bottom: 45px;
  font-size: 160px;
  font-weight: 800;
  letter-spacing: -14px;
  color: var(--color-text-primary);
  opacity: 0.06;
  pointer-events: none;
}
@keyframes closing-drift {
  50% {
    transform: translate(-8px, -8px) rotate(-2deg);
  }
}
@media (max-width: 1000px) {
  .portal-divider {
    margin: 0 36px;
  }
  .workspace-grid {
    grid-template-columns: 1fr 1fr;
  }
  .member-card {
    grid-column: 1/-1;
  }
  .hero {
    min-height: 480px;
  }
  h1 {
    font-size: 53px;
  }
  .hero-actions {
    flex-wrap: wrap;
  }
  .portal-button {
    gap: 15px;
  }
}
@media (max-width: 760px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 0;
    padding-top: 48px;
  }
  .hero-copy {
    padding-bottom: 10px;
  }
  h1 {
    font-size: clamp(42px, 10vw, 66px);
    margin: 20px 0;
  }
  .hero :deep(.block-world) {
    max-width: 460px;
    margin: -20px auto 0;
  }
  .hero-description {
    font-size: 13px;
  }
  .portal-divider {
    margin: 0 22px;
    font-size: 8px;
  }
  .portal-divider span:last-child {
    display: none;
  }
  .workspace-grid {
    grid-template-columns: 1fr;
  }
  .member-card {
    grid-column: auto;
  }
  .toolbox {
    grid-template-columns: 1fr;
  }
  .closing h2 {
    font-size: 32px;
  }
  .closing-mark {
    font-size: 100px;
    right: 10px;
    bottom: 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .portal *,
  .portal *::before,
  .portal *::after {
    animation: none !important;
    transition: none !important;
  }
  .portal .reveal-pending {
    opacity: 1;
    transform: none;
  }
}
</style>
