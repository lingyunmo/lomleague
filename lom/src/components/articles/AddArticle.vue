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
import { ref, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import api from '../../api/api.js';
import { useAuthStore } from '../../stores/authStore.js';

const emit = defineEmits(['created', 'cancel']);
const message = useMessage();
const authStore = useAuthStore();

const formData = ref({
  title: '',
  region: '',
  content: '',
  attachments: [],
});

const defaultFileList = ref([]);
const submitting = ref(false);
const formRef = ref(null);

// 校验规则
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

// 支持的文件类型
const allowedTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav',
  'video/mp4', 'video/x-msvideo',
  'application/zip', 'application/x-rar-compressed'
];

// 最大文件大小 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 判断附件是否上传完成
const isReadyToSubmit = computed(() => {
  return formData.value.attachments.length === defaultFileList.value.length;
});

// 自定义上传逻辑
const customUpload = async ({ file, onFinish, onError }) => {
  try {
    if (!allowedTypes.includes(file.file.type)) {
      message.error('不支持的文件类型！');
      return onError();
    }

    if (file.file.size > MAX_FILE_SIZE) {
      message.error('文件大小不能超过 10MB！');
      return onError();
    }

    const form = new FormData();
    form.append('file', file.file);

    const response = await api.post('/file/upload', form);

    if (response.data?.url) {
      formData.value.attachments.push(response.data.url);
      defaultFileList.value.push({
        uid: file.uid,
        name: file.file.name,
        url: response.data.url,
        status: 'finished',
      });
      message.success('附件上传成功');
      onFinish();
    } else {
      throw new Error('上传失败');
    }
  } catch (error) {
    message.error('附件上传失败');
    onError();
  }
};

// 移除附件
const handleRemove = (file) => {
  formData.value.attachments = formData.value.attachments.filter((url) => url !== file.url);
  defaultFileList.value = defaultFileList.value.filter((item) => item.url !== file.url);
  message.info('附件已移除');
};

// 提交表单
const handleSubmit = async () => {
  try {
    submitting.value = true;
    await formRef.value?.validate();

    await api.post('/articles', {
      title: formData.value.title,
      content: formData.value.content,
      region: formData.value.region,
      attachments: formData.value.attachments,
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

// 重置表单
const resetForm = () => {
  formData.value = {
    title: '',
    content: '',
    region: formData.value.region,
    attachments: [],
  };
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
