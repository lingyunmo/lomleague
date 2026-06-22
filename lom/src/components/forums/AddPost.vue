<template>
  <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left">

    <!-- Markdown 编辑器 -->
    <n-form-item label="内容" path="content" required>
      <v-md-editor
          v-model="formData.content"
          placeholder="输入回复内容（支持 Markdown 语法）..."
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
        <n-button>点击上传</n-button>
      </n-upload>
    </n-form-item>

    <!-- 操作按钮 -->
    <n-form-item>
      <n-space justify="end" :size="12">
        <n-button @click="emit('cancel')">取消</n-button>
        <n-button
            type="primary"
            @click="handleSubmit"
            :disabled="!isReadyToSubmit"
            :loading="submitting"
        >
          提交
        </n-button>
      </n-space>
    </n-form-item>

  </n-form>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue';
import {useMessage} from 'naive-ui';
import api from "../../api/api.js";
import { useAuthStore } from '../../stores/authStore.js';

const props = defineProps({
  postId: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['created', 'cancel']);
const message = useMessage();
const authStore = useAuthStore();

const formData = ref({
  content: '',
  attachments: [],
  region: '',
});

const submitting = ref(false);
const defaultFileList = ref([]);
const formRef = ref(null);

const rules = {
  content: [
    {
      required: true,
      message: '内容不能为空',
      validator: (_, value) => !!value.trim(),
      trigger: ['blur', 'input']
    }
  ]
};

const isReadyToSubmit = computed(() => {
  return formData.value.attachments.length === defaultFileList.value.length;
});

// 自定义上传逻辑
const customUpload = async ({file, onFinish, onError}) => {
  try {
    const form = new FormData();
    form.append('file', file.file);

    const response = await api.post('/file/upload', form);

    if (response.data?.url) {
      // 更新附件列表
      formData.value.attachments.push(response.data.url);

      // 更新默认文件列表，确保正确显示文件名
      defaultFileList.value.push({
        uid: file.uid,
        name: response.data.filename,
        url: response.data.url,
        status: 'finished',
      });

      message.success('附件上传成功');
      onFinish();
    } else {
      throw new Error('上传失败');
    }
  } catch (error) {
    message.error(`上传失败: ${error.message}`);
    onError();
  }
};

// 移除附件
const handleRemove = ({file}) => {
  formData.value.attachments = formData.value.attachments.filter(
      item => item.url !== file.url
  );
  defaultFileList.value = defaultFileList.value.filter(
      item => item.uid !== file.uid
  );

  message.info('附件已移除');
};

// 提交表单
const handleSubmit = async () => {
  try {
    submitting.value = true;
    await formRef.value?.validate();

    await api.post('/forum/replies', {
      postId: props.postId,
      content: formData.value.content,
      attachments: formData.value.attachments,
      region: formData.value.region,
    });

    message.success('回帖成功');
    emit('created');
  } catch (error) {
    message.error(error.response?.data?.message || '提交失败');
  } finally {
    submitting.value = false;
  }
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
/* 根据需求添加样式 */
</style>
