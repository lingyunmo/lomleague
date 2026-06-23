<template>
  <div class="auth-page">
    <div class="auth-card">
      <img src="/logo.jpg" alt="lom" class="auth-logo" />
      <h2 class="auth-title">欢迎回来</h2>
      <p class="auth-sub">登录 lom 联盟</p>

      <n-form ref="formRef" :model="form" :rules="rules" class="auth-form">
        <n-form-item path="username">
          <n-input
            v-model:value="form.username"
            placeholder="用户名"
            size="large"
            :input-props="{ autocomplete: 'username' }"
          >
            <template #prefix><n-icon><Person /></n-icon></template>
          </n-input>
        </n-form-item>
        <n-form-item path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            placeholder="密码"
            size="large"
            :input-props="{ autocomplete: 'current-password' }"
            @keyup.enter="handleLogin"
          >
            <template #prefix><n-icon><LockClosed /></n-icon></template>
          </n-input>
        </n-form-item>

        <n-button
          type="primary"
          block
          size="large"
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </n-button>
      </n-form>

      <p class="auth-switch">
        还没有账号？
        <n-button text type="primary" @click="router.push('/register')">注册</n-button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { Person, LockClosed } from '@vicons/ionicons5';
import { userApi } from '../../api/user.js';
import { ipApi } from '../../api/ip.js';
import { useAuthStore } from '../../stores/authStore.js';

const form = ref({ username: '', password: '' });
const formRef = ref(null);
const loading = ref(false);
const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const fetchIpRegion = async () => {
  try {
    const res = await ipApi.getIpRegion();
    return { ip: res.data.ip, region: res.data.region };
  } catch {
    return { ip: '', region: '' };
  }
};

const handleLogin = async () => {
  try { await formRef.value?.validate(); } catch { return; }
  loading.value = true;
  try {
    const { ip, region } = await fetchIpRegion();
    const response = await userApi.login({ username: form.value.username, password: form.value.password, ip, region });
    authStore.setToken(response.data.token);
    await authStore.fetchUser();
    message.success('登录成功');
    router.push(route.query.redirect || '/');
  } catch (error) {
    message.error(error.response?.data?.message || '登录失败，请检查用户名和密码');
  } finally { loading.value = false; }
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
  animation: fadeIn .5s cubic-bezier(.22,.61,.36,1) both;
}

.auth-logo {
  width: 56px; height: 56px;
  border-radius: 50%;
  display: block;
  margin: 0 auto 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
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
</style>
