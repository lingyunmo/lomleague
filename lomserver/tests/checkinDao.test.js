import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ updateMany: vi.fn(), findUnique: vi.fn() }));
vi.mock('../dao/prismaClient.js', () => ({
  default: { $transaction: (fn) => fn({ user: state }) },
}));
import UserDao from '../dao/UserDao.js';

describe('atomic check-in persistence without a schema migration', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([null, new Date('2026-10-03T02:00:00Z')])(
    'guards the exact existing date %s and reads only after a successful claim',
    async (last) => {
      const now = new Date('2026-10-04T02:00:00Z');
      state.updateMany.mockResolvedValue({ count: 1 });
      state.findUnique.mockResolvedValue({ gold_coins: 5 });
      expect(await UserDao.updateCheckin(7, 5, 1, last, now)).toEqual({ gold_coins: 5 });
      expect(state.updateMany).toHaveBeenCalledWith({
        where: { id: 7, last_checkin_date: last },
        data: { gold_coins: { increment: 5 }, last_checkin_date: now, checkin_streak: 1 },
      });
      expect(state.findUnique).toHaveBeenCalledWith({ where: { id: 7 }, select: { gold_coins: true } });
    },
  );
  it('does not claim a successful reward when a competing request has already updated the date', async () => {
    state.updateMany.mockResolvedValue({ count: 0 });
    expect(await UserDao.updateCheckin(7, 5, 1, null, new Date())).toBeNull();
    expect(state.findUnique).not.toHaveBeenCalled();
  });
  it.each([
    [undefined, new Date()],
    [null, undefined],
    [null, new Date('invalid')],
  ])(
    'rejects missing/invalid date arguments instead of accidentally dropping the concurrency guard',
    async (last, now) => {
      await expect(UserDao.updateCheckin(7, 5, 1, last, now)).rejects.toBeInstanceOf(TypeError);
      expect(state.updateMany).not.toHaveBeenCalled();
    },
  );
});
