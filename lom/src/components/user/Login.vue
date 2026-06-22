<template>
  <div class="auth-container">
    <n-card :bordered="false" class="auth-card">
      <h3 class="auth-title">登录</h3>
      <n-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input type="password" v-model:value="form.password" placeholder="请输入密码" />
        </n-form-item>
        <n-button type="primary" block :loading="loading" @click="handleLogin">登录</n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '../../api/api.js';
import { useAuthStore } from '../../stores/authStore.js';

const form = ref({
  username: '',
  password: '',
});

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
    const res = await api.get('/get-ip');
    return { ip: res.data.ip, region: res.data.region };
  } catch {
    return { ip: '', region: '' };
  }
};

const handleLogin = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  loading.value = true;
  try {
    const { ip, region } = await fetchIpRegion();

    const response = await api.post('/user/login', {
      username: form.value.username,
      password: form.value.password,
      ip,
      region,
    });

    authStore.setToken(response.data.token);
    await authStore.fetchUser();
    message.success('登录成功');
    router.push(route.query.redirect || '/profile');
  } catch (error) {
    message.error(error.response?.data?.message || '登录失败，请检查用户名和密码');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #101014;
}

.auth-card {
  width: 400px;
  animation: fadeIn 0.5s ease-in-out;
}

.auth-title {
  color: #fff;
  text-align: center;
}
</style>
