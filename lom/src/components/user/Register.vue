<template>
  <div class="auth-page">
    <div class="auth-card">
      <img src="/logo.jpg" alt="lom" class="auth-logo" />
      <h2 class="auth-title">加入 lom 联盟</h2>
      <p class="auth-sub">创建你的账号</p>

      <n-form ref="formRef" :model="form" :rules="rules" class="auth-form">
        <n-form-item class="avatar-item">
          <div class="avatar-upload">
            <img :src="avatar || '/default-avatar.png'" class="avatar-preview" />
            <n-upload :custom-request="customUpload" accept="image/*" :max="1" :show-file-list="false">
              <n-button text type="primary" size="small">上传头像</n-button>
            </n-upload>
          </div>
        </n-form-item>
        <n-form-item path="username">
          <n-input v-model:value="form.username" placeholder="用户名" size="large">
            <template #prefix><n-icon><Person /></n-icon></template>
          </n-input>
        </n-form-item>
        <n-form-item path="email">
          <n-input v-model:value="form.email" placeholder="邮箱" size="large">
            <template #prefix><n-icon><Mail /></n-icon></template>
          </n-input>
        </n-form-item>
        <n-form-item path="password">
          <n-input v-model:value="form.password" type="password" placeholder="密码" size="large">
            <template #prefix><n-icon><LockClosed /></n-icon></template>
          </n-input>
        </n-form-item>

        <n-button type="primary" block size="large" :loading="loading" @click="handleRegister">
          注册
        </n-button>
      </n-form>

      <p class="auth-switch">
        已有账号？
        <n-button text type="primary" @click="router.push('/login')">登录</n-button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { Person, LockClosed, Mail } from '@vicons/ionicons5';
import { userApi } from '../../api/user.js';
import { useFileUpload } from '../../composables/useFileUpload.js';

const form = ref({ username: '', password: '', email: '' });
const avatar = ref('');
const avatarFileList = ref([]);
const { customUpload } = useFileUpload(avatar, avatarFileList, {
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
});
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
  try { await formRef.value?.validate(); } catch { return; }
  loading.value = true;
  try {
    await userApi.register({ ...form.value, avatar: avatar.value });
    message.success('注册成功');
    router.push('/login');
  } catch (error) {
    message.error(error.response?.data?.message || '注册失败');
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

.avatar-item { display: flex; justify-content: center; }
.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.avatar-preview {
  width: 64px; height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--glass-border);
}

.auth-switch {
  text-align: center;
  margin: 24px 0 0;
  font-size: 14px;
  color: var(--color-text-muted);
}
</style>
