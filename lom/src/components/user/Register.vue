<template>
  <div class="auth-container">
    <n-card :bordered="false" class="auth-card">
      <h3 class="auth-title">注册</h3>
      <n-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <n-form-item label="头像" class="register-avatar-item">
          <n-upload :custom-request="customUpload" accept="image/*" :max="1" list-type="text">
            <n-avatar round :size="64" :src="avatar || '/default-avatar.png'" class="register-avatar" />
          </n-upload>
        </n-form-item>
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="请输入用户名"/>
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input type="password" v-model:value="form.password" placeholder="请输入密码"/>
        </n-form-item>
        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="form.email" placeholder="请输入邮箱"/>
        </n-form-item>
        <n-button type="primary" block :loading="loading" @click="handleRegister">注册</n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '../../api/api.js';

const form = ref({
  username: '',
  password: '',
  email: '',
});

const avatar = ref('');

const formRef = ref(null);
const loading = ref(false);
const router = useRouter();
const message = useMessage();

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
  ],
};

const handleRegister = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  loading.value = true;
  try {
    await api.post('/user/register', { ...form.value, avatar: avatar.value });
    message.success('注册成功');
    router.push('/login');
  } catch (error) {
    message.error(error.response?.data?.message || '注册失败，用户名可能已存在');
  } finally {
    loading.value = false;
  }
};

const customUpload = async ({ file, onFinish, onError }) => {
  try {
    const formData = new FormData();
    formData.append('file', file.file);
    const response = await api.post('/file/upload', formData);
    if (response.data?.url) {
      avatar.value = response.data.url;
      message.success('头像上传成功');
      onFinish();
    } else {
      throw new Error('上传失败');
    }
  } catch {
    message.error('头像上传失败');
    onError();
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
