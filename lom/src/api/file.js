/**
 * 文件上传 API 模块
 */
import client from './client.js';

export const fileApi = {
  /** 上传文件（FormData） */
  upload(formData) {
    return client.post('/file/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
