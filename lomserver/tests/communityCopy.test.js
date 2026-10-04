import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
const calls = vi.hoisted(() => ({ user: vi.fn(), count: vi.fn(), rows: vi.fn() }));
vi.mock('../dao/UserDao.js', () => ({ default: { getUserById: calls.user } }));
vi.mock('../dao/prismaClient.js', () => ({
  default: {
    forumPost: { count: calls.count, findMany: calls.rows },
    forumReply: { count: calls.count, findMany: calls.rows },
    like: { count: calls.count },
  },
}));
import userRoutes from '../routes/userRoutes.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
let server, base;
beforeAll(async () => {
  const app = express();
  app.use('/user', userRoutes);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});
beforeEach(() => {
  vi.clearAllMocks();
  calls.count.mockResolvedValue(0);
  calls.rows.mockResolvedValue([]);
  vi.stubEnv('JWT_SECRET', 'isolated-copy-test-only');
});
afterEach(() => {
  vi.unstubAllEnvs();
});
describe('localized public feedback without changing existing authentication/achievement rules', () => {
  it.each([
    [undefined, '请先登录'],
    ['Bearer invalid-token', '登录已失效，请重新登录'],
  ])('keeps 401 and the message field for %s', (authorization, message) => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() },
      next = vi.fn();
    authMiddleware({ headers: { authorization } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message });
    expect(next).not.toHaveBeenCalled();
  });
  it('still accepts a valid signed token', () => {
    const req = { headers: { authorization: `Bearer ${jwt.sign({ id: 7 }, process.env.JWT_SECRET)}` } },
      next = vi.fn();
    authMiddleware(req, {}, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user.id).toBe(7);
  });
  it.each([0, 364, 365, 366])(
    'describes account age truthfully at %s days with the existing threshold/key',
    async (days) => {
      calls.user.mockResolvedValue({ id: 7, created_at: new Date(Date.now() - days * 86400000), checkin_streak: 0 });
      const response = await fetch(`${base}/user/achievements/7`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.achievements).toHaveLength(9);
      expect(data.achievements.find((item) => item.key === 'veteran')).toMatchObject({
        name: '社区常驻',
        desc: '网站账号注册满365天',
        unlocked: days >= 365,
      });
      expect(data.frame).toBe('none');
      expect(data.count).toBe(days >= 365 ? 1 : 0);
      expect(calls.user).toHaveBeenCalledWith(7);
    },
  );
});
