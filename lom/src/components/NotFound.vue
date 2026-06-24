<template>
  <div class="notfound">
    <h1>404</h1>
    <p>页面不存在</p>
    <n-button type="primary" @click="$router.push('/')">返回首页</n-button>
  </div>
</template>

<style scoped>
.notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  color: var(--color-text-primary);
}
.notfound h1 {
  font-size: 72px;
  font-weight: 900;
  margin: 0;
  color: var(--color-brand-primary);
}
.notfound p {
  font-size: 18px;
  margin: 8px 0 24px;
  color: var(--color-text-muted);
}
</style>
