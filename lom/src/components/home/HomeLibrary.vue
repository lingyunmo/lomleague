<template>
  <section id="explore" class="library home-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">02 / CREATIVE ARCHIVE</p>
        <h2>每一个世界，都有故事。</h2>
      </div>
      <span class="section-note">留下作品，也留下我们。</span>
    </div>
    <div class="library-tools">
      <div class="library-tabs" role="group" aria-label="作品分类">
        <button v-for="tab in tabs" :key="tab.key" :aria-pressed="kind === tab.key" @click="kind = tab.key">
          {{ tab.label }}
        </button>
      </div>
      <label class="library-search"
        ><span aria-hidden="true">⌕</span
        ><input v-model="query" type="search" placeholder="搜索作品、模组、成员" aria-label="搜索联盟档案"
      /></label>
    </div>
    <div class="archive-grid" aria-live="polite">
      <a
        v-for="item in results"
        :key="item.id"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="archive-card"
        :class="`archive-${item.kind}`"
      >
        <div class="archive-art">
          <span class="archive-glyph" aria-hidden="true">{{ item.glyph }}</span
          ><span class="archive-index">{{ item.label }}</span
          ><span class="archive-arrow" aria-hidden="true">↗</span>
        </div>
        <div class="archive-copy">
          <span class="archive-type">{{ item.category }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </div>
      </a>
    </div>
    <p v-if="!results.length" class="library-empty">
      没有找到“{{ query }}”。试试成员名或作品名。<button
        @click="
          query = '';
          kind = 'all';
        "
      >
        清除筛选
      </button>
    </p>
    <p class="archive-hint">影像和成员主页在新标签页打开；主页不会自动加载第三方播放器。</p>
    <details class="history-details">
      <summary>
        打开完整的联盟历史档案 <span>2015 — 2025 / {{ youkuHighlights.length }} 条记录</span>
      </summary>
      <ul>
        <li v-for="record in youkuHighlights" :key="record">{{ record }}</li>
      </ul>
    </details>
    <details class="history-details">
      <summary>
        模组版本与内容记录 <span>{{ modVersions.length }} 个历史版本</span>
      </summary>
      <div class="version-tags">
        <span v-for="version in modVersions" :key="version">{{ version }}</span>
      </div>
      <ul>
        <li v-for="feature in modFeatures" :key="feature">{{ feature }}</li>
      </ul>
    </details>
    <details class="history-details">
      <summary>
        凯雷的系列作品 <span>{{ kaileiCategories.length }} 个系列</span>
      </summary>
      <div class="series-list">
        <a
          v-for="series in kaileiCategories"
          :key="series.name"
          :href="`https://space.bilibili.com/297984331/search/video?keyword=${encodeURIComponent(series.name)}`"
          target="_blank"
          rel="noopener noreferrer"
          ><strong>{{ series.name }}</strong
          ><span>{{ series.desc }} · {{ series.count }} ↗</span></a
        >
      </div>
    </details>
    <details class="history-details">
      <summary>
        曾为联盟留下大量视频的朋友 <span>{{ formerMembers.length }} 位创作者</span>
      </summary>
      <div class="former-links">
        <a
          v-for="member in formerMembers"
          :key="member.uid"
          :href="`https://space.bilibili.com/${member.uid}`"
          target="_blank"
          rel="noopener noreferrer"
          >{{ member.name }} ↗</a
        >
      </div>
    </details>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  featuredFilms,
  githubRepos,
  modVersions,
  modFeatures,
  kaileiCategories,
  youkuHighlights,
} from '../../data/homepage.js';
import { currentMembers, formerMembers } from '../../data/members.js';
const kind = ref('all');
const query = ref('');
const tabs = [
  { key: 'all', label: '精选档案' },
  { key: 'film', label: '原创影像' },
  { key: 'project', label: '模组与代码' },
  { key: 'member', label: '创作者' },
];
const items = [
  ...featuredFilms.map((film, index) => ({
    id: film.bvid,
    kind: 'film',
    title: `2019-nCoV · ${film.title}`,
    description: `${film.date} / Minecraft 原创微电影`,
    category: '原创影像',
    glyph: '▷',
    label: `EP. ${String(index + 1).padStart(2, '0')}`,
    url: `https://www.bilibili.com/video/${film.bvid}`,
  })),
  ...githubRepos.map((repo) => ({
    id: repo.label,
    kind: 'project',
    title: repo.label,
    description: '开源项目 / 查看代码与发布记录',
    category: '模组与代码',
    glyph: '{ }',
    label: 'OPEN SOURCE',
    url: repo.url,
  })),
  ...currentMembers.map((member) => ({
    id: member.uid,
    kind: 'member',
    title: member.name,
    description: member.sign || '联盟创作者 / Bilibili',
    category: '联盟成员',
    glyph: member.name.slice(0, 1),
    label: 'CREATOR',
    url: `https://space.bilibili.com/${member.uid}`,
  })),
];
const results = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();
  const matching = items.filter(
    (item) =>
      (kind.value === 'all' || item.kind === kind.value) &&
      `${item.title} ${item.description}`.toLocaleLowerCase().includes(search),
  );
  if (kind.value === 'all' && !search)
    return [
      items[3],
      items[0],
      ...items.filter((item) => item.kind === 'project').slice(0, 2),
      ...items.filter((item) => item.kind === 'member').slice(0, 2),
    ];
  return matching;
});
</script>

<style scoped>
.library-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin: 30px 0;
}
.library-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.library-tabs button {
  padding: 10px 16px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 6px;
  cursor: pointer;
}
.library-tabs button[aria-pressed='true'] {
  color: var(--color-text-primary);
  border-color: var(--portal-line);
  background: var(--portal-surface);
}
.library-search {
  display: flex;
  gap: 8px;
  align-items: center;
  border-bottom: 1px solid var(--portal-line);
  padding: 8px 0;
  width: 250px;
}
.library-search span {
  font-size: 24px;
}
input {
  background: transparent;
  border: 0;
  color: var(--color-text-primary);
  width: 100%;
  font: inherit;
  padding: 5px;
  min-width: 0;
}
.archive-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}
.archive-card {
  color: inherit;
  text-decoration: none;
  min-width: 0;
}
.archive-art {
  aspect-ratio: 1.85;
  background: #232b24;
  position: relative;
  padding: 20px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #384336;
  display: flex;
  align-items: center;
  justify-content: center;
}
.archive-art::after {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  border: 1px solid #566749;
  transform: rotate(-30deg);
  transition: transform 0.4s;
}
.archive-card:hover .archive-art::after {
  transform: rotate(-10deg) scale(1.2);
}
.archive-glyph {
  color: #d2e8b5;
  font:
    48px ui-monospace,
    monospace;
  z-index: 1;
}
.archive-index {
  position: absolute;
  bottom: 16px;
  left: 18px;
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 2px;
  color: #a5b397;
}
.archive-arrow {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 24px;
  color: #d2e8b5;
}
.archive-project .archive-art {
  background: #292725;
  border-color: #494136;
}
.archive-project .archive-glyph,
.archive-project .archive-arrow {
  color: #e6c28f;
}
.archive-member .archive-art {
  background: #252b30;
  border-color: #38434d;
}
.archive-member .archive-glyph,
.archive-member .archive-arrow {
  color: #b2cdd7;
}
.archive-copy {
  padding: 20px 2px;
}
.archive-type {
  color: var(--color-text-muted);
  font-size: 11px;
}
h3 {
  margin: 8px 0;
  font-size: 17px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.archive-copy p {
  color: var(--color-text-muted);
  margin: 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.archive-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 20px 0 34px;
}
.library-empty {
  padding: 40px;
  text-align: center;
}
.library-empty button {
  margin-left: 12px;
  color: var(--color-brand-primary);
  border: 0;
  background: transparent;
  cursor: pointer;
}
.history-details {
  border-top: 1px solid var(--portal-line);
  padding: 22px 0;
}
summary {
  cursor: pointer;
  font-size: 14px;
}
summary span {
  float: right;
  font-size: 11px;
  color: var(--color-text-muted);
}
ul {
  line-height: 2.2;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.version-tags,
.former-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 20px 0;
  font-size: 12px;
}
.version-tags span {
  padding: 5px 8px;
  background: var(--portal-surface);
}
.former-links a,
.series-list a {
  color: var(--color-text-secondary);
  text-decoration: none;
}
.series-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 24px 0;
}
.series-list a {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.series-list span {
  color: var(--color-text-muted);
  font-size: 12px;
}
@media (max-width: 760px) {
  .archive-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .library-tools {
    align-items: stretch;
    flex-direction: column;
  }
  .library-search {
    width: 100%;
  }
  .library-tabs button {
    padding: 8px 10px;
  }
  summary span {
    display: block;
    float: none;
    margin-top: 6px;
  }
  .series-list {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 420px) {
  .archive-grid {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .archive-art::after {
    transition: none;
  }
}
</style>
