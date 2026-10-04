<template>
  <section class="community-shell">
    <div class="community-inner">
      <nav class="community-tabs" aria-label="社区内容">
        <RouterLink to="/forums">社区论坛 <span>01</span></RouterLink>
        <RouterLink to="/articles">联盟公告 <span>02</span></RouterLink>
      </nav>
      <header class="community-header">
        <div>
          <p class="community-eyebrow">{{ eyebrow }}</p>
          <h1>{{ title }}</h1>
          <p class="community-description">{{ description }}</p>
        </div>
        <div class="community-actions"><slot name="actions" /></div>
      </header>
      <div class="community-index">
        <span>{{ keyword ? 'SEARCH RESULTS' : 'LATEST UPDATES' }}</span>
        <p aria-live="polite">
          {{ keyword ? '匹配' : '共' }} <strong>{{ total }}</strong> 条内容
        </p>
      </div>
      <slot />
      <p class="community-footnote">BUILT TOGETHER · 每一个想法，都值得留下。</p>
    </div>
  </section>
</template>
<script setup>
import { RouterLink } from 'vue-router';
defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, required: true },
  description: { type: String, required: true },
  total: { type: Number, default: 0 },
  keyword: { type: String, default: '' },
});
</script>
<style scoped>
.community-shell {
  --community-line: color-mix(in srgb, var(--color-text-primary) 13%, transparent);
  --community-surface: var(--glass-bg-inner);
  background: transparent;
  color: var(--color-text-primary);
  padding: 34px 36px 64px;
  font-family: Inter, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
}
.community-inner {
  max-width: 1168px;
  margin: 0 auto;
  min-width: 0;
}
.community-tabs {
  display: flex;
  gap: 28px;
  border-bottom: 1px solid var(--community-line);
}
.community-tabs a {
  padding: 15px 0;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 13px;
  border-bottom: 2px solid transparent;
}
.community-tabs a.router-link-active {
  border-color: var(--color-portal-accent);
  color: var(--color-text-primary);
}
.community-tabs span {
  font:
    9px ui-monospace,
    monospace;
  color: var(--color-text-muted);
  margin-left: 9px;
}
.community-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 36px;
  padding: 54px 0 34px;
}
.community-eyebrow {
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 2px;
  color: var(--color-portal-accent);
  margin: 0 0 18px;
}
h1 {
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 650;
  letter-spacing: -1.5px;
  margin: 0 0 16px;
}
.community-description {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.9;
  margin: 0;
}
.community-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.community-actions :deep(.n-input) {
  width: 260px;
}
.community-index {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--community-line);
  padding: 20px 0;
}
.community-index > span {
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 1.2px;
  color: var(--color-text-muted);
}
.community-index p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.community-index strong {
  font-weight: 600;
  color: var(--color-text-primary);
}
.community-footnote {
  margin: 38px 0 0;
  color: var(--color-text-muted);
  font:
    10px ui-monospace,
    'Microsoft YaHei',
    monospace;
  letter-spacing: 1px;
}
.community-tabs a:focus-visible {
  outline: 2px solid var(--color-portal-accent);
  outline-offset: 5px;
}
@media (max-width: 900px) {
  .community-header {
    align-items: start;
    flex-direction: column;
    gap: 24px;
  }
  .community-actions {
    width: 100%;
  }
  .community-actions :deep(.n-input) {
    flex: 1;
    min-width: 180px;
  }
}
@media (max-width: 600px) {
  .community-shell {
    padding: 20px 22px 48px;
  }
  .community-header {
    padding-top: 36px;
  }
  .community-actions :deep(.n-input) {
    width: 100%;
    flex-basis: 100%;
    min-width: 0;
  }
  .community-footnote {
    line-height: 1.9;
  }
}
</style>
