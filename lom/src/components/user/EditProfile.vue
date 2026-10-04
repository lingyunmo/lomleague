<template>
  <section class="edit-profile-container" aria-labelledby="edit-profile-title">
    <header class="editor-heading">
      <div>
        <p class="eyebrow">YOUR LEAGUE / SETTINGS</p>
        <h1 id="edit-profile-title">编辑个人资料</h1>
        <p class="editor-description">更新你的联盟档案。头像上传完成后，再保存更改。</p>
      </div>
      <RouterLink to="/profile" class="back-link">返回个人主页 ↗</RouterLink>
    </header>
    <div v-if="!authStore.token" class="editor-state">
      <p>请先登录，再编辑个人资料。</p>
      <RouterLink to="/login" class="back-link">前往登录 ↗</RouterLink>
    </div>
    <div v-else-if="loading" class="editor-state" role="status" aria-live="polite">
      <n-spin size="large" />
      <p>正在读取个人资料…</p>
    </div>
    <div v-else-if="loadError" class="editor-state" role="alert">
      <p>用户信息暂时无法加载，请重试。</p>
      <n-button @click="fetchUserInfo">重试</n-button>
    </div>
    <div v-else-if="profileReady" class="editor-grid">
      <n-card :bordered="false" class="edit-profile-card">
        <h2 class="section-title">联盟档案</h2>
        <n-form :model="form" :rules="rules" ref="formRef" label-placement="top">
          <n-form-item label="头像" class="custom-upload-item">
            <n-upload
              :key="generation"
              :custom-request="customUpload"
              accept="image/*"
              :max="1"
              list-type="text"
              :disabled="busy"
              :default-file-list="avatarFileList"
              @finish="handleFinish"
              @remove="handleRemove"
            >
              <div class="avatar-picker">
                <n-avatar round :size="96" :src="avatarUrl || '/default-avatar.png'" class="profile-avatar" />
                <n-button :disabled="busy">更换头像</n-button>
              </div>
            </n-upload>
          </n-form-item>
          <p class="upload-hint" role="status" aria-live="polite">
            {{
              isUploading ? '头像正在上传，请稍候。' : 'JPG / PNG / GIF / WebP · 最大 10 MB。移除新头像仅调整当前草稿。'
            }}
          </p>

          <n-form-item label="用户名" path="username">
            <n-input
              v-model:value="form.username"
              placeholder="请输入用户名"
              :disabled="busy"
              :input-props="{ 'aria-label': '用户名', autocomplete: 'username' }"
            />
          </n-form-item>

          <n-form-item label="邮箱" path="email">
            <n-input
              v-model:value="form.email"
              placeholder="请输入邮箱"
              :disabled="busy"
              :input-props="{ 'aria-label': '邮箱', autocomplete: 'email' }"
            />
          </n-form-item>

          <n-form-item label="登录地区">
            <n-input
              v-model:value="form.lastLoginRegion.region"
              placeholder="自动获取地区信息"
              disabled
              :input-props="{ 'aria-label': '登录地区' }"
            />
          </n-form-item>

          <n-form-item class="submit-item">
            <n-button type="primary" @click="handleSubmit" block :disabled="busy || isUploading" :loading="saving">
              保存更改
            </n-button>
          </n-form-item>
        </n-form>
      </n-card>
      <n-card :bordered="false" class="edit-profile-card password-card">
        <h2 class="section-title">账号安全</h2>
        <p class="security-hint">输入当前密码后，设置至少 6 位的新密码。</p>
        <n-form :model="passwordForm" ref="pwdFormRef" label-placement="top">
          <n-form-item label="当前密码" path="oldPassword" :rules="[{ required: true, message: '请输入当前密码' }]">
            <n-input
              v-model:value="passwordForm.oldPassword"
              type="password"
              placeholder="输入当前密码"
              :disabled="busy"
              :input-props="{ 'aria-label': '当前密码', autocomplete: 'current-password' }"
            />
          </n-form-item>
          <n-form-item
            label="新密码"
            path="newPassword"
            :rules="[{ required: true, min: 6, message: '新密码至少6位' }]"
          >
            <n-input
              v-model:value="passwordForm.newPassword"
              type="password"
              placeholder="输入新密码（至少6位）"
              :disabled="busy"
              :input-props="{ 'aria-label': '新密码', autocomplete: 'new-password' }"
            />
          </n-form-item>
          <n-form-item
            label="确认密码"
            path="confirmPassword"
            :rules="[{ required: true, message: '请确认新密码', validator: (_, v) => v === passwordForm.newPassword }]"
          >
            <n-input
              v-model:value="passwordForm.confirmPassword"
              type="password"
              placeholder="再次输入新密码"
              :disabled="busy"
              :input-props="{ 'aria-label': '确认密码', autocomplete: 'new-password' }"
            />
          </n-form-item>
          <n-form-item class="submit-item">
            <n-button type="warning" block @click="handleChangePassword" :disabled="busy" :loading="changingPassword">
              修改密码
            </n-button>
          </n-form-item>
        </n-form>
      </n-card>
    </div>
  </section>
</template>

<script setup>
/**
 * EditProfile — 编辑个人资料
 * Issue #10: 接入 useFileUpload composable 消除重复上传逻辑
 */
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useMessage } from 'naive-ui';
import { userApi } from '../../api/user.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useFileUpload } from '../../composables/useFileUpload.js';

const authStore = useAuthStore();
const route = useRoute();
const loading = ref(false);
const loadError = ref(false);
const profileReady = ref(false);
const saving = ref(false);
const message = useMessage();
const formRef = ref(null);

const form = reactive({
  avatar: '',
  username: '',
  email: '',
  lastLoginRegion: { region: '', ip: '' },
});

// 头像上传（单文件）
const avatarUrl = ref('');
const avatarFileList = ref([]);
const { customUpload, handleFinish, handleRemove, isUploading } = useFileUpload(avatarUrl, avatarFileList, {
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
});

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const pwdFormRef = ref(null);
const changingPassword = ref(false);
const busy = computed(() => saving.value || changingPassword.value);
const generation = ref(0);
let disposed = false;
const context = () => ({ token: authStore.token, generation: generation.value });
const isCurrent = (request) =>
  !disposed &&
  route.name === 'EditProfile' &&
  !!request.token &&
  request.token === authStore.token &&
  request.generation === generation.value;
const resetPassword = () => Object.assign(passwordForm, { oldPassword: '', newPassword: '', confirmPassword: '' });
const resetDraft = () => {
  profileReady.value = false;
  loading.value = false;
  loadError.value = false;
  saving.value = false;
  changingPassword.value = false;
  Object.assign(form, { avatar: '', username: '', email: '', lastLoginRegion: { region: '', ip: '' } });
  avatarUrl.value = '';
  avatarFileList.value = [];
  resetPassword();
};

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
  if (loading.value || disposed || !authStore.token || route.name !== 'EditProfile') return;
  const request = context();
  loading.value = true;
  loadError.value = false;
  try {
    const data = await authStore.fetchUser();
    if (!isCurrent(request)) return;
    if (!data) throw new Error('profile unavailable');
    Object.assign(form, {
      avatar: data.avatar || '',
      username: data.username || '',
      email: data.email || '',
      lastLoginRegion: { region: data.lastLoginRegion?.region || '', ip: data.lastLoginRegion?.ip || '' },
    });
    avatarUrl.value = form.avatar;
    profileReady.value = true;
  } catch {
    if (isCurrent(request)) loadError.value = true;
  } finally {
    if (isCurrent(request)) loading.value = false;
  }
};

const handleSubmit = async () => {
  if (busy.value || isUploading.value || !profileReady.value || !formRef.value) return;
  const request = context();
  if (!isCurrent(request)) return;
  saving.value = true;
  let validated = false;
  try {
    await formRef.value.validate();
    validated = true;
    if (!isCurrent(request) || isUploading.value) return;
    const payload = { avatar: avatarUrl.value, username: form.username, email: form.email };
    const memberId = authStore.user?.id;
    await userApi.updateProfile(payload);
    if (!isCurrent(request) || authStore.user?.id !== memberId) return;
    form.avatar = payload.avatar;
    authStore.setUser({ ...authStore.user, ...payload });
    message.success('资料更新成功');
  } catch {
    if (isCurrent(request)) message.error(validated ? '更新失败，请稍后重试' : '请修正表单中的错误');
  } finally {
    if (isCurrent(request)) saving.value = false;
  }
};

const handleChangePassword = async () => {
  if (busy.value || !profileReady.value || !pwdFormRef.value) return;
  const request = context();
  if (!isCurrent(request)) return;
  changingPassword.value = true;
  let validated = false;
  try {
    await pwdFormRef.value.validate();
    validated = true;
    if (!isCurrent(request)) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    const { oldPassword, newPassword } = passwordForm;
    await userApi.changePassword(oldPassword, newPassword);
    if (!isCurrent(request)) return;
    message.success('密码修改成功');
    resetPassword();
  } catch (error) {
    if (isCurrent(request))
      message.error(validated ? error.response?.data?.message || '密码修改失败' : '请修正表单中的错误');
  } finally {
    if (isCurrent(request)) changingPassword.value = false;
  }
};

watch(
  [() => authStore.token, () => route.name],
  () => {
    generation.value++;
    resetDraft();
    if (authStore.token && route.name === 'EditProfile') void fetchUserInfo();
  },
  { immediate: true, flush: 'sync' },
);
onBeforeUnmount(() => {
  disposed = true;
  generation.value++;
  resetDraft();
});
</script>

<style scoped>
.edit-profile-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px 32px 64px;
  color: var(--color-text-primary);
}
.editor-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 32px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--portal-accent);
}
h1 {
  margin: 8px 0 12px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.2;
}
.editor-description,
.security-hint,
.upload-hint {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}
.back-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  flex-shrink: 0;
  color: var(--color-text-primary);
}
.back-link:focus-visible {
  outline: 2px solid var(--portal-accent);
  outline-offset: 4px;
}
.editor-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 24px;
  align-items: start;
}
.editor-state {
  padding: 40px 24px;
  text-align: center;
  border: 1px solid var(--glass-border);
  border-radius: 16px;
}
.editor-state :deep(button) {
  min-height: 44px;
}
.section-title {
  margin: 0 0 24px;
  font-size: 22px;
}
.avatar-picker {
  display: flex;
  align-items: center;
  gap: 20px;
}
.upload-hint {
  margin: -10px 0 24px;
}
.security-hint {
  margin: -12px 0 24px;
}
.edit-profile-card :deep(.n-input) {
  min-height: 44px;
}
.edit-profile-card :deep(.n-input__input),
.edit-profile-card :deep(.n-input__input-el) {
  min-height: 44px;
}
.edit-profile-card :deep(button) {
  min-height: 44px;
}
.edit-profile-card :deep(.n-card__content) {
  padding: 24px;
}
.edit-profile-card :deep(.n-upload-file-info__name) {
  overflow-wrap: anywhere;
}
.submit-item {
  margin-top: 16px;
}
@media (max-width: 720px) {
  .edit-profile-container {
    padding: 24px 16px 48px;
  }
  .editor-heading {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 24px;
  }
  .editor-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .edit-profile-card :deep(.n-card__content) {
    padding: 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .edit-profile-container :deep(*) {
    transition: none !important;
    animation: none !important;
  }
}

.edit-profile-card {
  min-width: 0;
  width: 100%;
  background: var(--glass-bg);
  border-radius: var(--glass-radius);
  box-shadow: var(--shadow-deep);
  backdrop-filter: var(--glass-blur);
}

.custom-upload-item {
  margin-bottom: 24px;
}

.profile-avatar {
  border: 3px solid var(--color-brand-primary);
  box-shadow: var(--shadow-avatar);
}

:deep(.n-form-item-label) {
  color: var(--color-text-label) !important;
  font-size: 14px;
}
</style>
