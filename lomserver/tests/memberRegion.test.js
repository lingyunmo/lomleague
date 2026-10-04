import { beforeEach, describe, expect, it, vi } from 'vitest';
const findUnique = vi.hoisted(() => vi.fn());
vi.mock('../dao/prismaClient.js', () => ({ default: { user: { findUnique } } }));
import UserDao from '../dao/UserDao.js';
beforeEach(() => findUnique.mockReset());
describe('bounded server-stored member region read', () => {
  it('selects only this member region, without reading password/email/IP', async () => {
    findUnique.mockResolvedValue({ last_login_region: { ip: '8.8.8.8', region: '中国 浙江 杭州' } });
    expect(await UserDao.getLoginRegion(7)).toBe('中国 浙江 杭州');
    expect(findUnique).toHaveBeenCalledExactlyOnceWith({ where: { id: 7 }, select: { last_login_region: true } });
  });
  it.each([
    null,
    {},
    { last_login_region: null },
    { last_login_region: { region: [] } },
    { last_login_region: { region: '  ' } },
    { last_login_region: { region: '界'.repeat(192) } },
  ])('handles historical shape %j without rewriting it', async (value) => {
    findUnique.mockResolvedValue(value);
    expect(await UserDao.getLoginRegion(7)).toBe('未知地区');
  });
});
