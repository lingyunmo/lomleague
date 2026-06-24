/**
 * 用户路由 — 薄层，只做：参数提取 → 调 Service → 响应
 * 解决 Issue #1 #3 #4 #5: 验证交给 validate 中间件，错误交给 errorHandler，日志在 Service 层
 */
import express from 'express';
import { z } from 'zod';
import { authMiddleware, isAdmin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../middleware/asyncHandler.js';
import UserService from '../services/userService.js';
import UserDao from '../dao/UserDao.js';
import prisma from '../dao/prismaClient.js';
import { getUserFrame } from '../utils/userFrame.js';

const router = express.Router();

// ==================== 验证 Schema ====================

const registerSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(6).max(100),
  email: z.string().email(),
  avatar: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  ip: z.string().optional(),
  region: z.string().optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  avatar: z.string().optional(),
}).refine(data => data.username || data.email || data.avatar, {
  message: '至少需要提供 username、email 或 avatar 中的一个',
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

// ==================== 路由 ====================

// POST /register
router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { username, password, email, avatar } = req.body;
  const result = await UserService.register(username, password, email, avatar);
  res.status(201).json({ message: '注册成功', userId: result.userId });
}));

// POST /login
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { username, password, ip, region } = req.body;
  const result = await UserService.login(username, password, ip, region);
  res.status(200).json({ token: result.token });
}));

// GET /me — 当前用户信息
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const profile = await UserService.getProfile(req.user.id);
  res.status(200).json(profile);
}));

// PUT /update — 更新用户信息
router.put('/update', authMiddleware, validate(updateUserSchema), asyncHandler(async (req, res) => {
  await UserService.updateProfile(req.user.id, req.body);
  res.status(200).json({ message: '用户信息更新成功' });
}));

// PUT /change-password
router.put('/change-password', authMiddleware, validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  await UserService.changePassword(req.user.id, oldPassword, newPassword);
  res.status(200).json({ message: '密码修改成功' });
}));

// POST /checkin
router.post('/checkin', authMiddleware, asyncHandler(async (req, res) => {
  const result = await UserService.checkin(req.user.id);
  res.json({
    message: '签到成功',
    reward: result.reward,
    streak: result.streak,
    totalCoins: result.totalCoins,
  });
}));

// ==================== Admin 路由 ====================

const adminUpdateSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100).optional(),
  is_admin: z.boolean().optional(),
});

const adminCreateSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(6).max(100),
  email: z.string().email(),
  is_admin: z.boolean().optional(),
});

// GET /admin/users
router.get('/admin/users', authMiddleware, isAdmin, asyncHandler(async (req, res) => {
  const users = await UserDao.getAllUsers();
  res.json(users);
}));

// POST /admin/users
router.post('/admin/users', authMiddleware, isAdmin, validate(adminCreateSchema), asyncHandler(async (req, res) => {
  const { username, password, email, is_admin } = req.body;
  const result = await UserService.register(username, password, email, null);
  if (is_admin) {
    await UserDao.updateUser(result.userId, { is_admin: true });
  }
  res.status(201).json({ message: '创建成功', userId: result.userId });
}));

// PUT /admin/users/:id
router.put('/admin/users/:id', authMiddleware, isAdmin, validate(adminUpdateSchema), asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { password, ...rest } = req.body;
  if (Object.keys(rest).length > 0) {
    await UserDao.updateUser(userId, rest);
  }
  if (password) {
    await UserDao.updatePassword(userId, password);
  }
  res.json({ message: '更新成功' });
}));

// DELETE /admin/users/:id
router.delete('/admin/users/:id', authMiddleware, isAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (userId === req.user.id) {
    return res.status(400).json({ message: '不能删除自己' });
  }
  await UserDao.deleteUser(userId);
  res.json({ message: '删除成功' });
}));

// GET /achievements/:id — 用户成就与头像框等级
router.get('/achievements/:id', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await UserDao.getUserById(userId);
  if (!user) return res.status(404).json({ message: '用户不存在' });

  // 统计
  const [postCount, replyCount, totalLikes, streak] = await Promise.all([
    prisma.forumPost.count({ where: { userId } }),
    prisma.forumReply.count({ where: { userId } }),
    (async () => {
      const posts = await prisma.forumPost.findMany({ where: { userId }, select: { id: true } });
      const replies = await prisma.forumReply.findMany({ where: { userId }, select: { id: true } });
      const postIds = posts.map(p => p.id);
      const replyIds = replies.map(r => r.id);
      const [postLikes, replyLikes] = await Promise.all([
        prisma.like.count({ where: { entityType: 'post', entityId: { in: postIds } } }),
        prisma.like.count({ where: { entityType: 'reply', entityId: { in: replyIds } } }),
      ]);
      return postLikes + replyLikes;
    })(),
    Promise.resolve(user.checkin_streak || 0),
  ]);

  const daysSinceJoin = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);

  const achievements = [];
  if (postCount >= 1) achievements.push({ key: 'first_post', name: '初来乍到', desc: '发布第一篇帖子', icon: '📝', unlocked: true });
  if (postCount >= 10) achievements.push({ key: 'ten_posts', name: '畅所欲言', desc: '发布10篇帖子', icon: '💬', unlocked: true });
  if (replyCount >= 1) achievements.push({ key: 'first_reply', name: '乐于助人', desc: '发表第一条回复', icon: '🤝', unlocked: true });
  if (totalLikes >= 10) achievements.push({ key: 'liked_10', name: '小有名气', desc: '累计获得10个赞', icon: '👍', unlocked: true });
  if (totalLikes >= 100) achievements.push({ key: 'liked_100', name: '人气之星', desc: '累计获得100个赞', icon: '⭐', unlocked: true });
  if (streak >= 7) achievements.push({ key: 'streak_7', name: '坚持不懈', desc: '连续签到7天', icon: '🔥', unlocked: true });
  if (streak >= 30) achievements.push({ key: 'streak_30', name: '风雨无阻', desc: '连续签到30天', icon: '💪', unlocked: true });
  if (streak >= 365) achievements.push({ key: 'streak_365', name: '签到之王', desc: '连续签到365天', icon: '👑', unlocked: true });
  if (daysSinceJoin >= 365) achievements.push({ key: 'veteran', name: '入盟元老', desc: '加入超过365天', icon: '🏆', unlocked: true });

  const count = achievements.length;
  const frame = count >= 8 ? 'legend' : count >= 6 ? 'gold' : count >= 4 ? 'silver' : count >= 2 ? 'bronze' : 'none';

  // 未解锁的成就
  const allKeys = [
    { key: 'first_post', name: '初来乍到', desc: '发布第一篇帖子', icon: '📝' },
    { key: 'ten_posts', name: '畅所欲言', desc: '发布10篇帖子', icon: '💬' },
    { key: 'first_reply', name: '乐于助人', desc: '发表第一条回复', icon: '🤝' },
    { key: 'liked_10', name: '小有名气', desc: '累计获得10个赞', icon: '👍' },
    { key: 'liked_100', name: '人气之星', desc: '累计获得100个赞', icon: '⭐' },
    { key: 'streak_7', name: '坚持不懈', desc: '连续签到7天', icon: '🔥' },
    { key: 'streak_30', name: '风雨无阻', desc: '连续签到30天', icon: '💪' },
    { key: 'streak_365', name: '签到之王', desc: '连续签到365天', icon: '👑' },
    { key: 'veteran', name: '入盟元老', desc: '加入超过365天', icon: '🏆' },
  ];
  const unlockedKeys = new Set(achievements.map(a => a.key));
  const locked = allKeys.filter(k => !unlockedKeys.has(k.key)).map(k => ({ ...k, unlocked: false }));

  res.json({ achievements: [...achievements, ...locked], count, frame, stats: { postCount, replyCount, totalLikes, streak, daysSinceJoin } });
}));

// POST /frames — 批量获取用户头像框（公开）
router.post('/frames', asyncHandler(async (req, res) => {
  const { userIds } = req.body
  if (!Array.isArray(userIds) || userIds.length > 100) {
    return res.status(400).json({ message: 'userIds 需为数组且不超过100个' })
  }
  const frames = {}
  for (const uid of userIds) {
    const userId = parseInt(uid, 10)
    frames[userId] = await getUserFrame(userId)
  }
  res.json({ frames })
}));

export default router;
