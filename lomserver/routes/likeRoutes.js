/**
 * 点赞路由 — 薄层，只做：参数提取 → 调 Service → 响应
 * 解决 Issue #1 #3 #4: 业务逻辑（含通知）在 Service 层
 */
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';
import LikeService from '../services/likeService.js';

const router = express.Router();

// POST /toggle — 切换点赞状态
router.post('/toggle', authMiddleware, asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.body;
  if (!entityType || !entityId || !['post', 'reply', 'article'].includes(entityType)) {
    return res.status(400).json({ message: '无效的 entityType 或 entityId' });
  }
  const result = await LikeService.toggle(
    req.user.id,
    req.user.username,
    entityType,
    parseInt(entityId),
  );
  res.json({ liked: result.liked, count: result.count });
}));

// GET /count?entityType=post&entityId=1
router.get('/count', asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    return res.status(400).json({ message: '缺少参数 entityType 或 entityId' });
  }
  const result = await LikeService.getCount(entityType, parseInt(entityId));
  res.json(result);
}));

// GET /status?entityType=post&entityId=1
router.get('/status', authMiddleware, asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    return res.status(400).json({ message: '缺少参数 entityType 或 entityId' });
  }
  const result = await LikeService.getUserStatus(req.user.id, entityType, parseInt(entityId));
  res.json(result);
}));

// POST /batch-status
router.post('/batch-status', authMiddleware, asyncHandler(async (req, res) => {
  const { entityType, entityIds } = req.body;
  const result = await LikeService.getBatchStatus(req.user.id, entityType, entityIds);
  res.json(result);
}));

export default router;
