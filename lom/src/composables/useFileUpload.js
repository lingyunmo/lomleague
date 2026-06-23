/**
 * useFileUpload — 统一文件上传 composable
 * 解决：customUpload 逻辑在 AddArticle / AddForum / AddPost / Register / EditProfile 中重复 5 次
 *
 * attachmentsRef 支持两种模式：
 *   - 数组模式（多文件附件）：Ref<string[]>，上传追加，移除过滤
 *   - 字符串模式（单文件头像）：Ref<string>，上传替换，移除清空
 *
 * @param {import('vue').Ref} attachmentsRef — 附件 URL（数组或字符串）
 * @param {import('vue').Ref} fileListRef    — Naive UI upload 的 default-file-list ref
 * @param {Object}   [constraints]           — 可选的文件限制
 * @param {string[]} [constraints.allowedTypes] — 允许的 MIME 类型
 * @param {number}   [constraints.maxSize]      — 最大文件字节数
 * @returns {{ customUpload, handleRemove, isReadyToSubmit }}
 */
import { computed } from 'vue';
import { useMessage } from 'naive-ui';
import { fileApi } from '../api/file.js';

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav',
  'video/mp4', 'video/x-msvideo',
  'application/zip', 'application/x-rar-compressed',
];
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function useFileUpload(attachmentsRef, fileListRef, constraints = {}) {
  const message = useMessage();
  const allowedTypes = constraints.allowedTypes || DEFAULT_ALLOWED_TYPES;
  const maxSize = constraints.maxSize || DEFAULT_MAX_SIZE;

  /** 自定义上传（适配 Naive UI n-upload custom-request） */
  async function customUpload({ file, onFinish, onError }) {
    try {
      const fileType = file.file?.type || file.type;
      const fileSize = file.file?.size || file.size;

      if (allowedTypes.length > 0 && !allowedTypes.includes(fileType)) {
        message.error('不支持的文件类型！');
        return onError();
      }

      if (fileSize > maxSize) {
        message.error(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB！`);
        return onError();
      }

      const formData = new FormData();
      formData.append('file', file.file || file);

      const response = await fileApi.upload(formData);

      if (response.data?.url) {
        const url = response.data.url;
        // 兼容数组模式（多附件）和字符串模式（单头像）
        if (Array.isArray(attachmentsRef.value)) {
          attachmentsRef.value = [...attachmentsRef.value, url];
        } else {
          attachmentsRef.value = url;
        }
        fileListRef.value = [
          ...(fileListRef.value || []),
          {
            uid: file.uid,
            name: response.data.filename || (file.file?.name || file.name || 'file'),
            url,
            status: 'finished',
          },
        ];
        message.success('附件上传成功');
        onFinish();
      } else {
        throw new Error('服务器未返回文件 URL');
      }
    } catch {
      message.error('附件上传失败');
      onError();
    }
  }

  /** 移除附件（适配 Naive UI n-upload @remove） */
  function handleRemove(file) {
    const url = file.url || file.file?.url;
    if (url && attachmentsRef.value != null) {
      if (Array.isArray(attachmentsRef.value)) {
        attachmentsRef.value = attachmentsRef.value.filter((u) => u !== url);
      } else {
        attachmentsRef.value = '';
      }
    }
    if (fileListRef.value) {
      fileListRef.value = fileListRef.value.filter(
        (item) => item.url !== url && item.uid !== file.uid,
      );
    }
    message.info('附件已移除');
  }

  /** 附件是否全部上传完成 */
  const isReadyToSubmit = computed(() => {
    const val = attachmentsRef.value;
    const attLen = Array.isArray(val) ? val.length : (val ? 1 : 0);
    const listLen = fileListRef.value?.length || 0;
    return attLen === listLen;
  });

  return { customUpload, handleRemove, isReadyToSubmit };
}
