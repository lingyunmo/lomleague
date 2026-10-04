<template>
  <div class="auth-page">
    <div class="auth-card">
      <img src="/logo.jpg" alt="lom" class="auth-logo" />
      <h2 class="auth-title">欢迎回来</h2>
      <p class="auth-sub">登录 lom 联盟</p>

      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :disabled="loading"
        class="auth-form"
        @submit.prevent="handleLogin"
      >
        <n-form-item path="username">
          <n-input
            v-model:value="form.username"
            placeholder="用户名"
            size="large"
            :disabled="loading"
            :input-props="{ autocomplete: 'username', 'aria-label': '用户名' }"
          >
            <template #prefix
              ><n-icon><Person /></n-icon
            ></template>
          </n-input>
        </n-form-item>
        <n-form-item path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            :disabled="loading"
            placeholder="密码"
            size="large"
            :input-props="{ autocomplete: 'current-password', 'aria-label': '密码' }"
            @keyup.enter="handleLogin"
          >
            <template #prefix
              ><n-icon><LockClosed /></n-icon
            ></template>
          </n-input>
        </n-form-item>

        <n-button type="primary" block size="large" :loading="loading" @click="handleLogin"> 登录 </n-button>
      </n-form>

      <p class="auth-switch">
        还没有账号？
        <n-button text type="primary" @click="router.push('/register')">注册</n-button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { Person, LockClosed } from '@vicons/ionicons5';
import { userApi } from '../../api/user.js';
import { useAuthStore } from '../../stores/authStore.js';

const form = ref({ username: '', password: '' });
const formRef = ref(null);
const loading = ref(false);
const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
let generation = 0,
  operation,
  disposed = false,
  committingToken = false;
const resetPrivateState = () => {
  generation++;
  operation = undefined;
  loading.value = false;
  form.value = { username: '', password: '' };
};
watch(
  () => authStore.token,
  () => {
    if (!committingToken) resetPrivateState();
  },
  { flush: 'sync' },
);
watch(() => route.fullPath, resetPrivateState, { flush: 'sync' });
onBeforeUnmount(() => {
  disposed = true;
  resetPrivateState();
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const handleLogin = async () => {
  if (disposed || loading.value || route.name !== 'Login' || !formRef.value) return;
  const payload = { ...form.value };
  const request = {
    token: authStore.token,
    generation,
    path: route.fullPath,
    destination: typeof route.query.redirect === 'string' ? route.query.redirect : '/',
  };
  operation = request;
  const isCurrent = () =>
    !disposed &&
    operation === request &&
    request.generation === generation &&
    request.token === authStore.token &&
    request.path === route.fullPath &&
    route.name === 'Login';
  loading.value = true;
  let validated = false,
    committed = false;
  try {
    await formRef.value.validate();
    validated = true;
    if (!isCurrent()) return;
    if (payload.username !== form.value.username || payload.password !== form.value.password) {
      message.warning('输入已更改，请重新提交');
      return;
    }
    const response = await userApi.login(payload);
    if (!isCurrent()) return;
    const token = response.data?.token;
    if (typeof token !== 'string' || !token) throw new Error('Missing login token');
    // The real store may synchronously clear the old token before installing this one.
    committingToken = true;
    try {
      authStore.setToken(token);
      request.token = authStore.token;
    } finally {
      committingToken = false;
    }
    if (!isCurrent() || authStore.token !== token) return;
    committed = true;
    form.value.password = '';
    await authStore.fetchUser();
    if (!isCurrent()) return;
    message.success('登录成功');
    await router.push(request.destination);
  } catch (error) {
    if (isCurrent())
      message.error(
        committed
          ? '已登录，但页面跳转失败，请返回首页'
          : validated
            ? error.response?.data?.message || '登录失败，请检查用户名和密码'
            : '请修正表单中的错误',
      );
  } finally {
    if (isCurrent()) {
      loading.value = false;
      operation = undefined;
    }
  }
};
</script>

<style scoped>
.auth-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: linear-gradient(180deg, var(--color-bg-gradient-start), var(--color-bg-dark) 60%);
}

.auth-card {
  width: 380px;
  max-width: 100%;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 40px 32px;
  animation: fadeIn 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.auth-logo {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: block;
  margin: 0 auto 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.auth-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  text-align: center;
  color: var(--color-text-primary);
}

.auth-sub {
  margin: 4px 0 28px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-muted);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.auth-switch {
  text-align: center;
  margin: 24px 0 0;
  font-size: 14px;
  color: var(--color-text-muted);
}
.auth-form :deep(.n-input),
.auth-form :deep(.n-input__input),
.auth-form :deep(.n-input__input-el),
.auth-form :deep(button),
.auth-switch :deep(button) {
  min-height: 44px;
}
@media (prefers-reduced-motion: reduce) {
  .auth-card {
    animation: none;
  }
}
</style>
