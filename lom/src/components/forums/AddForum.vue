<template>
  <n-form :model="form" ref="formRef" label-placement="top">

    <!-- 帖子标题 -->
    <n-form-item label="标题" path="title" required>
      <n-input v-model:value="form.title" placeholder="请输入帖子标题" />
    </n-form-item>

    <!-- 地区信息（只读） -->
    <n-form-item label="地区">
      <n-input :value="form.region" disabled />
    </n-form-item>

    <!-- Markdown 编辑器 -->
    <n-form-item label="内容" path="content" required>
      <v-md-editor
          v-model="form.content"
          placeholder="输入帖子内容（支持 Markdown 语法）..."
          height="300px"
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

    <!-- 表单操作按钮 -->
    <n-space justify="end" :size="12">
      <n-button
          type="primary"
          @click="handleSubmit"
          :disabled="!isReadyToSubmit">
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

const form = ref({
  title: '',
  content: '',
  attachments: [],
  region: '',
});

const defaultFileList = ref([]);

const isReadyToSubmit = computed(() => {
  return form.value.attachments.length === defaultFileList.value.length;
});

const fetchUserRegion = async () => {
  const data = await authStore.fetchUser();
  if (data) {
    form.value.region = data.lastLoginRegion?.region || '未知';
  }
};

onMounted(() => {
  fetchUserRegion();
});

// 自定义附件上传逻辑
const customUpload = async ({ file, onFinish, onError }) => {
  try {
    const formData = new FormData() ;
    formData.append('file', file.file);

    const response = await api.post('/file/upload', formData);

    if (response.data?.url) {
      form.value.attachments.push(response.data.url);
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
  form.value.attachments = form.value.attachments.filter(url => url !== file.url);
  defaultFileList.value = defaultFileList.value.filter(item => item.url !== file.url);
  message.info('附件已移除');
};

// 提交表单
const handleSubmit = async () => {
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

  try {
    await api.post('/forum/posts', {
      title: form.value.title,
      content: form.value.content,
      attachments: form.value.attachments,
      region: form.value.region,
    });
    message.success('帖子创建成功！');
    emit('created');
  } catch (error) {
    message.error('创建帖子失败，请稍后重试。');
  }
};
</script>

<style scoped>
/* 根据需求添加样式 */
</style>