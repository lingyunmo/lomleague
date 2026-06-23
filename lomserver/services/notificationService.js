/**
 * 通知服务层 — 通知查询 & 已读标记
 * 解决 Issue #1 #2: 将通知业务逻辑从路由提取到 Service
 */
import NotificationDao from '../dao/notificationDao.js';

class NotificationService {
  static async getNotifications(userId, unreadOnly, page, pageSize) {
    return NotificationDao.getByUserId(userId, unreadOnly, page, pageSize);
  }

  static async markAsRead(notificationId, userId) {
    await NotificationDao.markAsRead(notificationId, userId);
  }

  static async markAllAsRead(userId) {
    await NotificationDao.markAllAsRead(userId);
  }
}

export default NotificationService;
