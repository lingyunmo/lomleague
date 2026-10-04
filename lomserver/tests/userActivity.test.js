import { beforeEach, describe, expect, it, vi } from 'vitest';
const queries = vi.hoisted(() => ({ posts: vi.fn(), replies: vi.fn() }));
vi.mock('../dao/prismaClient.js', () => ({
  default: { forumPost: { findMany: queries.posts }, forumReply: { findMany: queries.replies } },
}));
import UserDao from '../dao/UserDao.js';
beforeEach(() => {
  queries.posts.mockReset().mockResolvedValue([]);
  queries.replies.mockReset().mockResolvedValue([]);
});
describe('bounded authenticated-member activity reads', () => {
  it('filters both tables by the captured member id, selects only necessary fields and reads at most five per kind', async () => {
    expect(await UserDao.getRecentActivity(7)).toEqual([]);
    expect(queries.posts).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 7 },
      select: { id: true, title: true, updatedAt: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 5,
    });
    expect(queries.replies).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 7 },
      select: { id: true, postId: true, content: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 5,
    });
  });
  it('merges by the actual timestamp across months and years, not formatted date strings', async () => {
    queries.posts.mockResolvedValueOnce([
      { id: 2, title: 'older', updatedAt: new Date('2025-12-31T23:59:59Z') },
      { id: 3, title: 'newest', updatedAt: new Date('2026-10-04T01:00:00Z') },
    ]);
    queries.replies.mockResolvedValueOnce([
      { id: 9, postId: 100, content: 'own reply', createdAt: new Date('2026-09-30T01:00:00Z') },
    ]);
    const activity = await UserDao.getRecentActivity(7);
    expect(activity.map((item) => item.text)).toEqual(['newest', 'own reply', 'older']);
    expect(activity[1]).toMatchObject({ key: 'r9', type: 'reply', postId: 100 });
  });
  it('returns only the five newest combined events', async () => {
    const day = (value) => new Date(`2026-10-${String(value).padStart(2, '0')}T00:00:00Z`);
    queries.posts.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, index) => ({ id: index + 1, title: `post${index}`, updatedAt: day(index + 1) })),
    );
    queries.replies.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        postId: 9,
        content: `reply${index}`,
        createdAt: day(index + 6),
      })),
    );
    expect((await UserDao.getRecentActivity(7)).map((item) => item.type)).toEqual(Array(5).fill('reply'));
  });
  it('keeps a 40-codepoint reply preview without splitting emoji or URI-decoding literal text', async () => {
    const content = '🧱'.repeat(39) + '界' + 'extra %E4%B8%AD';
    queries.replies.mockResolvedValueOnce([{ id: 1, postId: 2, content, createdAt: new Date() }]);
    expect((await UserDao.getRecentActivity(7))[0].text).toBe('🧱'.repeat(39) + '界');
    queries.replies.mockResolvedValueOnce([{ id: 1, postId: 2, content: '中文100% %E4%B8%AD', createdAt: new Date() }]);
    expect((await UserDao.getRecentActivity(7))[0].text).toBe('中文100% %E4%B8%AD');
  });
});
