import express from 'express';
import { z } from 'zod';
import UserDao from '../dao/UserDao.js';
import { generateToken } from '../utils/jwtUtils.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation schemas
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
});

// POST /register
router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    }
    const { username, password, email, avatar } = parsed.data;

    try {
        const existingUser = await UserDao.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const userId = await UserDao.registerUser(username, password, email, avatar);
        res.status(201).json({ message: 'User registered successfully', userId });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// POST /login
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    }
    const { username, password, ip, region } = parsed.data;

    try {
        const user = await UserDao.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordCorrect = await UserDao.checkPassword(user.id, password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        await UserDao.updateLoginInfo(user.id, {
            lastLoginIP: ip,
            lastLoginRegion: region,
        });

        const token = generateToken(user);
        res.status(200).json({ token });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET /me — current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const user = await UserDao.getUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar || '/default-avatar.png',
            lastLoginRegion: user.last_login_region,
            gold_coins: user.gold_coins,
            is_admin: user.is_admin,
            last_checkin_date: user.last_checkin_date,
            checkin_streak: user.checkin_streak,
            created_at: user.created_at,
            updated_at: user.updated_at,
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
        });
    }
});

// PUT /update — update user profile
router.put('/update', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    }
    const { avatar, username, email } = parsed.data;

    if (!username && !email && !avatar) {
        return res.status(400).json({ message: 'At least one field (username, email, or avatar) is required' });
    }

    try {
        const existingUser = await UserDao.getUserById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await UserDao.updateUser(userId, { avatar, username, email });
        res.status(200).json({ message: 'User information updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// PUT /change-password
const changePasswordSchema = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(6).max(100),
});

router.put('/change-password', authMiddleware, async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    }
    const { oldPassword, newPassword } = parsed.data;
    try {
        const isCorrect = await UserDao.checkPassword(req.user.id, oldPassword);
        if (!isCorrect) {
            return res.status(400).json({ message: '当前密码错误' });
        }
        await UserDao.updatePassword(req.user.id, newPassword);
        res.status(200).json({ message: '密码修改成功' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// POST /checkin
router.post('/checkin', authMiddleware, async (req, res) => {
    try {
        const user = await UserDao.getUserById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const now = new Date();
        const lastCheckin = user.last_checkin_date;
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastCheckinDay = lastCheckin
            ? new Date(lastCheckin.getFullYear(), lastCheckin.getMonth(), lastCheckin.getDate())
            : null;

        if (lastCheckinDay && lastCheckinDay.getTime() === today.getTime()) {
            return res.status(400).json({ message: '今天已经签到过了' });
        }

        const yesterday = new Date(today.getTime() - 86400000);
        let newStreak = 1;
        if (lastCheckinDay && lastCheckinDay.getTime() === yesterday.getTime()) {
            newStreak = (user.checkin_streak || 0) + 1;
        }

        const baseReward = 5;
        const streakBonus = Math.min(newStreak - 1, 7);
        const reward = baseReward + streakBonus;

        const updatedUser = await UserDao.updateCheckin(req.user.id, reward, newStreak);
        res.json({
            message: '签到成功',
            reward,
            streak: newStreak,
            totalCoins: updatedUser.gold_coins,
        });
    } catch (error) {
        console.error('Check-in failed:', error);
        res.status(500).json({ message: '签到失败' });
    }
});

export default router;
