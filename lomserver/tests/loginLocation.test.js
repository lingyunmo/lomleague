import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getUserByUsername: vi.fn(),
  checkPassword: vi.fn(),
  updateLoginInfo: vi.fn(),
  getIpLocation: vi.fn(),
  generateToken: vi.fn(),
}));
vi.mock('../dao/UserDao.js', () => ({ default: mocks }));
vi.mock('../services/ipLocationService.js', () => ({ getIpLocation: mocks.getIpLocation }));
vi.mock('../utils/jwtUtils.js', () => ({ generateToken: mocks.generateToken }));
vi.mock('../utils/logger.js', () => ({ default: { info: vi.fn() } }));
import UserService from '../services/userService.js';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserByUsername.mockResolvedValue({ id: 7, username: 'member' });
  mocks.checkPassword.mockResolvedValue(true);
  mocks.updateLoginInfo.mockResolvedValue({});
  mocks.generateToken.mockReturnValue('fixture');
  mocks.getIpLocation.mockResolvedValue({ ip: '4.4.4.4', region: '服务端地区' });
});
describe('server-side login location after credential verification', () => {
  it('ignores legacy client region and persists only request IP lookup', async () => {
    expect(await UserService.login('member', 'password', '4.4.4.4', '客户端伪造地区')).toEqual({ token: 'fixture' });
    expect(mocks.getIpLocation).toHaveBeenCalledExactlyOnceWith('4.4.4.4');
    expect(mocks.updateLoginInfo).toHaveBeenCalledExactlyOnceWith(7, {
      lastLoginIP: '4.4.4.4',
      lastLoginRegion: '服务端地区',
    });
    expect(mocks.checkPassword.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getIpLocation.mock.invocationCallOrder[0],
    );
  });
  it.each([false, null])('never locates or writes for invalid credentials %s', async (valid) => {
    if (valid === null) mocks.getUserByUsername.mockResolvedValue(null);
    else mocks.checkPassword.mockResolvedValue(false);
    await expect(UserService.login('member', 'wrong', '4.4.4.4')).rejects.toMatchObject({ statusCode: 401 });
    expect(mocks.getIpLocation).not.toHaveBeenCalled();
    expect(mocks.updateLoginInfo).not.toHaveBeenCalled();
    expect(mocks.generateToken).not.toHaveBeenCalled();
  });
  it('still issues a token when region lookup fails safely', async () => {
    mocks.getIpLocation.mockResolvedValue({ ip: '4.4.4.4', region: '未知地区' });
    expect(await UserService.login('member', 'password', '4.4.4.4')).toEqual({ token: 'fixture' });
    expect(mocks.updateLoginInfo).toHaveBeenCalledWith(7, { lastLoginIP: '4.4.4.4', lastLoginRegion: '未知地区' });
  });
});
