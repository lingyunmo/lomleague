/**
 * 文章服务层 — 文章 CRUD 业务逻辑
 * 解决 Issue #1 #2: 将路由中的业务逻辑提取到 Service
 */
import ArticleDAO from '../dao/ArticleDAO.js';
import { NotFoundError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class ArticleService {
  static async getArticles(page, pageSize, keyword) {
    return ArticleDAO.getAllArticles(page, pageSize, keyword);
  }

  static async getLatestArticles(limit) {
    return ArticleDAO.getLatestArticles(limit);
  }

  static async getArticle(articleId) {
    const article = await ArticleDAO.getArticleById(articleId);
    if (!article) {
      throw new NotFoundError('文章不存在');
    }
    return article;
  }

  static async createArticle(data) {
    const article = await ArticleDAO.createArticle(data);
    logger.info('文章已创建', { articleId: article.id });
    return article;
  }

  static async updateArticle(articleId, data) {
    const article = await ArticleDAO.updateArticle(articleId, data);
    logger.info('文章已更新', { articleId });
    return article;
  }

  static async deleteArticle(articleId) {
    await ArticleDAO.deleteArticle(articleId);
    logger.info('文章已删除', { articleId });
  }
}

export default ArticleService;
