/**
 * 点赞路由 — 薄层，只做：参数提取 → 调 Service → 响应
 * 解决 Issue #1 #3 #4: 业务逻辑（含通知）在 Service 层
 */
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';
import LikeService from '../services/likeService.js';

const router = express.Router();

function readBatch(body) {
  const { entityType, entityIds } = body || {};
  if (
    !['post', 'reply', 'article'].includes(entityType) ||
    !Array.isArray(entityIds) ||
    entityIds.length > 100 ||
    entityIds.some((id) => !Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647)
  ) return null;
  return { entityType, entityIds: [...new Set(entityIds)] };
}

// Public counts only, using the existing entity/id index. No personal status is returned.
router.post('/batch-counts', asyncHandler(async (req, res) => {
  const batch = readBatch(req.body);
  if (!batch) return res.status(400).json({ message: '无效的点赞查询参数（最多 100 项）' });
  res.json(await LikeService.getBatchCounts(batch.entityType, batch.entityIds));
}));

// POST /toggle — 切换点赞状态
router.post('/toggle', authMiddleware, asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.body;
  if (!entityType || !entityId || !['post', 'reply', 'article'].includes(entityType)) {
    return res.status(400).json({ message: '点赞目标无效，请刷新页面后重试' });
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
    return res.status(400).json({ message: '缺少点赞查询目标，请刷新页面后重试' });
  }
  const result = await LikeService.getCount(entityType, parseInt(entityId));
  res.json(result);
}));

// GET /status?entityType=post&entityId=1
router.get('/status', authMiddleware, asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    return res.status(400).json({ message: '缺少点赞查询目标，请刷新页面后重试' });
  }
  const result = await LikeService.getUserStatus(req.user.id, entityType, parseInt(entityId));
  res.json(result);
}));

// POST /batch-status
router.post('/batch-status', authMiddleware, asyncHandler(async (req, res) => {
  const batch = readBatch(req.body);
  if (!batch) return res.status(400).json({ message: '无效的点赞查询参数（最多 100 项）' });
  const result = await LikeService.getBatchStatus(req.user.id, batch.entityType, batch.entityIds);
  res.set('Cache-Control', 'no-store');
  res.json(result);
}));

export default router;
