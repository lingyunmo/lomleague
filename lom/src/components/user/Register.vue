<template>
  <div class="auth-page">
    <div class="auth-card">
      <img src="/logo.jpg" alt="lom" class="auth-logo" />
      <h2 class="auth-title">注册网站账号</h2>
      <p class="auth-sub">用于登录、发帖与签到，不代表正式入盟。</p>

      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :disabled="loading"
        class="auth-form"
        @submit.prevent="handleRegister"
      >
        <n-form-item class="avatar-item">
          <div class="avatar-upload">
            <img :src="avatar || '/default-avatar.png'" class="avatar-preview" alt="当前头像" />
            <n-upload
              v-if="authStore.token"
              :key="route.fullPath"
              :custom-request="customUpload"
              :default-file-list="avatarFileList"
              :disabled="loading"
              accept="image/*"
              :max="1"
              @finish="handleFinish"
              @remove="handleRemove"
            >
              <n-button text type="primary" size="small">上传头像</n-button>
            </n-upload>
            <p v-if="!authStore.token" class="upload-status">头像可在注册并登录后设置。</p>
            <p v-if="isUploading" class="upload-status" role="status" aria-live="polite">头像上传中，请稍候…</p>
          </div>
        </n-form-item>
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
        <n-form-item path="email">
          <n-input
            v-model:value="form.email"
            placeholder="邮箱"
            size="large"
            :disabled="loading"
            :input-props="{ autocomplete: 'email', 'aria-label': '邮箱' }"
          >
            <template #prefix
              ><n-icon><Mail /></n-icon
            ></template>
          </n-input>
        </n-form-item>
        <n-form-item path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            placeholder="密码"
            size="large"
            :disabled="loading"
            :input-props="{ autocomplete: 'new-password', 'aria-label': '密码' }"
            @keyup.enter="handleRegister"
          >
            <template #prefix
              ><n-icon><LockClosed /></n-icon
            ></template>
          </n-input>
        </n-form-item>

        <n-button type="primary" block size="large" :loading="loading" :disabled="isUploading" @click="handleRegister">
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
import { ref, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { Person, LockClosed, Mail } from '@vicons/ionicons5';
import { userApi } from '../../api/user.js';
import { useFileUpload } from '../../composables/useFileUpload.js';
import { useAuthStore } from '../../stores/authStore.js';

const form = ref({ username: '', password: '', email: '' });
const avatar = ref('');
const avatarFileList = ref([]);
const route = useRoute();
const { customUpload, handleFinish, handleRemove, isUploading } = useFileUpload(avatar, avatarFileList, {
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  context: () => route.fullPath,
});
const formRef = ref(null);
const loading = ref(false);
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
let generation = 0,
  operation,
  disposed = false;
const resetPrivateState = () => {
  generation++;
  operation = undefined;
  loading.value = false;
  form.value = { username: '', password: '', email: '' };
  avatar.value = '';
  avatarFileList.value = [];
};
watch([() => authStore.token, () => route.fullPath], resetPrivateState, { flush: 'sync' });
onBeforeUnmount(() => {
  disposed = true;
  resetPrivateState();
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
  ],
};

const handleRegister = async () => {
  if (disposed || loading.value || isUploading.value || route.name !== 'Register' || !formRef.value) return;
  const payload = { ...form.value };
  const request = { token: authStore.token, generation, path: route.fullPath };
  operation = request;
  const isCurrent = () =>
    !disposed &&
    operation === request &&
    request.generation === generation &&
    request.token === authStore.token &&
    request.path === route.fullPath &&
    route.name === 'Register';
  loading.value = true;
  let validated = false,
    created = false;
  try {
    await formRef.value.validate();
    validated = true;
    if (!isCurrent()) return;
    if (isUploading.value) {
      message.warning('请等待头像上传完成后再注册');
      return;
    }
    if (Object.keys(payload).some((key) => payload[key] !== form.value[key])) {
      message.warning('输入已更改，请重新提交');
      return;
    }
    await userApi.register({ ...payload, avatar: avatar.value });
    if (!isCurrent()) return;
    created = true;
    form.value.password = '';
    message.success('注册成功');
    await router.push('/login');
  } catch (error) {
    if (isCurrent())
      message.error(
        created
          ? '账号已创建，但页面跳转失败，请前往登录页'
          : validated
            ? error.response?.data?.message || '注册失败，请稍后重试'
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

.avatar-item {
  display: flex;
  justify-content: center;
}
.avatar-upload {
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.avatar-preview {
  width: 64px;
  height: 64px;
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
.upload-status {
  margin: 0;
  font-size: 12px;
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
