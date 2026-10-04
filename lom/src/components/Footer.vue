<template>
  <n-layout-footer class="footer">
    <div class="footer-content">
      <p>
        © 2014-{{ year }} lom league. <span class="footer-version">v{{ version }}</span>
      </p>
    </div>
  </n-layout-footer>
</template>

<style scoped>
.footer {
  background-color: var(--color-footer-bg);
  padding: 16px 0;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
}
.footer-version {
  font:
    10px ui-monospace,
    monospace;
  margin-left: 14px;
}
</style>
<script setup>
const year = new Date().getFullYear();
const version = __APP_VERSION__;
</script>
