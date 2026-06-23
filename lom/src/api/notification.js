/**
 * 通知 API 模块
 * 解决 Issue #12: API 端点路径封装
 */
import client from './client.js';

export const notificationApi = {
  /** 分页通知列表 */
  getNotifications(params = {}) {
    return client.get('/notifications', { params });
  },

  /** 标记单条已读 */
  markAsRead(id) {
    return client.put(`/notifications/${id}/read`);
  },

  /** 全部标记已读 */
  markAllAsRead() {
    return client.put('/notifications/read-all');
  },
};
