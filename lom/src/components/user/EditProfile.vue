<template>
  <div class="edit-profile-container" v-if="!loading">
    <n-card :bordered="false" class="edit-profile-card" hoverable>
      <h2 class="title">编辑个人资料</h2>

      <n-form :model="form" :rules="rules" ref="formRef" label-placement="left" label-width="100">
        <n-form-item label="头像" class="custom-upload-item">
          <n-upload :custom-request="customUpload" accept="image/*" :max="1" list-type="text">
            <n-avatar
                round
                :size="128"
                :src="form.avatar || '/default-avatar.png'"
                class="profile-avatar"
            />
          </n-upload>
        </n-form-item>

        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="请输入用户名" class="custom-input" />
        </n-form-item>

        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="form.email" placeholder="请输入邮箱" class="custom-input" />
        </n-form-item>

        <n-form-item label="登录地区">
          <n-input v-model:value="form.lastLoginRegion.region" placeholder="自动获取地区信息" disabled class="custom-input" />
        </n-form-item>

        <n-form-item class="submit-item">
          <n-button type="primary" @click="handleSubmit" block class="submit-btn">保存更改</n-button>
        </n-form-item>
      </n-form>

      <n-divider>修改密码</n-divider>

      <n-form :model="passwordForm" ref="pwdFormRef" label-placement="left" label-width="100">
        <n-form-item label="当前密码" path="oldPassword" :rules="[{ required: true, message: '请输入当前密码' }]">
          <n-input v-model:value="passwordForm.oldPassword" type="password" placeholder="输入当前密码" class="custom-input" />
        </n-form-item>
        <n-form-item label="新密码" path="newPassword" :rules="[{ required: true, min: 6, message: '新密码至少6位' }]">
          <n-input v-model:value="passwordForm.newPassword" type="password" placeholder="输入新密码（至少6位）" class="custom-input" />
        </n-form-item>
        <n-form-item label="确认密码" path="confirmPassword" :rules="[{ required: true, message: '请确认新密码', validator: (_, v) => v === passwordForm.newPassword }]">
          <n-input v-model:value="passwordForm.confirmPassword" type="password" placeholder="再次输入新密码" class="custom-input" />
        </n-form-item>
        <n-form-item class="submit-item">
          <n-button type="warning" block @click="handleChangePassword" :loading="changingPassword">修改密码</n-button>
        </n-form-item>
      </n-form>
    </n-card>
  </div>

  <div v-else class="loading-container">
    <n-spin size="large" />
  </div>
</template>

<script setup>
/**
 * EditProfile — 编辑个人资料
 * Issue #10: 接入 useFileUpload composable 消除重复上传逻辑
 */
import { ref, reactive, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { userApi } from '../../api/user.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useFileUpload } from '../../composables/useFileUpload.js';

const authStore = useAuthStore();
const loading = ref(true);
const message = useMessage();
const formRef = ref(null);

const form = reactive({
  avatar: '',
  username: '',
  email: '',
  lastLoginRegion: { region: '', ip: '' },
});

// 头像上传（单文件）
const avatarUrl = ref(form.avatar);
const avatarFileList = ref([]);
const { customUpload } = useFileUpload(avatarUrl, avatarFileList, {
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
});

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const pwdFormRef = ref(null);
const changingPassword = ref(false);

const rules = {
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应在3-20个字符之间', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] },
  ],
};

const fetchUserInfo = async () => {
  try {
    const data = await authStore.fetchUser();
    if (data) {
      Object.assign(form, {
        avatar: data.avatar || '',
        username: data.username || '',
        email: data.email || '',
        lastLoginRegion: data.lastLoginRegion || { region: '', ip: '' },
      });
      avatarUrl.value = form.avatar;
    }
  } catch {
    message.error('获取用户信息失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = () => {
  formRef.value.validate(async (errors) => {
    if (!errors) {
      try {
        await userApi.updateProfile({
          avatar: avatarUrl.value || form.avatar,
          username: form.username,
          email: form.email,
        });
        form.avatar = avatarUrl.value;
        message.success('资料更新成功');
      } catch (error) {
        message.error('更新失败，请稍后重试');
      }
    } else {
      message.error('请修正表单中的错误');
    }
  });
};

const handleChangePassword = () => {
  pwdFormRef.value.validate(async (errors) => {
    if (!errors) {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        message.error('两次输入的密码不一致');
        return;
      }
      changingPassword.value = true;
      try {
        await userApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
        message.success('密码修改成功');
        Object.assign(passwordForm, { oldPassword: '', newPassword: '', confirmPassword: '' });
      } catch (error) {
        message.error(error.response?.data?.message || '密码修改失败');
      } finally {
        changingPassword.value = false;
      }
    }
  });
};

onMounted(() => {
  fetchUserInfo();
});
</script>

<style scoped>
.edit-profile-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, var(--color-bg-gradient-start), var(--color-bg-gradient-end)) fixed;
  animation: fadeIn 1s ease-in-out;
}

.edit-profile-card {
  width: 480px;
  background: var(--glass-bg);
  border-radius: var(--glass-radius);
  padding: 32px;
  box-shadow: var(--shadow-deep);
  backdrop-filter: var(--glass-blur);
}

.title {
  color: var(--color-brand-primary);
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 24px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.custom-upload-item {
  margin-bottom: 24px;
}

.custom-upload-item :deep(.n-upload) {
  display: flex;
  justify-content: center;
}

.profile-avatar {
  border: 3px solid var(--color-brand-primary);
  box-shadow: var(--shadow-avatar);
  transition: transform 0.2s ease;
}

.profile-avatar:hover {
  transform: scale(1.05);
}

.custom-input {
  background: var(--glass-bg-inner);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  transition: var(--transition-smooth);
}

.custom-input:hover,
.custom-input:focus {
  border-color: var(--color-brand-primary);
}

.custom-input:focus {
  box-shadow: var(--shadow-glow-brand);
}

:deep(.n-form-item-label) {
  color: var(--color-text-label) !important;
  font-size: 14px;
}

.submit-item {
  margin-top: 24px;
}

.submit-btn {
  height: 42px;
  font-size: 16px;
  border-radius: 8px;
  background-color: var(--color-brand-primary);
  transition: var(--transition-smooth);
}

.submit-btn:hover {
  background-color: var(--color-brand-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(78, 204, 163, 0.3);
}
</style>
