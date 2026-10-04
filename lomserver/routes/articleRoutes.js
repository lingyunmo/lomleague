/**
 * 文章路由 — 薄层，只做：参数提取 → 调 Service → 响应
 * 解决 Issue #1 #3 #4: 验证/权限在中间件，业务在 Service，错误在 errorHandler
 * 注意：文章操作仅限管理员
 */
import express from 'express';
import { authMiddleware, isAdmin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../middleware/asyncHandler.js';
import ArticleService from '../services/articleService.js';
import { z } from 'zod';

const router = express.Router();

// ==================== 验证 Schema ====================

const articleSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  attachments: z.any().optional(),
  region: z.string().optional(),
});

const articleUpdateSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  attachments: z.any().optional(),
  region: z.string().optional(),
});

// ==================== 公开路由 ====================

// GET / — 分页文章列表
router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
  const keyword = req.query.keyword || '';
  const result = await ArticleService.getArticles(page, pageSize, keyword);
  res.json(result);
}));

// GET /latest — 最新文章
router.get('/latest', asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 5));
  const articles = await ArticleService.getLatestArticles(limit);
  res.json(articles);
}));

// GET /:id — 文章详情
router.get('/:id', asyncHandler(async (req, res) => {
  const articleId = parseInt(req.params.id, 10);
  const article = await ArticleService.getArticle(articleId);
  res.json(article);
}));

// ==================== 管理员路由 ====================

// POST / — 创建文章（仅管理员）
router.post('/', authMiddleware, isAdmin, validate(articleSchema), asyncHandler(async (req, res) => {
  const article = await ArticleService.createArticle({
    ...req.body,
    userId: req.user.id,
  });
  res.status(201).json(article);
}));

// PUT /:id — 更新文章（仅管理员）
router.put('/:id', authMiddleware, isAdmin, validate(articleUpdateSchema), asyncHandler(async (req, res) => {
  const articleId = parseInt(req.params.id, 10);
  const updated = await ArticleService.updateArticle(articleId, req.body);
  res.json(updated);
}));

// DELETE /:id — 删除文章（仅管理员）
router.delete('/:id', authMiddleware, isAdmin, asyncHandler(async (req, res) => {
  const articleId = parseInt(req.params.id, 10);
  await ArticleService.deleteArticle(articleId);
  res.status(204).send();
}));

export default router;
