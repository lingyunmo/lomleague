/**
 * 论坛 API 模块
 * 解决 Issue #12: API 端点路径封装
 */
import client from './client.js';

export const forumApi = {
  /** 分页帖子列表 */
  getPosts(params = {}) {
    return client.get('/forum/posts', { params });
  },

  /** 帖子详情 */
  getPost(id) {
    return client.get(`/forum/posts/${id}`);
  },

  /** 创建帖子 */
  createPost(data) {
    return client.post('/forum/posts', data);
  },

  /** 更新帖子 */
  updatePost(id, data) {
    return client.put(`/forum/posts/${id}`, data);
  },

  /** 删除帖子 */
  deletePost(id) {
    return client.delete(`/forum/posts/${id}`);
  },

  /** 分页回复列表 */
  getReplies(postId, params = {}) {
    return client.get(`/forum/replies/${postId}`, { params });
  },

  /** 创建回复 */
  createReply(data) {
    return client.post('/forum/replies', data);
  },

  /** 删除回复 */
  deleteReply(replyId) {
    return client.delete(`/forum/replies/${replyId}`);
  },
};
