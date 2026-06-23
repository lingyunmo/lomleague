/**
 * 论坛路由 — 薄层，只做：参数提取 → 调 Service → 响应
 * 解决 Issue #1 #3 #4 #6: 权限交给 requireOwner 中间件，错误交给 errorHandler
 */
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../middleware/asyncHandler.js';
import requireOwner from '../middleware/requireOwner.js';
import ForumService from '../services/forumService.js';
import ForumDAO from '../dao/forumDao.js';
import ReplyDAO from '../dao/replyDao.js';
import { z } from 'zod';

const router = express.Router();

// ==================== 验证 Schema ====================

const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  attachments: z.any().optional(),
  region: z.string().optional(),
});

const updatePostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  attachments: z.any().optional(),
  region: z.string().optional(),
});

const createReplySchema = z.object({
  postId: z.number().int().positive(),
  content: z.string().min(1, '内容不能为空'),
  attachments: z.any().optional(),
  region: z.string().optional(),
});

const updateReplySchema = z.object({
  content: z.string().optional(),
  attachments: z.any().optional(),
  region: z.string().optional(),
});

// ==================== 帖子路由 ====================

// GET /posts — 分页列表
router.get('/posts', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
  const keyword = req.query.keyword || '';
  const result = await ForumService.getPosts(page, pageSize, keyword);
  res.json(result);
}));

// GET /posts/:id — 帖子详情
router.get('/posts/:id', asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const post = await ForumService.getPost(postId);
  res.json(post);
}));

// POST /posts — 创建帖子
router.post('/posts', authMiddleware, validate(createPostSchema), asyncHandler(async (req, res) => {
  const post = await ForumService.createPost(req.user.id, req.body);
  res.status(201).json(post);
}));

// PUT /posts/:id — 更新帖子（所有者或管理员）
router.put('/posts/:id', authMiddleware, requireOwner(ForumDAO.getPostById), validate(updatePostSchema), asyncHandler(async (req, res) => {
  const updated = await ForumService.updatePost(req.entity.id, req.body);
  res.json(updated);
}));

// DELETE /posts/:id — 删除帖子（所有者或管理员）
router.delete('/posts/:id', authMiddleware, requireOwner(ForumDAO.getPostById), asyncHandler(async (req, res) => {
  await ForumService.deletePost(req.entity.id);
  res.status(204).send();
}));

// ==================== 回复路由 ====================

// GET /replies/:postId — 帖子的回复列表
router.get('/replies/:postId', asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
  const result = await ForumService.getReplies(postId, page, pageSize);
  res.json(result);
}));

// POST /replies — 创建回复
router.post('/replies', authMiddleware, validate(createReplySchema), asyncHandler(async (req, res) => {
  const reply = await ForumService.createReply(req.user.id, req.user.username, req.body);
  res.status(201).json(reply);
}));

// PUT /replies/:replyId — 更新回复（所有者或管理员）
router.put('/replies/:replyId', authMiddleware, requireOwner(ReplyDAO.getReplyById, 'replyId'), validate(updateReplySchema), asyncHandler(async (req, res) => {
  const updated = await ForumService.updateReply(req.entity.id, req.body);
  res.json(updated);
}));

// DELETE /replies/:replyId — 删除回复（所有者或管理员）
router.delete('/replies/:replyId', authMiddleware, requireOwner(ReplyDAO.getReplyById, 'replyId'), asyncHandler(async (req, res) => {
  await ForumService.deleteReply(req.entity.id);
  res.status(204).send();
}));

export default router;
