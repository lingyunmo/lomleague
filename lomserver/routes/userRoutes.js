/**
 * 用户路由 — 薄层，只做：参数提取 → 调 Service → 响应
 * 解决 Issue #1 #3 #4 #5: 验证交给 validate 中间件，错误交给 errorHandler，日志在 Service 层
 */
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../middleware/asyncHandler.js';
import UserService from '../services/userService.js';

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

export default router;
