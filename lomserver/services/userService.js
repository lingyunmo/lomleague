/**
 * 用户服务层 — 用户相关业务逻辑
 * 解决 Issue #1 #2: 路由层职责分离，业务逻辑从路由中提取到 Service
 */
import UserDao from '../dao/UserDao.js';
import { generateToken } from '../utils/jwtUtils.js';
import { NotFoundError, UnauthorizedError, ConflictError, ValidationError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class UserService {
  /**
   * 用户注册
   * @throws {ConflictError} 用户名已存在
   */
  static async register(username, password, email, avatar) {
    const existing = await UserDao.getUserByUsername(username);
    if (existing) {
      throw new ConflictError('用户名已存在');
    }
    const userId = await UserDao.registerUser(username, password, email, avatar);
    logger.info('用户注册成功', { userId, username });
    return { userId };
  }

  /**
   * 用户登录
   * @throws {UnauthorizedError} 用户名或密码错误
   */
  static async login(username, password, ip, region) {
    const user = await UserDao.getUserByUsername(username);
    if (!user) {
      throw new UnauthorizedError('用户名或密码错误');
    }
    const isCorrect = await UserDao.checkPassword(user.id, password);
    if (!isCorrect) {
      throw new UnauthorizedError('用户名或密码错误');
    }
    await UserDao.updateLoginInfo(user.id, {
      lastLoginIP: ip,
      lastLoginRegion: region,
    });
    const token = generateToken(user);
    logger.info('用户登录成功', { userId: user.id, username });
    return { token };
  }

  /**
   * 获取用户信息
   * @throws {NotFoundError} 用户不存在
   */
  static async getProfile(userId) {
    const user = await UserDao.getUserById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    return {
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
    };
  }

  /**
   * 更新用户信息
   * @throws {NotFoundError} 用户不存在
   */
  static async updateProfile(userId, data) {
    const user = await UserDao.getUserById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    await UserDao.updateUser(userId, data);
    logger.info('用户信息已更新', { userId });
  }

  /**
   * 修改密码
   * @throws {ValidationError} 当前密码错误
   */
  static async changePassword(userId, oldPassword, newPassword) {
    const isCorrect = await UserDao.checkPassword(userId, oldPassword);
    if (!isCorrect) {
      throw new ValidationError('当前密码错误');
    }
    await UserDao.updatePassword(userId, newPassword);
    logger.info('密码已修改', { userId });
  }

  /**
   * 每日签到
   * @throws {NotFoundError} 用户不存在
   * @throws {ConflictError} 今天已签到
   */
  static async checkin(userId) {
    const user = await UserDao.getUserById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastCheckin = user.last_checkin_date;
    const lastCheckinDay = lastCheckin
      ? new Date(lastCheckin.getFullYear(), lastCheckin.getMonth(), lastCheckin.getDate())
      : null;

    if (lastCheckinDay && lastCheckinDay.getTime() === today.getTime()) {
      throw new ConflictError('今天已经签到过了');
    }

    const yesterday = new Date(today.getTime() - 86400000);
    let newStreak = 1;
    if (lastCheckinDay && lastCheckinDay.getTime() === yesterday.getTime()) {
      newStreak = (user.checkin_streak || 0) + 1;
    }

    const baseReward = 5;
    const streakBonus = Math.min(newStreak - 1, 7);
    const reward = baseReward + streakBonus;

    const updatedUser = await UserDao.updateCheckin(userId, reward, newStreak);
    logger.info('签到成功', { userId, reward, streak: newStreak });
    return {
      reward,
      streak: newStreak,
      totalCoins: updatedUser.gold_coins,
    };
  }
}

export default UserService;
