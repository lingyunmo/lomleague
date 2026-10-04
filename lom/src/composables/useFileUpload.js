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
 * @returns {{ customUpload, handleFinish, handleRemove, isReadyToSubmit, isUploading }}
 */
import { computed, ref, watch, getCurrentScope, onScopeDispose } from 'vue';
import { useMessage } from 'naive-ui';
import { fileApi } from '../api/file.js';
import { useAuthStore } from '../stores/authStore.js';

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/x-msvideo',
  'application/pdf',
  'application/zip',
  'application/x-rar-compressed',
];
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function useFileUpload(attachmentsRef, fileListRef, constraints = {}) {
  const message = useMessage();
  const allowedTypes = constraints.allowedTypes || DEFAULT_ALLOWED_TYPES;
  const maxSize = constraints.maxSize || DEFAULT_MAX_SIZE;
  const auth = useAuthStore();
  const pending = ref(0);
  const inFlight = new Map();
  let generation = 0;
  let disposed = false;
  const invalidate = () => {
    generation++;
    inFlight.clear();
    pending.value = 0;
  };
  watch(() => auth.token, invalidate, { flush: 'sync' });
  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true;
      invalidate();
    });
  }

  /** 自定义上传（适配 Naive UI n-upload custom-request） */
  async function customUpload({ file, onFinish, onError }) {
    if (disposed) return;
    const key = file.id ?? file;
    if (inFlight.has(key)) return;
    const request = { token: auth.token, generation };
    const isCurrent = () =>
      !disposed && request.token === auth.token && request.generation === generation && inFlight.get(key) === request;
    inFlight.set(key, request);
    pending.value++;
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
      if (!isCurrent()) return;

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
            id: file.id,
            name: response.data.filename || file.file?.name || file.name || 'file',
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
      if (!isCurrent()) return;
      message.error('附件上传失败');
      onError();
    } finally {
      if (inFlight.get(key) === request) {
        inFlight.delete(key);
        pending.value--;
      }
    }
  }

  /** 返回当前上传控件的完成信息；文件名直接使用服务器实际存储名称。 */
  function handleFinish({ file }) {
    const stored = fileListRef.value?.find((item) => item.id === file.id);
    return stored ? { ...file, ...stored } : file;
  }

  /** 移除附件（适配 Naive UI n-upload @remove） */
  function handleRemove(event) {
    const file = 'fileList' in event ? event.file : event;
    const key = file.id ?? file;
    if (inFlight.delete(key)) pending.value--;
    const stored = fileListRef.value?.find((item) => item.id === file.id);
    const url = file.url || stored?.url;
    if (url && attachmentsRef.value != null) {
      if (Array.isArray(attachmentsRef.value)) {
        attachmentsRef.value = attachmentsRef.value.filter((u) => u !== url);
      } else {
        attachmentsRef.value = '';
      }
    }
    if (fileListRef.value) {
      fileListRef.value = fileListRef.value.filter((item) => item.id !== file.id && (!url || item.url !== url));
    }
    message.info('附件已移除');
  }

  /** 附件是否全部上传完成 */
  const isReadyToSubmit = computed(() => {
    const val = attachmentsRef.value;
    const attLen = Array.isArray(val) ? val.length : val ? 1 : 0;
    const listLen = fileListRef.value?.length || 0;
    return pending.value === 0 && attLen === listLen;
  });

  // Existing avatar URLs need no synthetic file-list entry; expose in-flight state separately.
  const isUploading = computed(() => pending.value > 0);
  return { customUpload, handleFinish, handleRemove, isReadyToSubmit, isUploading };
}
