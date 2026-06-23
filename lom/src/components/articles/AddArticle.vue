<template>
  <n-form ref="formRef" :model="formData" :rules="rules" label-placement="top">
    <!-- 文章标题 -->
    <n-form-item label="标题" path="title" required>
      <n-input v-model:value="formData.title" placeholder="请输入文章标题" />
    </n-form-item>

    <!-- 地区信息 -->
    <n-form-item label="地区">
      <n-input :value="formData.region" disabled />
    </n-form-item>

    <!-- Markdown 编辑器 -->
    <n-form-item label="内容" path="content" required>
      <v-md-editor
          v-model="formData.content"
          placeholder="输入文章内容（支持 Markdown 语法）..."
      />
    </n-form-item>

    <!-- 附件上传 -->
    <n-form-item label="附件（可选）">
      <n-upload
          :custom-request="customUpload"
          accept="image/*,video/*,audio/*,.pdf,.zip"
          list-type="text"
          :show-upload-list="true"
          multiple
          :max="5"
          :default-file-list="defaultFileList"
          @remove="handleRemove"
      >
        <n-button>上传附件</n-button>
      </n-upload>
    </n-form-item>

    <!-- 操作按钮 -->
    <n-space justify="end" :size="12">
      <n-button type="primary" @click="handleSubmit" :disabled="!isReadyToSubmit" :loading="submitting">
        提交
      </n-button>
      <n-button @click="$emit('cancel')">取消</n-button>
    </n-space>
  </n-form>
</template>

<script setup>
/**
 * AddArticle — 创建文章表单
 * Issue #10: 接入 useFileUpload composable 消除重复上传逻辑
 */
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { articleApi } from '../../api/article.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useFileUpload } from '../../composables/useFileUpload.js';

const emit = defineEmits(['created', 'cancel']);
const message = useMessage();
const authStore = useAuthStore();

const formData = ref({
  title: '',
  region: '',
  content: '',
});

const attachments = ref([]);
const defaultFileList = ref([]);
const submitting = ref(false);
const formRef = ref(null);

const { customUpload, handleRemove, isReadyToSubmit } = useFileUpload(attachments, defaultFileList);

const rules = {
  title: [{ required: true, message: '标题不能为空', trigger: 'blur' }],
  content: [
    {
      required: true,
      message: '内容不能为空',
      validator: (_, value) => !!value.trim(),
      trigger: ['blur', 'input'],
    },
  ],
};

const handleSubmit = async () => {
  try {
    submitting.value = true;
    await formRef.value?.validate();

    await articleApi.createArticle({
      title: formData.value.title,
      content: formData.value.content,
      region: formData.value.region,
      attachments: attachments.value,
    });

    message.success('文章创建成功！');
    emit('created');
    resetForm();
  } catch (error) {
    message.error('创建文章失败，请稍后重试。');
  } finally {
    submitting.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    title: '',
    content: '',
    region: formData.value.region,
  };
  attachments.value = [];
  defaultFileList.value = [];
};

const fetchUserRegion = async () => {
  const data = await authStore.fetchUser();
  if (data) {
    formData.value.region = data.lastLoginRegion?.region || '未知';
  }
};

onMounted(() => {
  fetchUserRegion();
});
</script>

<style scoped>
/* 可根据需要添加样式 */
</style>
