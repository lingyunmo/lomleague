/**
 * 点赞服务层 — 点赞/取消 + 通知逻辑
 * 解决 Issue #1 #2: 将复杂的点赞通知逻辑从路由提取到 Service
 */
import LikeDao from '../dao/likeDao.js';
import NotificationDao from '../dao/notificationDao.js';
import ForumDAO from '../dao/forumDao.js';
import ReplyDAO from '../dao/replyDao.js';
import ArticleDAO from '../dao/ArticleDAO.js';
import logger from '../utils/logger.js';

class LikeService {
  /**
   * 切换点赞状态（点赞/取消），点赞时自动发送通知
   */
  static async toggle(userId, username, entityType, entityId) {
    const result = await LikeDao.toggle(userId, entityType, entityId);
    const { count } = await LikeDao.getCount(entityType, entityId);

    // 点赞时发送通知给内容作者
    if (result.liked) {
      let ownerId = null;
      let notifEntityType = entityType;
      let notifEntityId = entityId;
      let title = '';

      if (entityType === 'post') {
        const post = await ForumDAO.getPostById(entityId);
        ownerId = post?.userId;
        title = post?.title || '';
      } else if (entityType === 'reply') {
        const reply = await ReplyDAO.getReplyById(entityId);
        ownerId = reply?.userId;
        notifEntityType = 'post';  // 跳转到帖子
        notifEntityId = reply?.postId;
      } else if (entityType === 'article') {
        const article = await ArticleDAO.getArticleById(entityId);
        ownerId = article?.userId;
        title = article?.title || '';
      }

      if (ownerId && ownerId !== userId) {
        const contentText = entityType === 'reply'
          ? '你的回复'
          : `「${title}」`;
        await NotificationDao.create({
          userId: ownerId,
          type: 'like',
          content: `${username} 赞了${contentText}`,
          entityType: notifEntityType,
          entityId: notifEntityId,
        });
      }
      logger.info('点赞', { userId, entityType, entityId });
    } else {
      logger.info('取消点赞', { userId, entityType, entityId });
    }

    return { liked: result.liked, count };
  }

  static async getCount(entityType, entityId) {
    return LikeDao.getCount(entityType, entityId);
  }

  static async getUserStatus(userId, entityType, entityId) {
    const liked = await LikeDao.getUserLikeStatus(userId, entityType, entityId);
    return { liked };
  }

  static async getBatchStatus(userId, entityType, entityIds) {
    const likedIds = await LikeDao.getLikedEntityIds(userId, entityType, entityIds);
    return { likedIds };
  }
}

export default LikeService;
