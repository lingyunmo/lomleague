<template>
  <div class="portal">
    <section class="hero home-section">
      <div class="hero-copy">
        <p class="eyebrow"><span class="tiny-block" /> LEGACY OF MINECRAFT LEAGUE</p>
        <h1>一起，把世界<br /><span>建得更大。</span></h1>
        <p class="hero-description">
          从第一块方块，到属于我们的世界。<br />这里是 lom 联盟，一群热爱创造的人的长期存档。
        </p>
        <div class="hero-actions">
          <router-link to="/forums" class="portal-button primary">进入社区 <span>↗</span></router-link
          ><a href="#explore" class="portal-button secondary">探索我们的作品 <span>↓</span></a>
        </div>
        <div class="hero-footnote">
          <span>SINCE <strong>2014</strong></span
          ><span>{{ years }} 年的故事，仍在继续</span>
        </div>
      </div>
      <BlockWorld />
    </section>

    <div class="portal-divider">
      <span>BUILD. PLAY. CREATE. TOGETHER.</span><span>一个联盟，无限可能 <i>✳</i></span>
    </div>

    <section class="home-section workspace">
      <div class="section-heading">
        <div>
          <p class="eyebrow">01 / YOUR NEXT ADVENTURE</p>
          <h2>今天，从这里出发。</h2>
        </div>
        <router-link to="/invite" class="text-link">成为其中一员 ↗</router-link>
      </div>
      <div class="workspace-grid">
        <article class="workspace-card server-card">
          <div class="card-top">
            <span class="card-code">WORLD / 01</span
            ><span class="server-status" :class="{ online: server.online === true && !server.stale }" role="status"
              ><i />{{ statusLabel }}</span
            >
          </div>
          <div class="workspace-symbol" aria-hidden="true">▥</div>
          <h3>下一个世界，见。</h3>
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
        <article class="workspace-card community-card">
          <div class="card-top">
            <span class="card-code">COMMUNITY / 02</span><span class="card-code">留下你的声音</span>
          </div>
          <div class="workspace-symbol" aria-hidden="true">↗</div>
          <h3>新想法，旧朋友。</h3>
          <p>分享建筑、讨论模组，或只是来打声招呼。</p>
          <div class="post-list" aria-live="polite">
            <p v-if="postsLoading" class="state-text">正在读取社区动态…</p>
            <p v-else-if="postsError" class="state-text">暂时无法读取动态。<button @click="loadPosts">重试</button></p>
            <p v-else-if="!posts.length" class="state-text">还没有帖子，来留下第一条足迹。</p>
            <router-link v-for="post in posts" :key="post.id" :to="`/forum/${post.id}`"
              ><span>{{ post.title }}</span
              ><small>{{ post.user?.username || '联盟成员' }} ↗</small></router-link
            >
          </div>
          <router-link to="/forums" class="card-bottom-link">打开社区论坛 <span>↗</span></router-link>
        </article>
        <article class="workspace-card member-card">
          <div class="card-top">
            <span class="card-code">MEMBER / 03</span><span class="card-code">每天都有小惊喜</span>
          </div>
          <div class="workspace-symbol" aria-hidden="true">✳</div>
          <h3>{{ auth.user ? `你好，${auth.userDisplayName}` : '不止是路过。' }}</h3>
          <template v-if="auth.token"
            ><p v-if="auth.userError" role="status">
              {{ auth.userError }} <button @click="auth.fetchUser()" :disabled="auth.userLoading">重试</button>
            </p>
            <p>连续签到 {{ auth.user?.checkin_streak || 0 }} 天，继续积攒你的联盟金币。</p>
            <strong class="coin-count">{{ auth.user?.gold_coins || 0 }} <small>金币</small></strong
            ><n-button type="primary" :loading="checkinLoading" :disabled="!canCheckin" @click="checkin">{{
              canCheckin ? '完成今日签到' : '今日已签到 ✓'
            }}</n-button
            ><router-link to="/profile" class="card-bottom-link">我的联盟档案 <span>↗</span></router-link></template
          >
          <template v-else
            ><p>创建你的联盟档案，把每一次相遇都留在这里。</p>
            <div class="member-marks" aria-hidden="true"><span>l</span><span>o</span><span>m</span><span>+</span></div>
            <router-link to="/login" class="card-bottom-link">登录 / 加入联盟 <span>↗</span></router-link></template
          >
        </article>
      </div>
    </section>

    <HomeLibrary />

    <section class="home-section toolbox">
      <div>
        <p class="eyebrow">03 / READY TO PLAY</p>
        <h2>准备好，开始创造。</h2>
        <p>选择熟悉的启动器，下载请认准项目官方页面。</p>
      </div>
      <div class="launcher-links">
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
    <section class="home-section closing">
      <p class="eyebrow">THE STORY IS STILL LOADING.</p>
      <h2>故事还没结束。<br />我们，下个世界见。</h2>
      <router-link to="/about" class="text-link">翻开曾经的我们 ↗</router-link
      ><span class="closing-mark" aria-hidden="true">lom.</span>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import BlockWorld from '../components/home/BlockWorld.vue';
import HomeLibrary from '../components/home/HomeLibrary.vue';
import client from '../api/client.js';
import { forumApi } from '../api/forum.js';
import { userApi } from '../api/user.js';
import { useAuthStore } from '../stores/authStore.js';

const auth = useAuthStore();
const message = useMessage();
const years = new Date().getFullYear() - 2014;
const posts = ref([]),
  postsLoading = ref(true),
  postsError = ref(false);
const server = ref({ online: null }),
  statusLoading = ref(false),
  copied = ref(false);
const checkinLoading = ref(false),
  checkedIn = ref(false);
const abortController = new AbortController();
let copyTimer;
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
const canCheckin = computed(() => {
  if (checkedIn.value) return false;
  if (!auth.user?.last_checkin_date) return true;
  return new Date(auth.user.last_checkin_date).toDateString() !== new Date().toDateString();
});
const launchers = [
  { name: 'PCL', url: 'https://github.com/Hex-Dragon/PCL2' },
  { name: 'HMCL', url: 'https://hmcl.huangyuhui.net/' },
  { name: 'MultiMC', url: 'https://multimc.org/' },
  { name: 'BakaXL', url: 'https://www.bakaxl.com/' },
];
async function loadPosts() {
  postsLoading.value = true;
  postsError.value = false;
  try {
    const res = await forumApi.getPosts({ pageSize: 3 });
    posts.value = res.data.posts.slice(0, 3);
  } catch {
    postsError.value = true;
  } finally {
    postsLoading.value = false;
  }
}
async function loadStatus() {
  if (statusLoading.value) return;
  statusLoading.value = true;
  try {
    const res = await client.get('/server/status', { signal: abortController.signal, timeout: 6000 });
    server.value = res.data;
  } catch {
    server.value = { online: null };
  } finally {
    statusLoading.value = false;
  }
}
async function copyAddress() {
  try {
    await navigator.clipboard.writeText('mc.bzlom.cn');
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied.value = false), 2200);
  } catch {
    message.info('服务器地址：mc.bzlom.cn，请长按或选中复制');
  }
}
async function checkin() {
  checkinLoading.value = true;
  try {
    const res = await userApi.checkin();
    checkedIn.value = true;
    message.success(`签到成功！+${res.data.reward} 金币`);
    await auth.fetchUser();
  } catch (error) {
    message.error(error.response?.data?.message || '签到失败，请稍后再试');
  } finally {
    checkinLoading.value = false;
  }
}
onMounted(() => {
  loadPosts();
  loadStatus();
});
onUnmounted(() => {
  abortController.abort();
  clearTimeout(copyTimer);
});
</script>

<style>
.portal {
  --portal-line: color-mix(in srgb, var(--color-text-primary) 13%, transparent);
  --portal-surface: color-mix(in srgb, var(--color-text-primary) 3%, var(--color-bg-dark));
  background: var(--color-bg-dark);
  color: var(--color-text-primary);
  font-family: Inter, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
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
  background: #b8e780;
  margin-right: 8px;
}
h1 {
  font-size: clamp(45px, 5.4vw, 73px);
  line-height: 1.22;
  font-weight: 650;
  letter-spacing: -3px;
  margin: 30px 0 25px;
}
h1 span {
  color: var(--color-portal-accent);
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
  transition: transform 0.2s;
}
.portal-button:hover {
  transform: translateY(-2px);
}
.primary {
  background: #b8e780;
  color: #172216;
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
  font-size: 20px;
  color: #b8e780;
  font-style: normal;
  margin-left: 16px;
}
.workspace-grid {
  margin-top: 30px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.workspace-card {
  padding: 24px;
  border: 1px solid var(--portal-line);
  border-radius: 8px;
  background: var(--portal-surface);
  min-width: 0;
  display: flex;
  flex-direction: column;
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
  color: #a4d173;
}
.workspace-symbol {
  font:
    38px ui-monospace,
    monospace;
  margin: 25px 0 16px;
  color: #b7cd98;
}
.community-card .workspace-symbol {
  color: #d7bc91;
}
.member-card .workspace-symbol {
  color: #a9c6d1;
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
  color: var(--color-text-primary);
  text-decoration: none;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--portal-line);
  border-radius: 5px;
  padding: 18px;
  font-size: 13px;
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
  .portal-button {
    transition: none;
  }
}
</style>
