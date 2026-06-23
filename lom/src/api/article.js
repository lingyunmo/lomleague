/**
 * 文章 API 模块
 * 解决 Issue #12: API 端点路径封装
 */
import client from './client.js';

export const articleApi = {
  /** 分页文章列表 */
  getArticles(params = {}) {
    return client.get('/articles', { params });
  },

  /** 最新文章 */
  getLatest(limit = 5) {
    return client.get('/articles/latest', { params: { limit } });
  },

  /** 文章详情 */
  getArticle(id) {
    return client.get(`/articles/${id}`);
  },

  /** 创建文章（管理员） */
  createArticle(data) {
    return client.post('/articles', data);
  },

  /** 更新文章（管理员） */
  updateArticle(id, data) {
    return client.put(`/articles/${id}`, data);
  },

  /** 删除文章（管理员） */
  deleteArticle(id) {
    return client.delete(`/articles/${id}`);
  },
};
