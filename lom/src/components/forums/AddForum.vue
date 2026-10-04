<template>
  <n-form :model="form" ref="formRef" label-placement="top">
    <n-form-item label="标题" path="title" required>
      <n-input v-model:value="form.title" placeholder="请输入帖子标题" />
    </n-form-item>

    <n-form-item label="地区">
      <n-input :value="form.region" disabled />
    </n-form-item>

    <n-form-item label="内容" path="content" required>
      <v-md-editor v-model="form.content" placeholder="输入帖子内容（支持 Markdown 语法）..." height="300px" />
    </n-form-item>

    <n-form-item label="附件（可选）">
      <n-upload
        :custom-request="customUpload"
        accept="image/*,video/*,audio/*,.pdf,.zip"
        list-type="text"
        :show-upload-list="true"
        multiple
        :max="5"
        :default-file-list="defaultFileList"
        @finish="handleFinish"
        @remove="handleRemove"
      >
        <n-button>上传附件</n-button>
      </n-upload>
    </n-form-item>

    <n-space justify="end" :size="12">
      <n-button type="primary" @click="handleSubmit" :disabled="!isReadyToSubmit || submitting" :loading="submitting"
        >提交</n-button
      >
      <n-button @click="cancel">取消</n-button>
    </n-space>
  </n-form>
</template>

<script setup>
/**
 * AddForum — 创建论坛帖子表单
 * Issue #10: 接入 useFileUpload composable 消除重复上传逻辑
 */
import { ref, watch, onBeforeUnmount, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { forumApi } from '../../api/forum.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useFileUpload } from '../../composables/useFileUpload.js';

const emit = defineEmits(['created', 'cancel']);
const message = useMessage();
const authStore = useAuthStore();

const form = ref({
  title: '',
  content: '',
  region: '',
});

const attachments = ref([]);
const defaultFileList = ref([]);
const submitting = ref(false);
let generation = 0;
let disposed = false;
const context = () => ({ token: authStore.token, generation });
const isCurrent = (request) => !disposed && request.token === authStore.token && request.generation === generation;
watch(
  () => authStore.token,
  () => {
    generation++;
    submitting.value = false;
    form.value.region = '';
  },
  { flush: 'sync' },
);
onBeforeUnmount(() => {
  disposed = true;
  generation++;
});
const cancel = () => {
  generation++;
  emit('cancel');
};

const { customUpload, handleFinish, handleRemove, isReadyToSubmit } = useFileUpload(attachments, defaultFileList);

const fetchUserRegion = async () => {
  const request = context();
  const data = await authStore.fetchUser();
  if (data && isCurrent(request)) {
    form.value.region = data.lastLoginRegion?.region || '未知';
  }
};

onMounted(() => {
  fetchUserRegion();
});

const handleSubmit = async () => {
  if (submitting.value) return;
  if (!form.value.title.trim()) {
    message.error('标题不能为空！');
    return;
  }
  if (!form.value.content.trim()) {
    message.error('内容不能为空！');
    return;
  }
  if (!isReadyToSubmit.value) {
    message.error('请等待附件上传完成！');
    return;
  }
  const request = context();
  const payload = {
    title: form.value.title,
    content: form.value.content,
    attachments: [...attachments.value],
    region: form.value.region,
  };
  submitting.value = true;
  try {
    await forumApi.createPost(payload);
    if (!isCurrent(request)) return;
    message.success('帖子创建成功！');
    emit('created');
  } catch {
    if (!isCurrent(request)) return;
    message.error('创建帖子失败，请稍后重试。');
  } finally {
    if (isCurrent(request)) submitting.value = false;
  }
};
</script>

<style scoped></style>
