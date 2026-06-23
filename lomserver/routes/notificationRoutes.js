/**
 * 通知路由 — 薄层，只做：参数提取 → 调 Service → 响应
 * 解决 Issue #1 #3 #4: 业务逻辑在 Service 层
 */
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';
import NotificationService from '../services/notificationService.js';

const router = express.Router();

// GET / — 分页通知列表
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const unreadOnly = req.query.unread === 'true';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
  const result = await NotificationService.getNotifications(req.user.id, unreadOnly, page, pageSize);
  res.json(result);
}));

// PUT /:id/read — 标记单条已读
router.put('/:id/read', authMiddleware, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await NotificationService.markAsRead(id, req.user.id);
  res.json({ message: '已标记为已读' });
}));

// PUT /read-all — 全部标记已读
router.put('/read-all', authMiddleware, asyncHandler(async (req, res) => {
  await NotificationService.markAllAsRead(req.user.id);
  res.json({ message: '全部已标记为已读' });
}));

export default router;
