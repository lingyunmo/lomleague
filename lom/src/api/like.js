/**
 * 点赞 API 模块
 * 解决 Issue #12: API 端点路径封装
 */
import client from './client.js';

export const likeApi = {
  /** 切换点赞状态 */
  toggle(entityType, entityId) {
    return client.post('/likes/toggle', { entityType, entityId });
  },

  /** 获取点赞数 */
  getCount(entityType, entityId) {
    return client.get('/likes/count', { params: { entityType, entityId } });
  },

  /** 获取当前用户点赞状态 */
  getStatus(entityType, entityId) {
    return client.get('/likes/status', { params: { entityType, entityId } });
  },

  /** 批量获取点赞状态 */
  getBatchStatus(entityType, entityIds) {
    return client.post('/likes/batch-status', { entityType, entityIds });
  },
};
