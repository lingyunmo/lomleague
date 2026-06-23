/**
 * 论坛服务层 — 帖子 & 回复业务逻辑
 * 解决 Issue #1 #2: 将路由中的业务逻辑（CRUD + 通知）提取到 Service
 */
import ForumDAO from '../dao/forumDao.js';
import ReplyDAO from '../dao/replyDao.js';
import NotificationDao from '../dao/notificationDao.js';
import { NotFoundError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class ForumService {
  // ==================== 帖子 ====================

  static async getPosts(page, pageSize, keyword) {
    return ForumDAO.getAllPosts(page, pageSize, keyword);
  }

  static async getPost(postId) {
    const post = await ForumDAO.getPostById(postId);
    if (!post) {
      throw new NotFoundError('帖子不存在');
    }
    return post;
  }

  static async createPost(userId, data) {
    const post = await ForumDAO.createPost({ userId, ...data });
    logger.info('帖子已创建', { postId: post.id, userId });
    return post;
  }

  static async updatePost(postId, data) {
    const updated = await ForumDAO.updatePost(postId, data);
    logger.info('帖子已更新', { postId });
    return updated;
  }

  static async deletePost(postId) {
    await ForumDAO.deletePost(postId);
    logger.info('帖子已删除', { postId });
  }

  // ==================== 回复 ====================

  static async getReplies(postId, page, pageSize) {
    return ReplyDAO.getRepliesByPostId(postId, page, pageSize);
  }

  /**
   * 创建回复（含通知帖子作者逻辑）
   */
  static async createReply(userId, username, data) {
    const { postId, content, attachments, region } = data;
    const reply = await ReplyDAO.createReply({
      postId, userId, content, attachments, region,
    });

    // 通知帖子作者（非自己回复自己）
    const post = await ForumDAO.getPostById(postId);
    if (post && post.userId !== userId) {
      await NotificationDao.create({
        userId: post.userId,
        type: 'reply',
        content: `${username} 回复了你的帖子「${post.title}」`,
        entityType: 'post',
        entityId: postId,
      });
    }

    logger.info('回复已创建', { replyId: reply.id, postId, userId });
    return reply;
  }

  static async updateReply(replyId, data) {
    const updated = await ReplyDAO.updateReply(replyId, data);
    logger.info('回复已更新', { replyId });
    return updated;
  }

  static async deleteReply(replyId) {
    await ReplyDAO.deleteReply(replyId);
    logger.info('回复已删除', { replyId });
  }
}

export default ForumService;
