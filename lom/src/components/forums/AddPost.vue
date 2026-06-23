<template>
  <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left">
    <n-form-item label="内容" path="content" required>
      <v-md-editor
          v-model="formData.content"
          placeholder="输入回复内容（支持 Markdown 语法）..."
          height="300px"
      />
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
          @remove="handleRemove"
      >
        <n-button>点击上传</n-button>
      </n-upload>
    </n-form-item>

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
/**
 * AddPost — 创建论坛回复表单
 * Issue #10: 接入 useFileUpload composable 消除重复上传逻辑
 */
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { forumApi } from '../../api/forum.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useFileUpload } from '../../composables/useFileUpload.js';

const props = defineProps({
  postId: { type: Number, required: true },
});

const emit = defineEmits(['created', 'cancel']);
const message = useMessage();
const authStore = useAuthStore();

const formData = ref({
  content: '',
  region: '',
});

const attachments = ref([]);
const submitting = ref(false);
const defaultFileList = ref([]);
const formRef = ref(null);

const { customUpload, handleRemove, isReadyToSubmit } = useFileUpload(attachments, defaultFileList);

const rules = {
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

    await forumApi.createReply({
      postId: props.postId,
      content: formData.value.content,
      attachments: attachments.value,
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
</style>
