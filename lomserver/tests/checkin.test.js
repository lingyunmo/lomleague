import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const dao = vi.hoisted(() => ({ getUserById: vi.fn(), updateCheckin: vi.fn() }));
vi.mock('../dao/UserDao.js', () => ({ default: dao }));
vi.mock('../utils/logger.js', () => ({ default: { info: vi.fn() } }));
import UserService from '../services/userService.js';

describe('existing daily check-in business rules', () => {
  const now = new Date(2026, 9, 4, 12, 0, 0);
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    dao.updateCheckin.mockResolvedValue({ gold_coins: 105 });
  });
  afterEach(() => vi.useRealTimers());
  it('keeps the first-day five-coin reward and passes the captured date guard', async () => {
    dao.getUserById.mockResolvedValue({ last_checkin_date: null, checkin_streak: 0 });
    expect(await UserService.checkin(7)).toEqual({ reward: 5, streak: 1, totalCoins: 105 });
    expect(dao.updateCheckin).toHaveBeenCalledWith(7, 5, 1, null, now);
  });
  it.each([
    [1, 2, 6],
    [7, 8, 12],
    [100, 101, 12],
  ])('continues streak %s as %s with the existing %s-coin reward cap', async (oldStreak, streak, reward) => {
    const last = new Date(2026, 9, 3, 23, 59, 59);
    dao.getUserById.mockResolvedValue({ last_checkin_date: last, checkin_streak: oldStreak });
    expect(await UserService.checkin(7)).toMatchObject({ reward, streak });
    expect(dao.updateCheckin).toHaveBeenCalledWith(7, reward, streak, last, now);
  });
  it('resets a broken streak without modifying older business data', async () => {
    const last = new Date(2026, 9, 2, 23, 59, 59);
    dao.getUserById.mockResolvedValue({ last_checkin_date: last, checkin_streak: 100 });
    expect(await UserService.checkin(7)).toMatchObject({ reward: 5, streak: 1 });
  });
  it('rejects a check-in from earlier on the same server day before writing', async () => {
    dao.getUserById.mockResolvedValue({ last_checkin_date: new Date(2026, 9, 4, 0, 0, 0), checkin_streak: 1 });
    await expect(UserService.checkin(7)).rejects.toMatchObject({ statusCode: 409 });
    expect(dao.updateCheckin).not.toHaveBeenCalled();
  });
  it('returns a business conflict when another request already claimed the captured date', async () => {
    dao.getUserById.mockResolvedValue({ last_checkin_date: null, checkin_streak: 0 });
    dao.updateCheckin.mockResolvedValue(null);
    await expect(UserService.checkin(7)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('rejects a missing member without writing', async () => {
    dao.getUserById.mockResolvedValue(null);
    await expect(UserService.checkin(7)).rejects.toMatchObject({ statusCode: 404 });
    expect(dao.updateCheckin).not.toHaveBeenCalled();
  });
});
